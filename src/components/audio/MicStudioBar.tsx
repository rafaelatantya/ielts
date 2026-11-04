import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MicDeviceInfo } from '../../types'
import {
  getMicrophoneList,
  requestMicrophonePermission,
  getMicStream,
  calculateDbfs,
} from '../../services/audio'
import { useApp } from '../../context/AppContext'

interface MicStudioBarProps {
  onMicSelected?: (deviceId: string, label: string) => void
  showFullControls?: boolean
}

export const MicStudioBar: React.FC<MicStudioBarProps> = ({
  onMicSelected,
  showFullControls = false,
}) => {
  const { meta, updateMeta } = useApp()
  const [devices, setDevices] = useState<MicDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string>(
    meta.preferred_mic_device_id || ''
  )
  const [activeLabel, setActiveLabel] = useState<string>(
    meta.preferred_mic_label || ''
  )
  const [hasPermission, setHasPermission] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState<boolean>(showFullControls)
  const [liveDbfs, setLiveDbfs] = useState<number>(-60)
  const [noiseFloor, setNoiseFloor] = useState<number>(-48)
  const [isRecordingLoopback, setIsRecordingLoopback] = useState<boolean>(false)
  const [isPlayingLoopback, setIsPlayingLoopback] = useState<boolean>(false)
  const [loopbackCountdown, setLoopbackCountdown] = useState<number>(3)

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const noiseFloorHistoryRef = useRef<number[]>([])

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

        // Noise floor tracking: track quiet moments
        if (dbfs < -25) {
          noiseFloorHistoryRef.current.push(dbfs)
          if (noiseFloorHistoryRef.current.length > 50) {
            noiseFloorHistoryRef.current.shift()
          }
          const sorted = [...noiseFloorHistoryRef.current].sort((a, b) => a - b)
          const median = sorted[Math.floor(sorted.length / 2)]
          setNoiseFloor(Math.round(median))
        }

        // Draw VU meter canvas at 60fps
        const canvas = canvasRef.current
        if (canvas) {
          const ctx2d = canvas.getContext('2d')
          if (ctx2d) {
            const width = canvas.width
            const height = canvas.height
            ctx2d.clearRect(0, 0, width, height)

            // Background well
            ctx2d.fillStyle = '#E5DEC9'
            ctx2d.fillRect(0, 0, width, height)

            // Normalized range: -60 dBFS to 0 dBFS
            const normalized = Math.max(0, Math.min(1, (dbfs + 60) / 60))
            const fillWidth = normalized * width

            // Segment color logic:
            // Normal speech (-40 to -12 dBFS) -> #166534
            // Loud speech (-12 to -3 dBFS) -> #92400E
            // Clipping (>= -3 dBFS) -> #991B1B
            if (dbfs >= -3) {
              ctx2d.fillStyle = '#991B1B'
            } else if (dbfs >= -14) {
              ctx2d.fillStyle = '#92400E'
            } else {
              ctx2d.fillStyle = '#166534'
            }

            ctx2d.fillRect(0, 0, fillWidth, height)

            // Hairline peak mark
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
        setIsExpanded(true)

        const list = await getMicrophoneList()
        setDevices(list)

        const currentTrack = stream.getAudioTracks()[0]
        const currentId = currentTrack?.getSettings()?.deviceId || deviceId || ''
        const currentLabel =
          currentTrack?.label ||
          list.find((d) => d.deviceId === currentId)?.label ||
          'Default Microphone'

        setActiveDeviceId(currentId)
        setActiveLabel(currentLabel)

        updateMeta({
          preferred_mic_device_id: currentId,
          preferred_mic_label: currentLabel,
        })

        if (onMicSelected) {
          onMicSelected(currentId, currentLabel)
        }

        startMeter(stream)
      } catch (err) {
        console.warn('Mic init failed:', err)
      }
    },
    [onMicSelected, startMeter, stopActiveStream, updateMeta]
  )

  // Listen for USB / Bluetooth mic hot-plugging via navigator.mediaDevices.ondevicechange
  useEffect(() => {
    const handleDeviceChange = async () => {
      const list = await getMicrophoneList()
      setDevices(list)
      // Check if current mic is still present
      if (activeDeviceId && !list.some((d) => d.deviceId === activeDeviceId)) {
        // Fallback to first available device
        if (list.length > 0) {
          initMic(list[0].deviceId)
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    }

    return () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
    }
  }, [activeDeviceId, initMic])

  useEffect(() => {
    return () => {
      stopActiveStream()
    }
  }, [stopActiveStream])

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

  const handleDeviceChangeSelect = async (newDeviceId: string) => {
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

      // 3-second countdown timer
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

  const isQuietRoom = noiseFloor < -38
  const noiseFloorBadgeText = isQuietRoom
    ? `Quiet Room ${noiseFloor} dBFS`
    : `Noisy Env ${noiseFloor} dBFS`

  return (
    <div className="w-full space-y-3">
      {/* Primary Trigger / Status Button */}
      <button
        id="onb-mic-btn"
        type="button"
        onClick={handlePromptAndSelect}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm bg-surface-elevated text-primary border border-border-strong text-xs font-semibold hover:bg-neutral transition-colors text-left"
      >
        <span className="truncate">
          {hasPermission && activeLabel
            ? `Active Mic: ${activeLabel}`
            : 'Prompt Browser & Select Microphone'}
        </span>
      </button>

      {/* Expanded Live Microphone Selector & dBFS VU Meter Controls */}
      {isExpanded && (
        <div className="p-3 bg-surface-elevated rounded-sm border border-border-subtle space-y-3 animate-fade-slide">
          {/* Hardware Dropdown */}
          <div>
            <label
              htmlFor="onb-mic-select"
              className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1"
            >
              Hardware Microphone Input
            </label>
            <select
              id="onb-mic-select"
              value={activeDeviceId}
              onChange={(e) => handleDeviceChangeSelect(e.target.value)}
              className="w-full text-xs font-sans bg-surface-card text-primary border border-border-strong rounded-xs px-2.5 py-1.5 focus:outline-none focus:border-accent-navy cursor-pointer"
            >
              {devices.length === 0 ? (
                <option value="">Default System Microphone</option>
              ) : (
                devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Real-time 60fps dBFS VU Meter */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-secondary mb-1">
              <span>Input Level</span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-medium ${
                    isQuietRoom
                      ? 'bg-success-bg text-success-ink'
                      : 'bg-warning-bg text-warning-ink'
                  }`}
                >
                  {noiseFloorBadgeText}
                </span>
                <span className="text-primary font-semibold tabular-nums">
                  {liveDbfs} dBFS
                </span>
              </div>
            </div>
            {/* 60fps Canvas VU Meter */}
            <canvas
              ref={canvasRef}
              width={300}
              height={8}
              className="w-full h-2 rounded-xs border border-border-subtle block"
            />
          </div>

          {/* 3-Second Loopback Tester */}
          <div>
            <button
              id="onb-mic-test-btn"
              type="button"
              disabled={isRecordingLoopback || isPlayingLoopback}
              onClick={handleTestLoopback}
              className={`w-full py-2 px-3 rounded-xs text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isRecordingLoopback
                  ? 'bg-danger-bg text-danger-ink border border-danger-ink animate-pulse'
                  : isPlayingLoopback
                  ? 'bg-success-bg text-success-ink border border-success-ink'
                  : 'bg-surface-card text-primary border border-border-subtle hover:bg-neutral'
              }`}
            >
              <span>
                {isRecordingLoopback
                  ? `🔴 Recording (${loopbackCountdown}s)... Speak clearly`
                  : isPlayingLoopback
                  ? '🔊 Playing back (3s)... Listen to your voice'
                  : '🔊 Test & Hear Mic (3s)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
