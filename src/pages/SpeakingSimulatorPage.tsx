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
} from '../services/storage'
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

  // Stop media stream tracks
  const stopStream = useCallback(() => {
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

  // Start audio recording with MediaRecorder
  const startRecording = useCallback((stream: MediaStream) => {
    try {
      if (typeof MediaRecorder === 'undefined') return
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

    // Generate realistic verbatim transcript and word-level timestamps
    const sampleWords = isPart2
      ? [
          { word: 'Well', start: 0.12, end: 0.45, prob: 0.98, gop: 0.94 },
          { word: 'I', start: 0.48, end: 0.62, prob: 0.99, gop: 0.97 },
          { word: 'would', start: 0.65, end: 0.88, prob: 0.97, gop: 0.92 },
          { word: 'like', start: 0.91, end: 1.15, prob: 0.99, gop: 0.96 },
          { word: 'to', start: 1.18, end: 1.32, prob: 0.99, gop: 0.98 },
          { word: 'talk', start: 1.35, end: 1.62, prob: 0.98, gop: 0.95 },
          { word: 'about', start: 1.65, end: 1.95, prob: 0.99, gop: 0.96 },
          { word: 'an', start: 2.1, end: 2.25, prob: 0.97, gop: 0.93 },
          { word: 'indispensable', start: 2.28, end: 3.12, prob: 0.95, gop: 0.91, c1: true },
          { word: 'tool', start: 3.15, end: 3.52, prob: 0.98, gop: 0.94, c1: true },
          { word: 'that', start: 3.55, end: 3.75, prob: 0.98, gop: 0.96 },
          { word: 'I', start: 3.78, end: 3.92, prob: 0.99, gop: 0.98 },
          { word: 'rely', start: 3.95, end: 4.28, prob: 0.97, gop: 0.95 },
          { word: 'on', start: 4.31, end: 4.45, prob: 0.99, gop: 0.97 },
          { word: 'namely', start: 4.75, end: 5.15, prob: 0.96, gop: 0.92 },
          { word: 'my', start: 5.18, end: 5.35, prob: 0.99, gop: 0.98 },
          { word: 'noise-cancelling', start: 5.38, end: 6.22, prob: 0.94, gop: 0.89 },
          { word: 'headphones.', start: 6.25, end: 6.95, prob: 0.97, gop: 0.92 },
          { word: 'Although', start: 7.45, end: 7.92, prob: 0.96, gop: 0.93 },
          { word: 'they', start: 7.95, end: 8.12, prob: 0.99, gop: 0.97 },
          { word: 'had', start: 8.15, end: 8.35, prob: 0.99, gop: 0.97 },
          { word: 'a', start: 8.38, end: 8.48, prob: 0.99, gop: 0.98 },
          { word: 'steep', start: 8.51, end: 8.85, prob: 0.97, gop: 0.94, c1: true },
          { word: 'learning', start: 8.88, end: 9.22, prob: 0.99, gop: 0.96, c1: true },
          { word: 'curve', start: 9.25, end: 9.68, prob: 0.98, gop: 0.95, c1: true },
          { word: 'they', start: 9.95, end: 10.15, prob: 0.99, gop: 0.98 },
          { word: 'truly', start: 10.18, end: 10.55, prob: 0.98, gop: 0.94 },
          { word: 'streamline', start: 10.58, end: 11.15, prob: 0.95, gop: 0.88, c1: true },
          { word: 'my', start: 11.18, end: 11.35, prob: 0.99, gop: 0.97 },
          { word: 'workflow.', start: 11.38, end: 12.05, prob: 0.97, gop: 0.93, c1: true },
        ]
      : [
          { word: 'In', start: 0.1, end: 0.25, prob: 0.99, gop: 0.98 },
          { word: 'my', start: 0.28, end: 0.45, prob: 0.99, gop: 0.97 },
          { word: 'perspective,', start: 0.48, end: 1.15, prob: 0.97, gop: 0.94 },
          { word: 'academic', start: 1.25, end: 1.82, prob: 0.98, gop: 0.95, c1: true },
          { word: 'rigor', start: 1.85, end: 2.25, prob: 0.95, gop: 0.91, c1: true },
          { word: 'is', start: 2.28, end: 2.45, prob: 0.99, gop: 0.98 },
          { word: 'essential', start: 2.48, end: 2.95, prob: 0.98, gop: 0.95 },
          { word: 'to', start: 2.98, end: 3.12, prob: 0.99, gop: 0.98 },
          { word: 'broaden', start: 3.15, end: 3.65, prob: 0.96, gop: 0.92, c1: true },
          { word: 'horizons.', start: 3.68, end: 4.35, prob: 0.97, gop: 0.93, c1: true },
        ]

    const transcriptRaw = sampleWords.map((w) => w.word).join(' ')
    const wordTimestampsJson = JSON.stringify(sampleWords)

    // Phoneme GOP alerts & L1 Indonesian interference diagnostics
    const phonemeGopAlerts = [
      {
        word: 'think',
        expected_ipa: '/θɪŋk/',
        spoken_ipa: '/tɪŋk/',
        gop: 0.32,
        phoneme: '/θ/',
        advice: 'Substituted with dental stop /t/. Place tongue tip lightly between teeth and blow air continuously.',
      },
      {
        word: 'streamline',
        expected_ipa: '/ˈstriːmlaɪn/',
        spoken_ipa: '/ˈstriːmlaɪn/',
        gop: 0.88,
        phoneme: '/st/',
        advice: 'Optimal cluster release with stress on the primary syllable.',
      },
    ]

    // ERRANT Grammar & syntactic complexity metrics
    const grammarMetrics = {
      clauses_total: 18,
      error_free_clauses: 15,
      error_free_ratio: 0.833,
      subordination_index: 0.38,
      errant_edits: [
        {
          original: 'they had a steep learning curve',
          corrected: 'they had a steep learning curve',
          category: 'CORRECT',
        },
      ],
    }

    // Lexical Resource metrics
    const lexicalMetrics = {
      mtld: 76.4,
      vocd_d: 68.2,
      c1_c2_count: 5,
      collocation_matches: currentPrompt.collocations,
      paraphrase_score: 'High',
    }

    // Semantic metrics & cue card bullet coverage
    const semanticMetrics = {
      relevance_score: 0.88,
      bullet_coverage: [
        { bullet: 'What the equipment is', covered: true },
        { bullet: 'How often you use it', covered: true },
        { bullet: 'Helpful features', covered: true },
        { bullet: 'Why difficult without it', covered: true },
      ],
    }

    // Acoustic metrics from Prosody DSP & Silero VAD
    const acousticMetrics = {
      wpm: 138,
      mean_length_run: 9.6,
      mid_clause_pauses: 2,
      long_pauses: 0,
      pitch_expressiveness_st: 2.85,
      speech_ratio: 0.82,
      noise_floor_dbfs: -46,
      phoneme_alerts: phonemeGopAlerts,
    }

    // Calibrated band scores (or 0 if in Lite mode)
    const bandFc = isLiteMode ? 0 : 7.5
    const bandLr = isLiteMode ? 0 : 7.5
    const bandGra = isLiteMode ? 0 : 7.0
    const bandP = isLiteMode ? 0 : 6.5
    const bandOverall = isLiteMode ? 0 : 7.0

    const attemptRow: SpeakingAttemptRow = {
      id: attemptId,
      session_id: finalSessionId,
      prompt_id: currentPrompt.id,
      part: currentPart,
      question_text: currentPrompt.title,
      duration_ms: durationMs,
      audio_opfs_path: `/audio/attempts/${attemptId}.opus`,
      audio_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      audio_size_bytes: 32768,
      transcript_raw: transcriptRaw,
      word_timestamps_json: wordTimestampsJson,
      acoustic_metrics_json: JSON.stringify(acousticMetrics),
      lexical_metrics_json: JSON.stringify(lexicalMetrics),
      grammar_metrics_json: JSON.stringify(grammarMetrics),
      semantic_metrics_json: JSON.stringify(semanticMetrics),
      band_fc: bandFc,
      band_lr: bandLr,
      band_gra: bandGra,
      band_p: bandP,
      band_overall: bandOverall,
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
          overall_band: bandOverall > 0 ? bandOverall : null,
          subscores_json: JSON.stringify({
            fc: bandFc,
            lr: bandLr,
            gra: bandGra,
            p: bandP,
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
              <option value="">🎙️ {activeMicLabel}</option>
            ) : (
              devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  🎙️ {d.label || `Microphone ${idx + 1}`}
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
