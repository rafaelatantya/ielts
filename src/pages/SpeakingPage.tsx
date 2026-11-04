import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { MicDeviceInfo, StudySessionRow, SpeakingAttemptRow } from '../types'
import {
  getMicrophoneList,
  requestMicrophonePermission,
  getMicStream,
  calculateDbfs,
} from '../services/audio'
import {
  getStudySessions,
  saveStudySessions,
  getSpeakingAttempts,
  getTier2SpeakingModelStatus,
  setTier2SpeakingModelStatus,
  ModelPackStatus,
} from '../services/storage'
import { CondenserMicScribble } from '../components/illustrations/CondenserMicScribble'
import { CURATED_SPEAKING_PROMPTS, SpeakingPrompt } from '../data/speakingPrompts'

type ModeTab = 'full' | 'part1' | 'part2' | 'part3'
type TopicFilter =
  | 'All Topics'
  | 'Technology'
  | 'Environment'
  | 'Education'
  | 'Work & Economy'
  | 'Culture & Society'
  | 'Unpracticed Only'

const TOPIC_FILTERS: TopicFilter[] = [
  'All Topics',
  'Technology',
  'Environment',
  'Education',
  'Work & Economy',
  'Culture & Society',
  'Unpracticed Only',
]

function formatDate(ts: number): string {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export const SpeakingPage: React.FC = () => {
  const navigate = useNavigate()
  const { meta, updateMeta } = useApp()

  // Hardware mic states
  const [devices, setDevices] = useState<MicDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string>(
    meta.preferred_mic_device_id || ''
  )
  const [hasPermission, setHasPermission] = useState<boolean>(false)
  const [liveDbfs, setLiveDbfs] = useState<number>(-60)
  const [noiseFloor, setNoiseFloor] = useState<number>(-48)
  const [isRecordingLoopback, setIsRecordingLoopback] = useState<boolean>(false)
  const [isPlayingLoopback, setIsPlayingLoopback] = useState<boolean>(false)
  const [loopbackCountdown, setLoopbackCountdown] = useState<number>(3)
  const [deviceToast, setDeviceToast] = useState<string | null>(null)

  // AI model pack status
  const [modelStatus, setModelStatus] = useState<ModelPackStatus>('idle')
  const [modelProgressPct, setModelProgressPct] = useState<number>(0)
  const [verifiedMb, setVerifiedMb] = useState<number>(0)
  const [sessionPrefersLite, setSessionPrefersLite] = useState<boolean>(false)

  // Mode and topic selection
  const [activeMode, setActiveMode] = useState<ModeTab>('full')
  const [selectedTopic, setSelectedTopic] = useState<TopicFilter>('All Topics')

  // History & storage
  const [speakingAttempts, setSpeakingAttempts] = useState<SpeakingAttemptRow[]>([])
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)

  // Audio stream and analysis refs
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const noiseFloorHistoryRef = useRef<number[]>([])
  const downloadTimerRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  // Load database state & model status on mount
  useEffect(() => {
    setSpeakingAttempts(getSpeakingAttempts())

    const pack = getTier2SpeakingModelStatus()
    setModelStatus(pack.status)
    setModelProgressPct(pack.progressPct)
    setVerifiedMb(pack.verifiedMb)
  }, [])

  const stopActiveStream = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  const startMeter = useCallback((stream: MediaStream) => {
    try {
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

      const updateMeter = () => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(timeDomainData)
        const dbfs = calculateDbfs(timeDomainData)
        setLiveDbfs(Math.round(dbfs))

        // Noise floor tracking: track quiet ambient level
        if (dbfs < -25) {
          noiseFloorHistoryRef.current.push(dbfs)
          if (noiseFloorHistoryRef.current.length > 50) {
            noiseFloorHistoryRef.current.shift()
          }
          const sorted = [...noiseFloorHistoryRef.current].sort((a, b) => a - b)
          const median = sorted[Math.floor(sorted.length / 2)]
          setNoiseFloor(Math.round(median))
        }

        // Draw real-time 60fps VU meter canvas
        const canvas = canvasRef.current
        if (canvas) {
          const ctx2d = canvas.getContext('2d')
          if (ctx2d) {
            const width = canvas.width
            const height = canvas.height
            ctx2d.clearRect(0, 0, width, height)

            // Recessed background well
            ctx2d.fillStyle = '#E5DEC9'
            ctx2d.fillRect(0, 0, width, height)

            // Normalized range: -60 dBFS to 0 dBFS
            const normalized = Math.max(0, Math.min(1, (dbfs + 60) / 60))
            const fillWidth = normalized * width

            // Color-coded zones from Screen 03 spec:
            // #166534 (Optimal Speech -24 to -6 dBFS)
            // #92400E (Low/Quiet < -24 or moderately high)
            // #991B1B (Clipping > -1 dBFS)
            if (dbfs >= -1) {
              ctx2d.fillStyle = '#991B1B'
            } else if (dbfs >= -6) {
              ctx2d.fillStyle = '#166534'
            } else if (dbfs >= -24) {
              ctx2d.fillStyle = '#166534'
            } else {
              ctx2d.fillStyle = '#92400E'
            }

            ctx2d.fillRect(0, 0, fillWidth, height)

            // Hairline indicator mark
            ctx2d.fillStyle = '#1C1917'
            ctx2d.fillRect(Math.max(0, fillWidth - 2), 0, 2, height)
          }
        }

        rafIdRef.current = requestAnimationFrame(updateMeter)
      }

      rafIdRef.current = requestAnimationFrame(updateMeter)
    } catch (e) {
      console.warn('AudioContext meter failed:', e)
    }
  }, [])

  const initMic = useCallback(
    async (deviceId?: string) => {
      stopActiveStream()
      try {
        const stream = await getMicStream(deviceId)
        streamRef.current = stream
        setHasPermission(true)

        const list = await getMicrophoneList()
        setDevices(list)

        const currentTrack = stream.getAudioTracks()[0]
        const currentId = currentTrack?.getSettings()?.deviceId || deviceId || ''
        const currentLabel =
          currentTrack?.label ||
          list.find((d) => d.deviceId === currentId)?.label ||
          'Default Microphone'

        setActiveDeviceId(currentId)

        try {
          localStorage.setItem('preferred_mic_device_id', currentId)
        } catch {
          // ignore storage error
        }

        updateMeta({
          preferred_mic_device_id: currentId,
          preferred_mic_label: currentLabel,
        })

        startMeter(stream)
      } catch (err) {
        console.warn('Microphone initialization failed:', err)
      }
    },
    [startMeter, stopActiveStream, updateMeta]
  )

  // Listen for USB / Bluetooth mic hot-plugging via navigator.mediaDevices.ondevicechange
  useEffect(() => {
    const handleDeviceChange = async () => {
      try {
        const list = await getMicrophoneList()
        setDevices(list)

        const newlyConnected = list.find((d) => d.deviceId && d.deviceId !== activeDeviceId)
        if (newlyConnected?.label) {
          setDeviceToast(`New microphone detected: ${newlyConnected.label}`)
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
          toastTimeoutRef.current = window.setTimeout(() => setDeviceToast(null), 4000)
        }

        // If currently selected mic was unplugged, auto-switch to first available
        if (activeDeviceId && !list.some((d) => d.deviceId === activeDeviceId)) {
          if (list.length > 0) {
            initMic(list[0].deviceId)
          }
        }
      } catch (err) {
        console.warn('Error on device change:', err)
      }
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    }

    return () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [activeDeviceId, initMic])

  // Clean up audio tracks on unmount
  useEffect(() => {
    return () => {
      stopActiveStream()
      if (downloadTimerRef.current) {
        clearInterval(downloadTimerRef.current)
      }
    }
  }, [stopActiveStream])

  // Button handler: Prompt Browser & Select Microphone
  const handlePromptAndSelect = async () => {
    try {
      const stream = await requestMicrophonePermission()
      stream.getTracks().forEach((t) => t.stop())
      await initMic(activeDeviceId || undefined)
    } catch (err) {
      console.error('Microphone permission denied:', err)
      alert(
        'Microphone access is required to verify hardware. Please allow microphone permissions in your browser.'
      )
    }
  }

  // Refresh / rescan mics button
  const handleRescanMics = async () => {
    try {
      const list = await getMicrophoneList()
      setDevices(list)
      if (activeDeviceId) {
        await initMic(activeDeviceId)
      } else if (list.length > 0) {
        await initMic(list[0].deviceId)
      }
    } catch (err) {
      console.warn('Rescan error:', err)
    }
  }

  const handleDeviceSelectChange = async (newDeviceId: string) => {
    setActiveDeviceId(newDeviceId)
    await initMic(newDeviceId)
  }

  // 3-Second Loopback Recording & Playback Test
  const handleTestLoopback = async () => {
    if (!streamRef.current || isRecordingLoopback || isPlayingLoopback) return

    try {
      setIsRecordingLoopback(true)
      setLoopbackCountdown(3)

      const mediaRecorder = new MediaRecorder(streamRef.current)
      const recordedChunks: Blob[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        setIsRecordingLoopback(false)
        setIsPlayingLoopback(true)

        const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        audio.onended = () => {
          setIsPlayingLoopback(false)
          URL.revokeObjectURL(audioUrl)
        }
        audio.onerror = () => {
          setIsPlayingLoopback(false)
          URL.revokeObjectURL(audioUrl)
        }

        audio.play().catch((err) => {
          console.warn('Playback error:', err)
          setIsPlayingLoopback(false)
        })
      }

      mediaRecorder.start()

      const interval = setInterval(() => {
        setLoopbackCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      }, 3000)
    } catch (err) {
      console.warn('Loopback test failed:', err)
      setIsRecordingLoopback(false)
      setIsPlayingLoopback(false)
    }
  }

  // AI Model Download Simulation with pause/resume support
  const handleDownloadModel = () => {
    if (modelStatus === 'downloading') {
      // Pause
      if (downloadTimerRef.current) clearInterval(downloadTimerRef.current)
      setModelStatus('paused')
      setTier2SpeakingModelStatus('paused', modelProgressPct)
      return
    }

    // Start or Resume
    setModelStatus('downloading')
    setTier2SpeakingModelStatus('downloading', modelProgressPct)

    let currentPct = modelProgressPct
    downloadTimerRef.current = window.setInterval(() => {
      currentPct += 5
      if (currentPct >= 100) {
        currentPct = 100
        if (downloadTimerRef.current) clearInterval(downloadTimerRef.current)
        setModelStatus('ready')
        setModelProgressPct(100)
        setVerifiedMb(76.2)
        setTier2SpeakingModelStatus('ready', 100)
      } else {
        setModelProgressPct(currentPct)
        const mb = Number(((currentPct / 100) * 76.2).toFixed(1))
        setVerifiedMb(mb)
        setTier2SpeakingModelStatus('downloading', currentPct)
      }
    }, 350)
  }

  const isSaveDataActive =
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    Boolean((navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData)

  // Start Speaking Session CTA handler
  const handleStartSession = (prompt: SpeakingPrompt) => {
    const sessionId = `spk_${Date.now()}`
    const modeString = sessionPrefersLite ? 'lite_unscored' : activeMode

    const newSession: StudySessionRow = {
      id: sessionId,
      module: 'speaking',
      mode: modeString,
      started_at: Date.now(),
      prompt_title: prompt.title,
      hlc: `${Date.now()}:0:client`,
    }

    const currentSessions = getStudySessions()
    saveStudySessions([newSession, ...currentSessions])

    navigate(`/speaking/session/${sessionId}?promptId=${prompt.id}&mode=${activeMode}`)
  }

  // Audio preview playback for saved attempts
  const handleToggleAudioPreview = (attemptId: string) => {
    if (playingAudioId === attemptId) {
      setPlayingAudioId(null)
      return
    }
    setPlayingAudioId(attemptId)
    // Simulated 3-second playback preview
    setTimeout(() => {
      setPlayingAudioId((curr) => (curr === attemptId ? null : curr))
    }, 3000)
  }

  // Filter prompts based on active mode tab and topic pill
  const filteredPrompts = CURATED_SPEAKING_PROMPTS.filter((p) => {
    // Mode tab filtering
    if (activeMode === 'part1' && p.part !== 1) return false
    if (activeMode === 'part2' && p.part !== 2) return false
    if (activeMode === 'part3' && p.part !== 3) return false

    // Topic pill filtering
    if (selectedTopic === 'All Topics') return true
    if (selectedTopic === 'Unpracticed Only') {
      const isAttempted = speakingAttempts.some((a) => a.prompt_id === p.id)
      return !isAttempted
    }
    return p.category === selectedTopic
  })

  // Noise floor badge calculation
  const isQuietRoom = noiseFloor <= -40
  const noiseBadgeText = isQuietRoom
    ? `Quiet Room (${noiseFloor} dBFS)`
    : `Noisy Environment (${noiseFloor} dBFS)`

  return (
    <div className="space-y-6">
      {/* Toast Notification for Hot-Plugging Mics */}
      {deviceToast && (
        <div
          role="status"
          className="p-3 bg-surface-elevated text-primary border border-accent-navy rounded-sm shadow-md font-sans text-xs flex items-center justify-between animate-fade-slide"
        >
          <span>{deviceToast}</span>
          <button
            type="button"
            onClick={() => setDeviceToast(null)}
            className="text-secondary hover:text-primary font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-border-subtle pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-primary tracking-tight">
            Speaking Lab
          </h1>
          <p className="font-sans text-xs text-secondary mt-1">
            Studio microphone calibration, offline model management, and curated IELTS prompt bank.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/features"
            className="px-3 py-1.5 rounded-sm bg-surface-elevated text-primary border border-border-subtle text-xs font-semibold hover:border-border-strong transition-colors"
          >
            {'Model Storage ->'}
          </Link>
        </div>
      </div>

      {/* SECTION 1: Top Studio Microphone Selector & Loopback Tester Card (MicStudioBar) */}
      <div className="bg-surface-card p-5 rounded-md border border-border-subtle shadow-paper space-y-4">
        {/* Title & Condenser Mic Scribble Icon Row */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <CondenserMicScribble liveDbfs={liveDbfs} />
            <div>
              <h3 id="mic-bar-title" className="font-serif text-[17px] font-semibold text-primary">
                Studio Microphone & Input Check
              </h3>
              <p className="font-sans text-xs text-secondary">
                Verify input hardware, dBFS level, and 3-second loopback before launching live practice.
              </p>
            </div>
          </div>
          <button
            id="mic-refresh-btn"
            type="button"
            onClick={handleRescanMics}
            className="px-2.5 py-1.5 rounded-xs bg-surface-elevated text-primary border border-border-subtle text-[12px] font-semibold hover:border-border-strong transition-colors cursor-pointer shrink-0"
          >
            Rescan Mics
          </button>
        </div>

        {/* Hardware Dropdown & Permission Prompt */}
        <div className="space-y-3">
          {!hasPermission ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-surface-elevated rounded-sm border border-border-subtle">
              <div className="font-sans text-xs text-secondary">
                Browser microphone access is required to detect external USB or Bluetooth mics and calibrate dBFS.
              </div>
              <button
                id="mic-grant-btn"
                type="button"
                onClick={handlePromptAndSelect}
                className="px-4 py-2 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                Prompt Browser & Select Microphone
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label
                htmlFor="mic-device-select"
                className="font-sans text-xs font-semibold text-secondary uppercase tracking-wider shrink-0"
              >
                Hardware Mic:
              </label>
              <select
                id="mic-device-select"
                value={activeDeviceId}
                onChange={(e) => handleDeviceSelectChange(e.target.value)}
                className="min-w-[280px] flex-1 text-sm font-sans bg-surface-card text-primary border border-border-strong rounded-xs px-3 py-1.5 focus:outline-none focus:border-accent-navy cursor-pointer"
              >
                {devices.length === 0 ? (
                  <option value="">Default System Microphone</option>
                ) : (
                  devices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Real-Time dBFS VU Meter & Noise Badge */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-secondary">Input:</span>
                <span className="text-primary font-semibold tabular-nums">
                  {hasPermission ? `${liveDbfs} dBFS` : '-- dBFS'}
                </span>
              </div>
              <span
                id="mic-noise-badge"
                className={`px-2 py-0.5 rounded-xs font-mono text-[11px] font-medium border ${
                  !hasPermission
                    ? 'bg-surface-elevated text-secondary border-border-subtle'
                    : isQuietRoom
                    ? 'bg-[#EAF3EC] text-[#166534] border-[#166534]'
                    : 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]'
                }`}
              >
                {!hasPermission ? 'Standby (Click Prompt above)' : noiseBadgeText}
              </span>
            </div>

            {/* Canvas 60fps RMS meter */}
            <canvas
              id="mic-vu-canvas"
              ref={canvasRef}
              width={600}
              height={10}
              className="w-full h-2.5 rounded-xs border border-border-subtle block bg-[#E5DEC9]"
            />
          </div>

          {/* 3-Second Loopback Mic Tester */}
          <div className="pt-1">
            <button
              id="mic-loopback-btn"
              type="button"
              disabled={!hasPermission || isRecordingLoopback || isPlayingLoopback}
              onClick={handleTestLoopback}
              className={`w-full py-2.5 px-4 rounded-sm text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                !hasPermission
                  ? 'bg-surface-elevated text-secondary border-border-subtle cursor-not-allowed'
                  : isRecordingLoopback
                  ? 'bg-danger-bg text-danger-ink border-danger-ink animate-pulse cursor-pointer'
                  : isPlayingLoopback
                  ? 'bg-success-bg text-success-ink border-success-ink cursor-pointer'
                  : 'bg-surface-elevated text-primary border-border-strong hover:bg-neutral cursor-pointer'
              }`}
            >
              <span>
                {!hasPermission
                  ? 'Test & Hear My Mic (3s)'
                  : isRecordingLoopback
                  ? `Speak Now... (${loopbackCountdown}s)`
                  : isPlayingLoopback
                  ? 'Playing Back Your Voice...'
                  : 'Test & Hear My Mic (3s)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Contextual AI Scoring Pack Banner (Strict Zero Auto-Download) */}
      {modelStatus === 'ready' ? (
        <div
          id="spk-gate-ready-pill"
          className="p-3.5 bg-[#EAF3EC] text-[#166534] border border-[#166534] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-sans text-xs"
        >
          <div className="flex items-center gap-2 font-medium">
            <span>✓</span>
            <span>
              Local Speaking Auto-Scoring Engine Ready Offline (Whisper + Silero VAD + Prosody DSP)
            </span>
          </div>
          <Link
            to="/features"
            className="text-accent-navy hover:underline font-semibold shrink-0"
          >
            {'Manage Packs in /features ->'}
          </Link>
        </div>
      ) : (
        <div
          id="spk-gate-optin-card"
          className="p-5 bg-surface-elevated border border-border-strong rounded-md space-y-4"
        >
          <div className="space-y-1">
            <h3 className="font-serif text-base font-semibold text-primary">
              Choose How You Want to Practice Speaking Today
            </h3>
            <p className="font-sans text-xs text-secondary">
              AI scoring models are never auto-downloaded without your permission.
            </p>
          </div>

          {isSaveDataActive && (
            <div className="p-2.5 bg-warning-bg text-warning-ink border border-amber-300 rounded-xs text-xs font-sans">
              Data Saver / Cellular connection detected. We recommend 0 MB Lite Mode to preserve your data quota.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Card 1: Download speaking AI pack */}
            <div className="p-4 bg-surface-card rounded-sm border border-border-subtle flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-sans text-xs font-semibold text-primary uppercase tracking-wider">
                  Option 1: Enable Local AI Auto-Scoring
                </div>
                <div className="font-serif text-sm font-semibold text-primary">
                  Speaking Core AI Pack (76.2 MB)
                </div>
                <ul className="font-sans text-xs text-secondary space-y-1 list-disc list-inside pt-1">
                  <li>Verbatim Whisper ASR & Word Timestamps</li>
                  <li>Silero VAD Pause & Hesitation Analysis</li>
                  <li>Prosody DSP & 4-Criterion IELTS Band Rubric</li>
                </ul>
              </div>

              {/* Download / Resume Button & Chunk Indicator */}
              <div className="space-y-2 pt-2">
                <button
                  id="spk-optin-download-btn"
                  type="button"
                  onClick={handleDownloadModel}
                  className="w-full py-2.5 px-3 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
                >
                  {modelStatus === 'downloading'
                    ? `Downloading Speaking AI Pack... (${modelProgressPct}%) [Click to Pause]`
                    : modelStatus === 'paused'
                    ? `Resume Download from ${modelProgressPct}% (${verifiedMb} MB saved on disk)`
                    : 'Download Speaking Auto-Scoring Pack (76.2 MB)'}
                </button>

                {modelProgressPct > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px] text-secondary">
                      <span>19 Chunks (4 MiB each)</span>
                      <span>{modelProgressPct}%</span>
                    </div>
                    {/* Visual 19-chunk grid */}
                    <div className="grid grid-cols-19 gap-1 h-2 bg-surface-elevated rounded-xs p-0.5 border border-border-subtle">
                      {Array.from({ length: 19 }).map((_, idx) => {
                        const chunkPct = ((idx + 1) / 19) * 100
                        const isDone = modelProgressPct >= chunkPct
                        const isCurrent =
                          modelStatus === 'downloading' &&
                          modelProgressPct < chunkPct &&
                          modelProgressPct >= (idx / 19) * 100
                        return (
                          <div
                            key={idx}
                            className={`h-full rounded-2xs transition-colors ${
                              isDone
                                ? 'bg-success-ink'
                                : isCurrent
                                ? 'bg-accent-terracotta animate-pulse'
                                : 'bg-[#E5DEC9]'
                            }`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: 0 MB Lite Mode */}
            <div className="p-4 bg-surface-card rounded-sm border border-border-subtle flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-sans text-xs font-semibold text-primary uppercase tracking-wider">
                  Option 2: 0 MB Quota-Safe Mode
                </div>
                <div className="font-serif text-sm font-semibold text-primary">
                  Practice in 0 MB Lite Mode
                </div>
                <p className="font-sans text-xs text-secondary leading-relaxed">
                  Take the complete timed speaking simulation right now without downloading any AI models. Voice recordings are stored in OPFS disk and can be retroactively scored later on Wi-Fi.
                </p>
              </div>

              <div className="pt-2">
                <button
                  id="spk-optin-lite-btn"
                  type="button"
                  onClick={() => setSessionPrefersLite(true)}
                  className={`w-full py-2.5 px-3 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                    sessionPrefersLite
                      ? 'bg-accent-navy text-surface-card border-accent-navy'
                      : 'bg-surface-card text-primary border-border-strong hover:bg-neutral'
                  }`}
                >
                  {sessionPrefersLite
                    ? '✓ 0 MB Lite Mode Selected for This Session'
                    : 'Practice in 0 MB Lite Mode (Record Audio Now, Score Later on Wi-Fi)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Practice Mode & Pre-Generated Prompt Selector */}
      <div className="space-y-4">
        {/* 4 Simulation Mode Tabs */}
        <div
          id="spk-mode-tabs"
          role="tablist"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border-subtle pb-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'full'}
            onClick={() => setActiveMode('full')}
            className={`py-2 px-3 rounded-sm text-xs font-semibold transition-colors text-center cursor-pointer ${
              activeMode === 'full'
                ? 'bg-accent-navy text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Full Mock Exam (Part 1–3)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'part1'}
            onClick={() => setActiveMode('part1')}
            className={`py-2 px-3 rounded-sm text-xs font-semibold transition-colors text-center cursor-pointer ${
              activeMode === 'part1'
                ? 'bg-accent-navy text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Part 1: Interview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'part2'}
            onClick={() => setActiveMode('part2')}
            className={`py-2 px-3 rounded-sm text-xs font-semibold transition-colors text-center cursor-pointer ${
              activeMode === 'part2'
                ? 'bg-accent-navy text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Part 2: Cue Card
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'part3'}
            onClick={() => setActiveMode('part3')}
            className={`py-2 px-3 rounded-sm text-xs font-semibold transition-colors text-center cursor-pointer ${
              activeMode === 'part3'
                ? 'bg-accent-navy text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Part 3: Discussion
          </button>
        </div>

        {/* Topic Filters */}
        <div
          id="spk-topic-filters"
          className="flex flex-wrap items-center gap-2"
        >
          {TOPIC_FILTERS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              className={`py-1.5 px-3 rounded-xs text-xs font-sans font-semibold transition-colors cursor-pointer ${
                selectedTopic === topic
                  ? 'bg-primary text-surface-card'
                  : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Curated Prompt Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrompts.map((prompt) => {
            const previousAttempts = speakingAttempts.filter(
              (a) => a.prompt_id === prompt.id && a.band_overall > 0
            )
            const bestBand =
              previousAttempts.length > 0
                ? Math.max(...previousAttempts.map((a) => a.band_overall)).toFixed(1)
                : null

            return (
              <article
                key={prompt.id}
                id={`spk-prompt-card-${prompt.id}`}
                className="p-5 bg-surface-card rounded-md border border-border-subtle shadow-paper flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Badges: Part & Category */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-xs bg-surface-elevated text-primary font-mono text-[11px] font-semibold border border-border-subtle">
                        Part {prompt.part}
                      </span>
                      <span className="px-2 py-0.5 rounded-xs bg-surface-elevated text-secondary font-sans text-[11px] font-medium border border-border-subtle">
                        {prompt.category}
                      </span>
                    </div>
                    {bestBand && (
                      <span className="px-2 py-0.5 rounded-xs bg-success-bg text-success-ink font-mono text-[11px] font-semibold">
                        Best: Band {bestBand}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-serif text-[19px] font-semibold text-primary leading-snug">
                    {prompt.title}
                  </h4>

                  {/* Optional Part 2 bullets preview */}
                  {prompt.bullet_points && (
                    <ul className="font-serif text-xs text-secondary italic list-disc list-inside space-y-1">
                      {prompt.bullet_points.slice(0, 2).map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                  )}

                  {/* Target Collocations */}
                  <div className="text-xs font-mono text-secondary pt-1">
                    <span className="font-semibold text-primary">Target Collocations: </span>
                    <span>{prompt.collocations.join(', ')}</span>
                  </div>
                </div>

                {/* Card Action CTA */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-[11px] font-sans text-secondary">
                    {prompt.part === 2 ? '1m prep + 2m talk' : '4-5 min response'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartSession(prompt)}
                    className="px-4 py-2 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
                  >
                    {'Start Speaking Session ->'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* SECTION 4: Saved & Unscored Recordings Queue (Bottom Section) */}
      <div className="bg-surface-card rounded-md border border-border-subtle shadow-paper p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h3 className="font-serif text-lg font-semibold text-primary">
            Saved Speaking Recordings & Reports
          </h3>
          <span className="font-mono text-xs text-secondary">
            {speakingAttempts.length} recording(s) in local OPFS
          </span>
        </div>

        {speakingAttempts.length === 0 ? (
          <div className="py-8 text-center font-sans text-xs text-secondary">
            No speaking recordings saved on this device yet. Start a session above to record your speech.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="spk-saved-attempts" className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-secondary uppercase font-semibold font-sans text-[11px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Part & Topic</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Audio Preview</th>
                  <th className="py-2.5 px-3">Status / Band</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {speakingAttempts.map((attempt) => {
                  const isUnscored = !attempt.band_overall || attempt.band_overall === 0
                  const isPlayingThis = playingAudioId === attempt.id

                  return (
                    <tr key={attempt.id} className="hover:bg-surface-elevated/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-secondary whitespace-nowrap">
                        {formatDate(attempt.created_at || Date.now())}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-primary">
                        <div className="font-serif">Part {attempt.part}</div>
                        <div className="font-sans text-secondary text-[11px] truncate max-w-[220px]">
                          {attempt.question_text || 'Speaking Prompt'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-secondary tabular-nums whitespace-nowrap">
                        {formatDuration(attempt.duration_ms)}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAudioPreview(attempt.id)}
                          className={`px-2.5 py-1 rounded-xs font-mono text-[11px] font-medium border transition-colors cursor-pointer ${
                            isPlayingThis
                              ? 'bg-success-bg text-success-ink border-success-ink animate-pulse'
                              : 'bg-surface-elevated text-primary border-border-subtle hover:border-border-strong'
                          }`}
                        >
                          {isPlayingThis ? '▶ Playing...' : '▶ Listen (3s)'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isUnscored ? (
                          <span className="px-2 py-0.5 rounded-xs bg-warning-bg text-warning-ink font-mono text-[11px] font-semibold">
                            Unscored Audio (Lite Mode)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-xs bg-success-bg text-success-ink font-mono text-[11px] font-semibold">
                            Scored: Band {attempt.band_overall.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isUnscored ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (modelStatus === 'ready') {
                                navigate(`/speaking/report/${attempt.session_id || attempt.id}`)
                              } else {
                                navigate('/features')
                              }
                            }}
                            className="text-xs font-sans font-semibold text-tertiary hover:underline cursor-pointer"
                          >
                            Run Auto-Scoring Now
                          </button>
                        ) : (
                          <Link
                            to={`/speaking/report/${attempt.session_id || attempt.id}`}
                            className="text-xs font-sans font-semibold text-accent-navy hover:underline"
                          >
                            Open Diagnostic Report
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
