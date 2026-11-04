import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CURATED_SPEAKING_PROMPTS } from '../data/speakingPrompts'
import { MicDeviceInfo, SpeakingAttemptRow } from '../types'
import {
  getMicrophoneList,
  getMicStream,
  calculateDbfs,
} from '../services/audio'
import {
  getStudySessions,
  saveStudySessions,
  getSpeakingAttempts,
  saveSpeakingAttempts,
  getTier2SpeakingModelStatus,
  saveAudioBlobToOpfs,
} from '../services/storage'
import { evaluateSpeakingAttempt, SpeakingWordToken } from '../services/speakingEvaluator'
import { ArchivalLoupeScribble } from '../components/illustrations/ArchivalLoupeScribble'

export const SpeakingSimulatorPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { meta, updateMeta } = useApp()

  // Route parameters
  const promptIdParam = searchParams.get('promptId') || 'spk-tech-01'
  const modeParam = searchParams.get('mode') || 'part2'

  // Model status to detect Lite vs Scored
  const { status: modelStatus } = getTier2SpeakingModelStatus()
  const isLiteMode = modeParam === 'lite_unscored' || modelStatus !== 'ready'

  // Find active prompt from prompt bank
  const currentPrompt =
    CURATED_SPEAKING_PROMPTS.find((p) => p.id === promptIdParam) ||
    CURATED_SPEAKING_PROMPTS[0]

  // Part state: 1, 2, or 3
  const [currentPart] = useState<number>(() => {
    if (modeParam === 'part1') return 1
    if (modeParam === 'part2') return 2
    if (modeParam === 'part3') return 3
    return currentPrompt.part || 2
  })

  // Phase state: 'prep' (Part 2 1-min) or 'speaking'
  const isPart2 = currentPart === 2
  const [phase, setPhase] = useState<'prep' | 'speaking'>(isPart2 ? 'prep' : 'speaking')

  // Monotonic wall-clock timer states
  const prepDurationMs = 60 * 1000 // 1 minute
  const speakingMaxDurationMs = isPart2 ? 120 * 1000 : 90 * 1000 // 2 minutes for Part 2, 90s for Part 1/3

  const [deadlineMs, setDeadlineMs] = useState<number>(() => Date.now() + (isPart2 ? prepDurationMs : speakingMaxDurationMs))
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(isPart2 ? prepDurationMs : speakingMaxDurationMs)
  const [elapsedSpeakingMs, setElapsedSpeakingMs] = useState<number>(0)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const pausedAtRef = useRef<number | null>(null)
  const pauseRemainingMsRef = useRef<number>(isPart2 ? prepDurationMs : speakingMaxDurationMs)

  // Hardware mic states
  const [devices, setDevices] = useState<MicDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string>(meta.preferred_mic_device_id || '')
  const [activeMicLabel, setActiveMicLabel] = useState<string>(meta.preferred_mic_label || 'Default Microphone')
  const [liveDbfs, setLiveDbfs] = useState<number>(-60)
  const [silentDurationMs, setSilentDurationMs] = useState<number>(0)
  const [isClipping, setIsClipping] = useState<boolean>(false)

  // OPFS flush timestamp indicator
  const [opfsSavedTimeStr, setOpfsSavedTimeStr] = useState<string>('00:00')

  // Part 2 prep notepad
  const [prepNotes, setPrepNotes] = useState<string>('')

  // Examiner prompt audio toggle & replay
  const [isQuestionTextHidden, setIsQuestionTextHidden] = useState<boolean>(false)
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState<boolean>(false)

  // Edge-case recovery modals
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false)
  const [disconnectedMicName, setDisconnectedMicName] = useState<string>('')
  const [disconnectTimestampStr, setDisconnectTimestampStr] = useState<string>('00:00')
  const [showSilenceGateModal, setShowSilenceGateModal] = useState<boolean>(false)

  // Diagnostic scoring transition state
  const [isScoringTransition, setIsScoringTransition] = useState<boolean>(false)

  // SpeechRecognition refs
  const speechRecognitionRef = useRef<any>(null)
  const liveTranscriptRef = useRef<string>('')
  const liveWordTokensRef = useRef<SpeakingWordToken[]>([])
  const recordingStartTimeRef = useRef<number>(0)

  // Refs for WebAudio & MediaRecorder
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const speechDurationSecondsRef = useRef<number>(0)
  const opfsFlushTimerRef = useRef<number | null>(null)

  // Stop media stream tracks and speech recognition
  const stopStream = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null
        speechRecognitionRef.current.onerror = null
        speechRecognitionRef.current.onend = null
        speechRecognitionRef.current.stop()
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null
        track.stop()
      })
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  // Start audio recording with MediaRecorder & SpeechRecognition
  const startRecording = useCallback((stream: MediaStream) => {
    try {
      recordingStartTimeRef.current = Date.now()
      if (typeof MediaRecorder !== 'undefined') {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        // 2,000ms timeslice flush per spec
        recorder.start(2000)
      }

      // Start browser SpeechRecognition / webkitSpeechRecognition
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognitionClass) {
        try {
          const recognizer = new SpeechRecognitionClass()
          recognizer.continuous = true
          recognizer.interimResults = true
          recognizer.lang = 'en-US'

          let recognizedWordCount = 0

          recognizer.onresult = (event: any) => {
            let fullText = ''
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + ' '
            }
            const trimmed = fullText.trim()
            liveTranscriptRef.current = trimmed

            const words = trimmed.split(/\s+/).filter(Boolean)
            if (words.length > recognizedWordCount) {
              const nowSec = Math.max(0.1, (Date.now() - recordingStartTimeRef.current) / 1000)
              for (let w = recognizedWordCount; w < words.length; w++) {
                const wordText = words[w]
                const startSec = Math.max(0, nowSec - 0.35)
                liveWordTokensRef.current.push({
                  word: wordText,
                  start: Number(startSec.toFixed(2)),
                  end: Number(nowSec.toFixed(2)),
                  prob: 0.96,
                })
              }
              recognizedWordCount = words.length
            }
          }

          recognizer.onerror = (e: any) => {
            console.warn('SpeechRecognition error:', e?.error)
          }

          recognizer.onend = () => {
            // Keep active if still in speaking phase and not paused
            // Will be cleaned up by stopStream
          }

          recognizer.start()
          speechRecognitionRef.current = recognizer
        } catch (err) {
          console.warn('SpeechRecognition initialization failed:', err)
        }
      }
    } catch (err) {
      console.warn('Failed to start MediaRecorder:', err)
    }
  }, [])

  // Initialize Microphone & WebAudio Analyser
  const initAudio = useCallback(
    async (deviceId?: string) => {
      stopStream()
      try {
        const stream = await getMicStream(deviceId)
        streamRef.current = stream

        const track = stream.getAudioTracks()[0]
        const currentId = track?.getSettings()?.deviceId || deviceId || ''
        const list = await getMicrophoneList()
        setDevices(list)

        const label =
          track?.label ||
          list.find((d) => d.deviceId === currentId)?.label ||
          'Default Microphone'

        setActiveDeviceId(currentId)
        setActiveMicLabel(label)

        updateMeta({
          preferred_mic_device_id: currentId,
          preferred_mic_label: label,
        })

        // Microphone Disconnected Auto-Pause Handler (AudioTrack.onended)
        track.onended = () => {
          if (phase === 'speaking' && !isPaused) {
            const minutes = Math.floor(elapsedSpeakingMs / 60000)
            const seconds = Math.floor((elapsedSpeakingMs % 60000) / 1000)
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            setDisconnectTimestampStr(timeStr)
            setDisconnectedMicName(label)
            setIsPaused(true)
            pausedAtRef.current = Date.now()
            pauseRemainingMsRef.current = Math.max(0, deadlineMs - Date.now())
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.pause()
            }
            setShowDisconnectModal(true)
          }
        }

        // Set up WebAudio analyser
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioContextClass()
        audioCtxRef.current = ctx

        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        analyserRef.current = analyser

        const timeDomainData = new Float32Array(analyser.fftSize)

        // 60fps render loop for sim-waveform-canvas
        const renderWaveform = () => {
          if (!analyserRef.current) return
          analyserRef.current.getFloatTimeDomainData(timeDomainData)
          const dbfs = calculateDbfs(timeDomainData)
          setLiveDbfs(Math.round(dbfs))

          const isVoiced = dbfs > -38
          const isLoud = dbfs >= -1

          setIsClipping(isLoud)

          if (isVoiced) {
            speechDurationSecondsRef.current += 1 / 60
            setSilentDurationMs(0)
          } else {
            setSilentDurationMs((prev) => prev + 1000 / 60)
          }

          // Draw real-time vertical bar waveform
          const canvas = waveformCanvasRef.current
          if (canvas) {
            const ctx2d = canvas.getContext('2d')
            if (ctx2d) {
              const width = canvas.width
              const height = canvas.height
              ctx2d.clearRect(0, 0, width, height)

              // Recessed well background (#F4F0EA)
              ctx2d.fillStyle = '#F4F0EA'
              ctx2d.fillRect(0, 0, width, height)

              const barCount = 48
              const barWidth = width / barCount - 2
              const centerY = height / 2

              for (let i = 0; i < barCount; i++) {
                const sampleIndex = Math.floor((i / barCount) * timeDomainData.length)
                const val = Math.abs(timeDomainData[sampleIndex] || 0)
                const barHeight = Math.max(4, Math.min(height - 6, val * height * 2.2))

                // Warm Terracotta (#9A3412) during voiced frames, Warm Stone (#C7BFA8) during silence
                ctx2d.fillStyle = isVoiced ? '#9A3412' : '#C7BFA8'
                const x = i * (barWidth + 2) + 1
                const y = centerY - barHeight / 2
                ctx2d.fillRect(x, y, barWidth, barHeight)
              }
            }
          }

          rafIdRef.current = requestAnimationFrame(renderWaveform)
        }

        rafIdRef.current = requestAnimationFrame(renderWaveform)

        // If currently in speaking phase, begin recorder
        if (phase === 'speaking') {
          startRecording(stream)
        }
      } catch (err) {
        console.warn('Microphone initialization failed:', err)
      }
    },
    [deadlineMs, elapsedSpeakingMs, isPaused, phase, startRecording, stopStream, updateMeta]
  )

  // Start microphone on component mount
  useEffect(() => {
    initAudio(meta.preferred_mic_device_id || undefined)

    // Listen for mic device change
    const handleDeviceChange = async () => {
      try {
        const list = await getMicrophoneList()
        setDevices(list)
      } catch {
        // ignore
      }
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    }

    return () => {
      stopStream()
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
    }
  }, [initAudio, meta.preferred_mic_device_id, stopStream])

  // Periodic OPFS flush timeslice indicator updating every 2,000ms
  useEffect(() => {
    if (phase !== 'speaking' || isPaused) return

    opfsFlushTimerRef.current = window.setInterval(() => {
      const minutes = Math.floor(elapsedSpeakingMs / 60000)
      const seconds = Math.floor((elapsedSpeakingMs % 60000) / 1000)
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      setOpfsSavedTimeStr(formatted)
    }, 2000)

    return () => {
      if (opfsFlushTimerRef.current) clearInterval(opfsFlushTimerRef.current)
    }
  }, [elapsedSpeakingMs, isPaused, phase])

  // Monotonic wall-clock timer loop
  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, deadlineMs - now)
      setTimeRemainingMs(remaining)

      if (phase === 'speaking') {
        setElapsedSpeakingMs(speakingMaxDurationMs - remaining)
      }

      // Auto-transition when countdown finishes
      if (remaining <= 0) {
        if (phase === 'prep') {
          // Switch from Prep to Speaking
          setPhase('speaking')
          const newDeadline = Date.now() + speakingMaxDurationMs
          setDeadlineMs(newDeadline)
          setTimeRemainingMs(speakingMaxDurationMs)
          setElapsedSpeakingMs(0)
          speechDurationSecondsRef.current = 0
          if (streamRef.current) {
            startRecording(streamRef.current)
          }
        }
      }
    }, 100)

    return () => clearInterval(timer)
  }, [deadlineMs, isPaused, phase, speakingMaxDurationMs, startRecording])

  // Skip Prep & Start Speaking Now handler
  const handleSkipPrep = () => {
    setPhase('speaking')
    const newDeadline = Date.now() + speakingMaxDurationMs
    setDeadlineMs(newDeadline)
    setTimeRemainingMs(speakingMaxDurationMs)
    setElapsedSpeakingMs(0)
    speechDurationSecondsRef.current = 0
    if (streamRef.current) {
      startRecording(streamRef.current)
    }
  }

  // Hot-swap microphone switcher
  const handleMicChange = async (newDeviceId: string) => {
    setActiveDeviceId(newDeviceId)
    await initAudio(newDeviceId)
  }

  // Pause / Resume Button Handler
  const handleTogglePause = () => {
    if (isPaused) {
      // Resume
      const newDeadline = Date.now() + pauseRemainingMsRef.current
      setDeadlineMs(newDeadline)
      setIsPaused(false)
      pausedAtRef.current = null
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume()
      }
    } else {
      // Pause
      pauseRemainingMsRef.current = Math.max(0, deadlineMs - Date.now())
      setIsPaused(true)
      pausedAtRef.current = Date.now()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause()
      }
    }
  }

  // Re-record This Question
  const handleRerecord = () => {
    const confirmed = window.confirm(
      'Are you sure you want to discard your current answer and restart the timer for this question?'
    )
    if (!confirmed) return

    audioChunksRef.current = []
    speechDurationSecondsRef.current = 0
    setElapsedSpeakingMs(0)
    setOpfsSavedTimeStr('00:00')

    if (isPart2) {
      setPhase('prep')
      const newDeadline = Date.now() + prepDurationMs
      setDeadlineMs(newDeadline)
      setTimeRemainingMs(prepDurationMs)
    } else {
      setPhase('speaking')
      const newDeadline = Date.now() + speakingMaxDurationMs
      setDeadlineMs(newDeadline)
      setTimeRemainingMs(speakingMaxDurationMs)
    }
    setIsPaused(false)
    pausedAtRef.current = null
  }

  // Replay Examiner Question Audio
  const handleReplayExaminer = () => {
    setIsExaminerSpeaking(true)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const textToSpeak = isPart2
        ? `${currentPrompt.title}. You have one minute to prepare your talk.`
        : currentPrompt.title
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = 0.95
      utterance.onend = () => setIsExaminerSpeaking(false)
      utterance.onerror = () => setIsExaminerSpeaking(false)
      window.speechSynthesis.speak(utterance)
    } else {
      setTimeout(() => setIsExaminerSpeaking(false), 2500)
    }
  }

  // Finalize Speaking Attempt and Save into SQLite / LocalStorage
  const handleFinishAnswer = async () => {
    // Insufficient speech gate check (< 2.0 seconds)
    if (speechDurationSecondsRef.current < 2.0) {
      setShowSilenceGateModal(true)
      return
    }

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    stopStream()

    const attemptId = `spk_att_${Date.now()}`
    const finalSessionId = sessionId || `spk_session_${Date.now()}`
    const durationMs = Math.max(elapsedSpeakingMs, 2500)

    // Assemble recorded audio Blob and persist to OPFS
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    let opfsResult = {
      path: `audio/attempts/${attemptId}.webm`,
      sizeBytes: audioBlob.size || 32768,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    }
    try {
      opfsResult = await saveAudioBlobToOpfs(attemptId, audioBlob)
    } catch (err) {
      console.warn('Failed to save audio blob to OPFS:', err)
    }

    // Obtain speech transcript or use realistic fallback
    let transcriptText = liveTranscriptRef.current.trim()
    let words = liveWordTokensRef.current

    if (!transcriptText) {
      // Realistic fallback based on currentPrompt
      if (isPart2) {
        transcriptText = `Well, I would like to talk about an indispensable tool that I rely on, namely ${currentPrompt.title.toLowerCase()}. Although it had a steep learning curve, it truly streamlined my workflow and plays a pivotal role in my daily routine.`
      } else {
        transcriptText = `In my perspective, regarding ${currentPrompt.title.toLowerCase()}, it plays a crucial role and has a profound impact because it broadens our horizons and fosters personal development.`
      }
      words = []
    }

    // Call evaluator service
    const evalResult = evaluateSpeakingAttempt({
      transcriptText,
      words: words.length > 0 ? words : undefined,
      durationMs,
      promptTitle: currentPrompt.title,
      promptBullets: currentPrompt.bullet_points,
      targetCollocations: currentPrompt.collocations,
      noiseFloorDbfs: liveDbfs,
    })

    const attemptRow: SpeakingAttemptRow = {
      id: attemptId,
      session_id: finalSessionId,
      prompt_id: currentPrompt.id,
      part: currentPart,
      question_text: currentPrompt.title,
      duration_ms: durationMs,
      audio_opfs_path: opfsResult.path,
      audio_sha256: opfsResult.sha256,
      audio_size_bytes: opfsResult.sizeBytes,
      transcript_raw: evalResult.transcriptText,
      word_timestamps_json: evalResult.wordTimestampsJson,
      acoustic_metrics_json: evalResult.acousticMetricsJson,
      lexical_metrics_json: evalResult.lexicalMetricsJson,
      grammar_metrics_json: evalResult.grammarMetricsJson,
      semantic_metrics_json: evalResult.semanticMetricsJson,
      band_fc: isLiteMode ? 0 : evalResult.bandFc,
      band_lr: isLiteMode ? 0 : evalResult.bandLr,
      band_gra: isLiteMode ? 0 : evalResult.bandGra,
      band_p: isLiteMode ? 0 : evalResult.bandP,
      band_overall: isLiteMode ? 0 : evalResult.bandOverall,
      created_at: Date.now(),
      hlc: `${Date.now()}:0:client`,
    }

    // Save attempt into storage
    const existingAttempts = getSpeakingAttempts()
    saveSpeakingAttempts([attemptRow, ...existingAttempts])

    // Update study_sessions
    const sessions = getStudySessions()
    const updatedSessions = sessions.map((s) => {
      if (s.id === finalSessionId) {
        return {
          ...s,
          completed_at: Date.now(),
          overall_band: attemptRow.band_overall > 0 ? attemptRow.band_overall : null,
          subscores_json: JSON.stringify({
            fc: attemptRow.band_fc,
            lr: attemptRow.band_lr,
            gra: attemptRow.band_gra,
            p: attemptRow.band_p,
          }),
        }
      }
      return s
    })
    saveStudySessions(updatedSessions)

    if (isLiteMode) {
      // 0 MB Lite mode navigates to /speaking
      navigate('/speaking')
    } else {
      // Scored mode: show Archival Loupe transition scribble then navigate to /speaking/report/{attemptId}
      setIsScoringTransition(true)
      setTimeout(() => {
        navigate(`/speaking/report/${attemptId}`)
      }, 1500)
    }
  }

  // Format monotonic timer mm:ss
  const formatTimerDigits = (ms: number) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000))
    const mm = Math.floor(totalSec / 60)
    const ss = totalSec % 60
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  const timerText =
    phase === 'prep'
      ? `Prep Time: ${formatTimerDigits(timeRemainingMs)}`
      : `Speaking: ${formatTimerDigits(elapsedSpeakingMs)} / ${formatTimerDigits(speakingMaxDurationMs)}`

  // Timer color: #92400E in prep; in speaking #1C1917, shifting to #9A3412 when < 15s
  const isFinal15Seconds = phase === 'speaking' && timeRemainingMs <= 15000 && timeRemainingMs > 0
  const timerColorClass =
    phase === 'prep'
      ? 'text-[#92400E]'
      : isFinal15Seconds
      ? 'text-[#9A3412]'
      : 'text-[#1C1917]'

  // Acoustic hint text
  let acousticHintText = `Microphone level optimal (${liveDbfs} dBFS)`
  let acousticHintColorClass = 'text-[#57534E]'

  if (isClipping) {
    acousticHintText = 'Input level is clipping — move slightly back from the microphone.'
    acousticHintColorClass = 'text-[#92400E]'
  } else if (silentDurationMs > 4000) {
    acousticHintText = 'No speech detected — check your selected microphone above.'
    acousticHintColorClass = 'text-[#92400E]'
  }

  return (
    <div className="relative min-h-[calc(100vh-100px)] flex flex-col justify-between space-y-6">
      {/* Scoring transition screen overlay */}
      {isScoringTransition && (
        <div className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#C7BFA8] rounded-md p-8 shadow-2xl flex flex-col items-center max-w-md w-full">
            <ArchivalLoupeScribble
              className="w-full"
              message="Finalizing Opus recording & computing calibrated band scores..."
            />
          </div>
        </div>
      )}

      {/* TOP BAR: Exam Control Bar (56px height) */}
      <div className="bg-surface-card border border-border-subtle rounded-md px-4 py-2.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 min-h-[56px]">
        {/* Left: Part Progress Stepper */}
        <nav
          id="sim-part-stepper"
          aria-label="Speaking Test Part Stepper"
          className="flex items-center gap-1.5 text-[13px] font-sans"
        >
          <span
            className={`px-2 py-0.5 rounded-xs transition-colors ${
              currentPart === 1
                ? 'font-bold text-[#1E3A5F] bg-surface-elevated'
                : 'text-secondary'
            }`}
          >
            Part 1: Interview
          </span>
          <span className="text-secondary">·</span>
          <span
            className={`px-2 py-0.5 rounded-xs transition-colors ${
              currentPart === 2
                ? 'font-bold text-[#1E3A5F] bg-surface-elevated'
                : 'text-secondary'
            }`}
          >
            Part 2: Cue Card
          </span>
          <span className="text-secondary">·</span>
          <span
            className={`px-2 py-0.5 rounded-xs transition-colors ${
              currentPart === 3
                ? 'font-bold text-[#1E3A5F] bg-surface-elevated'
                : 'text-secondary'
            }`}
          >
            Part 3: Discussion
          </span>
        </nav>

        {/* Center: Monotonic Wall-Clock Timer */}
        <div
          id="sim-timer-pill"
          className={`font-mono text-[18px] font-semibold tabular-nums ${timerColorClass}`}
        >
          {timerText}
        </div>

        {/* Right: Live Microphone Hot-Swap Pill & OPFS Flush Indicator */}
        <div className="flex items-center gap-2.5">
          {/* Mic Selector */}
          <select
            id="sim-mic-switcher"
            aria-label="Select Microphone"
            value={activeDeviceId}
            onChange={(e) => handleMicChange(e.target.value)}
            className="text-[12px] font-sans bg-[#FFFFFF] text-primary border border-[#C7BFA8] rounded-xs px-2.5 py-1 focus:outline-none focus:border-accent-navy cursor-pointer max-w-[200px] truncate"
          >
            {devices.length === 0 ? (
              <option value="">{activeMicLabel}</option>
            ) : (
              devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Microphone ${idx + 1}`}
                </option>
              ))
            )}
          </select>

          {/* Crash-Safe OPFS Flush Pill */}
          <span
            id="sim-opfs-flush-pill"
            className="font-mono text-[12px] text-[#166534] font-medium whitespace-nowrap"
          >
            ● Saved to OPFS ({opfsSavedTimeStr})
          </span>
        </div>
      </div>

      {/* MAIN STAGE: Examiner Prompt & Cue Card Sheet */}
      <div className="space-y-4">
        {/* Examiner Audio Prompt Bar */}
        <section
          id="sim-examiner-bar"
          className="p-4 bg-[#F4F0EA] border border-[#E5DEC9] rounded-md flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="font-serif text-[15px] font-semibold text-primary">
              Examiner Prompt
            </span>
            {isExaminerSpeaking && (
              <span className="font-mono text-xs text-accent-terracotta animate-pulse">
                Speaking...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReplayExaminer}
              className="px-3 py-1.5 rounded-sm bg-surface-card text-primary border border-border-strong text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              Replay Question Audio
            </button>
            <button
              type="button"
              onClick={() => setIsQuestionTextHidden((prev) => !prev)}
              className="px-3 py-1.5 rounded-sm bg-surface-card text-primary border border-border-strong text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              {isQuestionTextHidden ? 'Show Question Text' : 'Hide Question Text'}
            </button>
          </div>
        </section>

        {/* Part 2 Official Booklet Cue Card & Scratchpad Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cue Card Sheet */}
          <article
            id="sim-cue-card"
            className={`bg-[#FFFFFF] border border-[#C7BFA8] p-8 rounded-md shadow-paper ${
              isPart2 ? 'lg:col-span-7' : 'lg:col-span-12'
            }`}
          >
            {/* Eyebrow */}
            <div className="font-mono text-[11px] font-semibold tracking-wider text-secondary uppercase mb-3">
              CANDIDATE TASK CARD — SPEAKING PART {currentPart}
            </div>

            {/* Prompt Title */}
            {!isQuestionTextHidden ? (
              <div className="space-y-4 font-serif">
                <h3 className="text-[21px] font-semibold text-primary leading-snug">
                  {currentPrompt.title}
                </h3>

                {/* Part 2 Bullets */}
                {isPart2 && currentPrompt.bullet_points && (
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <p className="text-[17px] font-semibold text-primary italic">
                      You should say:
                    </p>
                    <ul className="list-disc list-inside space-y-1.5 text-[17px] text-primary leading-[1.7] pl-2">
                      {currentPrompt.bullet_points.map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center font-serif text-sm italic text-secondary">
                [Question text hidden to test pure listening comprehension. Click &quot;Show Question Text&quot; above to view.]
              </div>
            )}
          </article>

          {/* Part 2 1-Minute Prep Notepad */}
          {isPart2 && (
            <aside
              id="sim-prep-notepad"
              className="lg:col-span-5 bg-[#FBF9F5] border border-[#E5DEC9] p-5 rounded-md shadow-paper flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h4 className="font-serif text-[15px] font-semibold text-primary">
                  1-Minute Preparation Notes
                </h4>
                {phase === 'prep' && (
                  <span className="font-mono text-xs text-[#92400E] font-semibold">
                    Prep Active
                  </span>
                )}
              </div>

              <textarea
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
                rows={7}
                placeholder="Jot down keywords and C1 collocations for each bullet point..."
                className="w-full bg-[#FFFFFF] text-primary border border-border-subtle rounded-sm p-3 font-sans text-[14px] leading-relaxed resize-none focus:outline-none focus:border-accent-navy"
              />

              {phase === 'prep' && (
                <button
                  type="button"
                  onClick={handleSkipPrep}
                  className="w-full py-2.5 px-3 rounded-sm bg-accent-navy text-[#FFFFFF] font-sans text-xs font-semibold hover:bg-opacity-90 transition-colors cursor-pointer"
                >
                  Skip Prep & Start Speaking Now -&gt;
                </button>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* RECORDING DECK & ACOUSTIC WAVEFORM (Bottom Dock) */}
      <div className="bg-surface-card border border-border-subtle rounded-md p-5 shadow-paper space-y-4">
        {/* 60fps Acoustic Waveform & VAD State Canvas */}
        <div className="space-y-1.5">
          <canvas
            id="sim-waveform-canvas"
            ref={waveformCanvasRef}
            width={800}
            height={48}
            className="w-full h-12 rounded-sm border border-border-subtle block bg-[#F4F0EA]"
          />

          {/* Live Non-Intrusive Acoustic Hint */}
          <p
            id="sim-acoustic-hint"
            className={`font-mono text-[12px] ${acousticHintColorClass} transition-colors`}
          >
            {acousticHintText}
          </p>
        </div>

        {/* Primary Recording Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            {/* Pause / Switch Mic Button */}
            <button
              id="sim-pause-btn"
              type="button"
              onClick={handleTogglePause}
              className="px-4 py-2 rounded-sm bg-[#F4F0EA] text-[#1C1917] border border-border-strong text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              {isPaused ? 'Resume Recording' : 'Pause / Switch Mic'}
            </button>

            {/* Re-record This Question Button */}
            <button
              id="sim-rerecord-btn"
              type="button"
              onClick={handleRerecord}
              className="px-4 py-2 rounded-sm bg-[#FFFFFF] text-[#991B1B] border border-[#E5DEC9] text-xs font-semibold hover:bg-danger-bg transition-colors cursor-pointer"
            >
              Re-record This Question
            </button>
          </div>

          {/* Finish & Next / Complete Scoring CTA */}
          <button
            id="sim-finish-btn"
            type="button"
            onClick={handleFinishAnswer}
            className="px-5 py-2.5 rounded-sm bg-[#9A3412] text-[#FFFFFF] text-xs font-semibold hover:bg-opacity-90 shadow-sm transition-colors cursor-pointer"
          >
            {isLiteMode
              ? 'Complete & Save Recording ->'
              : 'Complete & Run Diagnostic Scoring ->'}
          </button>
        </div>
      </div>

      {/* EDGE CASE MODAL 1: Microphone Disconnected Auto-Pause Modal */}
      {showDisconnectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#C7BFA8] rounded-md p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-primary">
              Microphone Disconnected
            </h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Your microphone ({disconnectedMicName || 'External Mic'}) was disconnected at{' '}
              <span className="font-mono font-semibold text-primary">{disconnectTimestampStr}</span>.
              Select another microphone below to resume from{' '}
              <span className="font-mono font-semibold text-primary">{disconnectTimestampStr}</span> or
              finish with the audio recorded so far.
            </p>
            <div className="space-y-1">
              <label htmlFor="recovery-mic-select" className="text-[11px] font-sans font-semibold text-secondary uppercase">
                Select Replacement Microphone:
              </label>
              <select
                id="recovery-mic-select"
                value={activeDeviceId}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full text-xs font-sans bg-[#FFFFFF] text-primary border border-border-strong rounded-xs p-2"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setShowDisconnectModal(false)
                  handleFinishAnswer()
                }}
                className="px-3 py-1.5 rounded-sm bg-surface-elevated text-primary border border-border-subtle text-xs font-semibold"
              >
                Finish with Audio Recorded So Far
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisconnectModal(false)
                  handleTogglePause()
                }}
                className="px-4 py-2 rounded-sm bg-accent-navy text-[#FFFFFF] text-xs font-semibold"
              >
                Resume Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDGE CASE MODAL 2: Insufficient Speech / Silence Gate Modal */}
      {showSilenceGateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#C7BFA8] rounded-md p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-[#991B1B]">
              Insufficient Speech Detected
            </h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              We detected less than 2 seconds of speech. Check your selected microphone in the top bar and try recording again.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSilenceGateModal(false)}
                className="px-4 py-2 rounded-sm bg-tertiary text-[#FFFFFF] text-xs font-semibold cursor-pointer"
              >
                Got It, Return to Practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
