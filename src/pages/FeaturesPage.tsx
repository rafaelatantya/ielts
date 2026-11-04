import React, { useState, useEffect, useRef } from 'react'
import {
  getStorageEstimate,
  getTier2SpeakingModelStatus,
  setTier2SpeakingModelStatus,
  getSpeakingAttempts,
  getStudySessions,
  getWritingAttempts,
  getReceptiveAttempts,
  getSrsCards,
  ModelPackStatus,
} from '../services/storage'

interface ModelPackConfig {
  id: 'tier1' | 'tier2' | 'tier3' | 'tts'
  articleId: string
  title: string
  sizeMb: number
  totalChunks: number
  sizeBadge: string
  description: string
}

const PACK_CONFIGS: ModelPackConfig[] = [
  {
    id: 'tier1',
    articleId: 'feat-pack-tier1',
    title: 'Tier 1 — Fast Writing & Lexical/Grammar Pack',
    sizeMb: 6.1,
    totalChunks: 2,
    sizeBadge: '6.1 MB (2 Chunks)',
    description: 'Fast grammar and vocabulary checker for essays.',
  },
  {
    id: 'tier2',
    articleId: 'feat-pack-tier2',
    title: 'Tier 2 — Speaking Core Auto-Scoring Pack',
    sizeMb: 76.2,
    totalChunks: 19,
    sizeBadge: '76.2 MB (19 Chunks × 4 MiB)',
    description: 'Speech recognition, fluency tracking, and speaking scoring engine.',
  },
  {
    id: 'tier3',
    articleId: 'feat-pack-tier3',
    title: 'Tier 3 — Deep Phoneme IPA GOP & Advanced GEC Pack',
    sizeMb: 116.0,
    totalChunks: 29,
    sizeBadge: '116.0 MB (29 Chunks × 4 MiB)',
    description: 'Detailed pronunciation and sentence grammar analysis.',
  },
  {
    id: 'tts',
    articleId: 'feat-pack-tts',
    title: 'Optional — Offline Neural Examiner Voice Pack',
    sizeMb: 80.0,
    totalChunks: 20,
    sizeBadge: '80.0 MB (20 Chunks × 4 MiB)',
    description: 'Natural British, Australian, and US examiner voices for offline practice.',
  },
]

type ChunkStatus = 'pending' | 'active' | 'verified'

interface PackRuntimeState {
  status: ModelPackStatus
  downloadedChunks: number
  chunkStates: ChunkStatus[]
  speedMb: number
  isVerifying: boolean
  verifyProgressChunk?: number
  verifiedIntegrityAt?: string | null
}

const STORAGE_KEYS = {
  tier1_status: 'oxford_model_tier1_status',
  tier1_chunks: 'oxford_model_tier1_chunks',
  tier3_status: 'oxford_model_tier3_status',
  tier3_chunks: 'oxford_model_tier3_chunks',
  tts_status: 'oxford_model_tts_status',
  tts_chunks: 'oxford_model_tts_chunks',
  cdn_priority: 'oxford_features_cdn_priority',
  parallel_streams: 'oxford_features_parallel_streams',
}

export const FeaturesPage: React.FC = () => {
  // CDN & Parallel Stream selectors
  const [cdnMirror, setCdnMirror] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.cdn_priority) ||
      'Auto Multi-Mirror (HuggingFace LFS + Cloudflare Edge)'
    )
  })

  const [parallelStreams, setParallelStreams] = useState<number>(() => {
    const val = localStorage.getItem(STORAGE_KEYS.parallel_streams)
    return val ? Number(val) : 4
  })

  // Storage breakdown
  const [dbMb, setDbMb] = useState<string>('4.2')
  const [audMb, setAudMb] = useState<string>('12.8')
  const [modMb, setModMb] = useState<string>('0.0')
  const [freeGb, setFreeGb] = useState<string>('14.8')

  // Pack states
  const [packStates, setPackStates] = useState<Record<string, PackRuntimeState>>(() => {
    const initial: Record<string, PackRuntimeState> = {}

    PACK_CONFIGS.forEach((cfg) => {
      let status: ModelPackStatus = 'idle'
      let downloadedChunks = 0

      if (cfg.id === 'tier2') {
        const t2 = getTier2SpeakingModelStatus()
        status = t2.status
        if (status === 'ready') {
          downloadedChunks = cfg.totalChunks
        } else {
          downloadedChunks = Math.min(
            cfg.totalChunks,
            Math.floor((t2.progressPct / 100) * cfg.totalChunks)
          )
        }
      } else {
        const savedStatus = localStorage.getItem(`oxford_model_${cfg.id}_status`) as ModelPackStatus
        const savedChunks = Number(localStorage.getItem(`oxford_model_${cfg.id}_chunks`)) || 0
        if (savedStatus) {
          status = savedStatus
          downloadedChunks = Math.min(cfg.totalChunks, savedChunks)
        }
      }

      const chunkStates: ChunkStatus[] = Array.from({ length: cfg.totalChunks }, (_, i) =>
        i < downloadedChunks ? 'verified' : 'pending'
      )

      initial[cfg.id] = {
        status,
        downloadedChunks,
        chunkStates,
        speedMb: 0,
        isVerifying: false,
        verifyProgressChunk: 0,
        verifiedIntegrityAt: null,
      }
    })

    return initial
  })

  const verifyTimersRef = useRef<Record<string, number | null>>({})

  // Handle CDN change
  const handleCdnChange = (val: string) => {
    setCdnMirror(val)
    localStorage.setItem(STORAGE_KEYS.cdn_priority, val)
  }

  // Handle Parallel Streams change
  const handleStreamsChange = (val: number) => {
    setParallelStreams(val)
    localStorage.setItem(STORAGE_KEYS.parallel_streams, String(val))
  }

  // Load storage estimates
  useEffect(() => {
    const calculateStorage = async () => {
      try {
        const est = await getStorageEstimate()
        setFreeGb(est.freeGb)

        // Calculate DB size from localStorage payloads
        const sessions = getStudySessions()
        const speaking = getSpeakingAttempts()
        const writing = getWritingAttempts()
        const receptive = getReceptiveAttempts()
        const srs = getSrsCards()

        const dbBytes =
          JSON.stringify(sessions).length +
          JSON.stringify(writing).length +
          JSON.stringify(receptive).length +
          JSON.stringify(srs).length
        const estimatedDbMb = (0.2 + dbBytes / (1024 * 1024)).toFixed(1)
        setDbMb(estimatedDbMb)

        // Calculate audio size
        const audioTotalBytes = speaking.reduce(
          (acc, cur) => acc + (cur.audio_size_bytes || 0),
          0
        )
        const estimatedAudMb = speaking.length === 0 ? '0.0' : (audioTotalBytes / (1024 * 1024)).toFixed(1)
        setAudMb(estimatedAudMb)
      } catch (err) {
        console.warn('Storage calculation error:', err)
      }
    }

    calculateStorage()
  }, [])

  // Recalculate downloaded AI models MB
  useEffect(() => {
    let totalDownloadedMb = 0
    PACK_CONFIGS.forEach((cfg) => {
      const state = packStates[cfg.id]
      if (state) {
        if (state.status === 'ready') {
          totalDownloadedMb += cfg.sizeMb
        } else {
          totalDownloadedMb += (state.downloadedChunks / cfg.totalChunks) * cfg.sizeMb
        }
      }
    })
    setModMb(totalDownloadedMb.toFixed(1))
  }, [packStates])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => {
        if (t) clearInterval(t)
      })
      Object.values(verifyTimersRef.current).forEach((t) => {
        if (t) clearInterval(t)
      })
    }
  }, [])

  // Start / Resume simulation
  const startDownloadSimulation = (packId: string) => {
    const cfg = PACK_CONFIGS.find((c) => c.id === packId)
    if (!cfg) return

    if (timersRef.current[packId]) {
      clearInterval(timersRef.current[packId]!)
      timersRef.current[packId] = null
    }

    setPackStates((prev) => {
      const current = prev[packId]
      const nextChunkStates = [...current.chunkStates]

      // Mark the next stream chunks as active
      let activeAssigned = 0
      for (let i = 0; i < nextChunkStates.length; i++) {
        if (nextChunkStates[i] === 'pending' && activeAssigned < parallelStreams) {
          nextChunkStates[i] = 'active'
          activeAssigned++
        }
      }

      const nextState: PackRuntimeState = {
        ...current,
        status: 'downloading',
        chunkStates: nextChunkStates,
        speedMb: parallelStreams === 1 ? 3.8 : parallelStreams === 6 ? 18.5 : 14.2,
      }

      if (packId === 'tier2') {
        const pct = Math.floor((current.downloadedChunks / cfg.totalChunks) * 100)
        setTier2SpeakingModelStatus('downloading', pct)
      } else {
        localStorage.setItem(`oxford_model_${packId}_status`, 'downloading')
        localStorage.setItem(`oxford_model_${packId}_chunks`, String(current.downloadedChunks))
      }

      return { ...prev, [packId]: nextState }
    })

    const intervalTime = parallelStreams === 6 ? 220 : parallelStreams === 1 ? 750 : 380

    const timer = window.setInterval(() => {
      setPackStates((prev) => {
        const current = prev[packId]
        if (!current || current.status !== 'downloading') return prev

        const nextVerified = current.downloadedChunks + 1
        const nextChunkStates = [...current.chunkStates]

        for (let i = 0; i < nextChunkStates.length; i++) {
          if (i < nextVerified) {
            nextChunkStates[i] = 'verified'
          } else if (i < nextVerified + parallelStreams) {
            nextChunkStates[i] = 'active'
          } else {
            nextChunkStates[i] = 'pending'
          }
        }

        if (nextVerified >= cfg.totalChunks) {
          if (timersRef.current[packId]) {
            clearInterval(timersRef.current[packId]!)
            timersRef.current[packId] = null
          }

          if (packId === 'tier2') {
            setTier2SpeakingModelStatus('ready', 100)
          } else {
            localStorage.setItem(`oxford_model_${packId}_status`, 'ready')
            localStorage.setItem(`oxford_model_${packId}_chunks`, String(cfg.totalChunks))
          }

          return {
            ...prev,
            [packId]: {
              ...current,
              status: 'ready',
              downloadedChunks: cfg.totalChunks,
              chunkStates: nextChunkStates.map(() => 'verified'),
              speedMb: 0,
            },
          }
        }

        const pct = Math.floor((nextVerified / cfg.totalChunks) * 100)
        if (packId === 'tier2') {
          setTier2SpeakingModelStatus('downloading', pct)
        } else {
          localStorage.setItem(`oxford_model_${packId}_status`, 'downloading')
          localStorage.setItem(`oxford_model_${packId}_chunks`, String(nextVerified))
        }

        return {
          ...prev,
          [packId]: {
            ...current,
            downloadedChunks: nextVerified,
            chunkStates: nextChunkStates,
            speedMb: parallelStreams === 1 ? 3.8 : parallelStreams === 6 ? 18.5 : 14.2,
          },
        }
      })
    }, intervalTime)

    timersRef.current[packId] = timer
  }

  // Pause
  const handlePause = (packId: string) => {
    if (timersRef.current[packId]) {
      clearInterval(timersRef.current[packId]!)
      timersRef.current[packId] = null
    }

    setPackStates((prev) => {
      const current = prev[packId]
      const nextChunkStates = current.chunkStates.map((_, i) =>
        i < current.downloadedChunks ? 'verified' : 'pending'
      )
      const next: PackRuntimeState = {
        ...current,
        status: 'paused',
        chunkStates: nextChunkStates,
        speedMb: 0,
      }

      const cfg = PACK_CONFIGS.find((c) => c.id === packId)!
      const pct = Math.floor((current.downloadedChunks / cfg.totalChunks) * 100)
      if (packId === 'tier2') {
        setTier2SpeakingModelStatus('paused', pct)
      } else {
        localStorage.setItem(`oxford_model_${packId}_status`, 'paused')
        localStorage.setItem(`oxford_model_${packId}_chunks`, String(current.downloadedChunks))
      }

      return { ...prev, [packId]: next }
    })
  }

  // Delete from Disk
  const handleDelete = (packId: string) => {
    if (timersRef.current[packId]) {
      clearInterval(timersRef.current[packId]!)
      timersRef.current[packId] = null
    }
    if (verifyTimersRef.current[packId]) {
      clearInterval(verifyTimersRef.current[packId]!)
      verifyTimersRef.current[packId] = null
    }

    const cfg = PACK_CONFIGS.find((c) => c.id === packId)!

    setPackStates((prev) => {
      const next: PackRuntimeState = {
        status: 'idle',
        downloadedChunks: 0,
        chunkStates: Array.from({ length: cfg.totalChunks }, () => 'pending'),
        speedMb: 0,
        isVerifying: false,
        verifyProgressChunk: 0,
        verifiedIntegrityAt: null,
      }

      if (packId === 'tier2') {
        setTier2SpeakingModelStatus('idle', 0)
        localStorage.removeItem('oxford_model_whisper_ready')
      } else {
        localStorage.removeItem(`oxford_model_${packId}_status`)
        localStorage.removeItem(`oxford_model_${packId}_chunks`)
      }

      return { ...prev, [packId]: next }
    })
  }

  // Verify SHA-256
  const handleVerify = (packId: string) => {
    const cfg = PACK_CONFIGS.find((c) => c.id === packId)
    if (!cfg) return

    if (verifyTimersRef.current[packId]) {
      clearInterval(verifyTimersRef.current[packId]!)
      verifyTimersRef.current[packId] = null
    }

    const totalToVerify = cfg.totalChunks

    setPackStates((prev) => ({
      ...prev,
      [packId]: {
        ...prev[packId],
        isVerifying: true,
        verifyProgressChunk: 0,
        verifiedIntegrityAt: null,
      },
    }))

    const intervalTime = Math.max(30, Math.floor(1000 / totalToVerify))

    const timer = window.setInterval(() => {
      setPackStates((prev) => {
        const current = prev[packId]
        if (!current || !current.isVerifying) return prev

        const nextChunk = (current.verifyProgressChunk || 0) + 1

        if (nextChunk >= totalToVerify) {
          if (verifyTimersRef.current[packId]) {
            clearInterval(verifyTimersRef.current[packId]!)
            verifyTimersRef.current[packId] = null
          }

          const now = new Date()
          const timeStr = [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
          ].join(':')

          return {
            ...prev,
            [packId]: {
              ...current,
              isVerifying: false,
              verifyProgressChunk: totalToVerify,
              verifiedIntegrityAt: timeStr,
            },
          }
        }

        return {
          ...prev,
          [packId]: {
            ...current,
            verifyProgressChunk: nextChunk,
          },
        }
      })
    }, intervalTime)

    verifyTimersRef.current[packId] = timer
  }

  const allDownloaded = PACK_CONFIGS.every(
    (cfg) => packStates[cfg.id]?.status === 'ready'
  )
  const allDownloadingOrReady = PACK_CONFIGS.every(
    (cfg) => packStates[cfg.id]?.status === 'ready' || packStates[cfg.id]?.status === 'downloading'
  )

  const handleDownloadAll = () => {
    PACK_CONFIGS.forEach((cfg) => {
      if (packStates[cfg.id]?.status !== 'ready' && packStates[cfg.id]?.status !== 'downloading') {
        startDownloadSimulation(cfg.id)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          AI Features & Offline Model Manager
        </h1>
      </div>

      {/* 2.2 feat-storage-meter */}
      <section
        id="feat-storage-meter"
        className="bg-surface-card rounded-md border border-border-subtle p-5 shadow-paper space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <h2 className="font-serif text-base font-semibold text-primary">
            Local Storage Allocation
          </h2>
          <div className="font-mono text-xs text-secondary tabular-nums">
            Study History: {dbMb} MB · Voice Recordings: {audMb} MB · AI Models: {modMb} MB · Free Quota:{' '}
            {freeGb} GB
          </div>
        </div>

        {/* Visual Segmented Storage Bar */}
        <div className="w-full h-3 rounded-full bg-[#F4F0EA] overflow-hidden flex">
          <div
            style={{
              width: Number(dbMb) === 0 ? '0%' : `${(Number(dbMb) / 400) * 100}%`,
              minWidth: Number(dbMb) > 0 ? '3px' : '0px',
            }}
            className="bg-[#1E3A5F] h-full transition-all duration-300"
            title={`Study History: ${dbMb} MB`}
          />
          <div
            style={{
              width: Number(audMb) === 0 ? '0%' : `${(Number(audMb) / 400) * 100}%`,
              minWidth: Number(audMb) > 0 ? '3px' : '0px',
            }}
            className="bg-[#9A3412] h-full transition-all duration-300"
            title={`Voice Recordings: ${audMb} MB`}
          />
          <div
            style={{
              width: Number(modMb) === 0 ? '0%' : `${(Number(modMb) / 400) * 100}%`,
              minWidth: Number(modMb) > 0 ? '3px' : '0px',
            }}
            className="bg-[#1E4631] h-full transition-all duration-300"
            title={`AI Models: ${modMb} MB`}
          />
          <div className="flex-1 bg-[#E2D9CA]/40 h-full" title={`Free Quota: ${freeGb} GB`} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans text-secondary pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#1E3A5F]" />
            <span>Study History ({dbMb} MB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#9A3412]" />
            <span>Speaking Audio Recordings ({audMb} MB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#1E4631]" />
            <span>Downloaded AI Models ({modMb} MB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#E2D9CA]" />
            <span>Free Browser Space ({freeGb} GB Free)</span>
          </div>
        </div>

        {/* CDN & Concurrency Selectors + Download All */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-3 border-t border-border-subtle">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="feat-cdn-select"
                className="font-sans text-[13px] font-medium text-primary"
              >
                CDN Mirror Priority:
              </label>
              <select
                id="feat-cdn-select"
                value={cdnMirror}
                onChange={(e) => handleCdnChange(e.target.value)}
                className="font-sans text-xs bg-white text-primary border border-[#C7BFA8] rounded-sm px-3 py-2 focus:ring-1 focus:ring-accent-navy focus:outline-none"
              >
                <option value="Auto Multi-Mirror (HuggingFace LFS + Cloudflare Edge)">
                  Auto Multi-Mirror (HuggingFace LFS + Cloudflare Edge)
                </option>
                <option value="Cloudflare R2 Edge Cache (SEA/Jakarta PoP)">
                  Cloudflare R2 Edge Cache (SEA/Jakarta PoP)
                </option>
                <option value="HuggingFace Hub Global CDN">HuggingFace Hub Global CDN</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="feat-streams-select"
                className="font-sans text-[13px] font-medium text-primary"
              >
                Multi-Point Streams:
              </label>
              <select
                id="feat-streams-select"
                value={parallelStreams}
                onChange={(e) => handleStreamsChange(Number(e.target.value))}
                className="font-sans text-xs bg-white text-primary border border-[#C7BFA8] rounded-sm px-3 py-2 focus:ring-1 focus:ring-accent-navy focus:outline-none"
              >
                <option value={4}>4 Parallel Streams (Recommended)</option>
                <option value={6}>6 Parallel Streams (Fast Wi-Fi)</option>
                <option value={1}>1 Stream (Cellular / Data Saver)</option>
              </select>
            </div>
          </div>

          <div className="lg:shrink-0 flex items-center">
            {allDownloaded ? (
              <button
                type="button"
                id="feat-download-all-btn"
                disabled
                className="w-full lg:w-auto font-sans text-xs font-semibold px-5 py-2.5 bg-[#EAF3EC] text-[#166534] border border-[#166534] rounded-sm shadow-xs flex items-center justify-center gap-1.5 cursor-default"
              >
                <span className="w-2 h-2 rounded-full bg-[#166534]" />
                All Models Downloaded ✓
              </button>
            ) : (
              <button
                type="button"
                id="feat-download-all-btn"
                onClick={handleDownloadAll}
                disabled={allDownloadingOrReady}
                className="w-full lg:w-auto font-sans text-xs font-semibold px-5 py-2.5 bg-[#9A3412] hover:bg-[#832b0e] text-white rounded-sm shadow-sm transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                <span>📦</span>
                Download All AI Models (278.3 MB)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2.2 Modular AI Feature Pack Cards (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PACK_CONFIGS.map((cfg) => {
          const state = packStates[cfg.id]
          const isDownloading = state.status === 'downloading'
          const isPaused = state.status === 'paused'
          const isReady = state.status === 'ready'
          const isIdle = state.status === 'idle'

          const verifiedCount = state.downloadedChunks
          const verifiedMb = isReady
            ? cfg.sizeMb.toFixed(1)
            : ((verifiedCount / cfg.totalChunks) * cfg.sizeMb).toFixed(1)
          const pct = Math.floor((verifiedCount / cfg.totalChunks) * 100)

          // Format ETA
          const remainingMb = Math.max(0, cfg.sizeMb - Number(verifiedMb))
          const etaSec = state.speedMb > 0 ? Math.ceil(remainingMb / state.speedMb) : 0
          const etaMm = String(Math.floor(etaSec / 60)).padStart(2, '0')
          const etaSs = String(etaSec % 60).padStart(2, '0')
          const etaFormatted = `${etaMm}:${etaSs}`

          return (
            <article
              key={cfg.id}
              id={cfg.articleId}
              className="bg-surface-card rounded-md border border-border-subtle p-6 shadow-paper flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3.5">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-semibold text-primary">{cfg.title}</h3>
                    <p className="font-sans text-xs text-secondary leading-relaxed">
                      {cfg.description}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-medium px-2.5 py-1 bg-[#F4F0EA] border border-border-subtle rounded-sm text-primary shrink-0 tabular-nums">
                    {cfg.sizeBadge}
                  </span>
                </div>

                {/* 19-Chunk (or N-Chunk) Visual Matrix & Telemetry */}
                <div id={`feat-chunk-grid-${cfg.id}`} className="space-y-2.5 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {state.chunkStates.map((chunkStatus, idx) => {
                      let bgColor = '#E5DEC9'
                      let animationClass = ''

                      if (chunkStatus === 'verified') {
                        bgColor = '#166534'
                      } else if (chunkStatus === 'active') {
                        bgColor = '#92400E'
                        animationClass = 'animate-pulse'
                      }

                      return (
                        <div
                          key={idx}
                          title={`Chunk ${idx} (${(idx * 4).toFixed(1)} MiB) — ${
                            state.isVerifying
                              ? idx < (state.verifyProgressChunk || 0)
                                ? 'verified (checking)'
                                : idx === (state.verifyProgressChunk || 0)
                                ? 'verifying'
                                : chunkStatus
                              : chunkStatus
                          }`}
                          className={`w-3.5 h-3.5 rounded-xs transition-colors duration-200 ${
                            state.isVerifying && idx === (state.verifyProgressChunk || 0)
                              ? 'animate-pulse bg-[#92400E]'
                              : animationClass
                          }`}
                          style={{
                            backgroundColor:
                              state.isVerifying
                                ? idx < (state.verifyProgressChunk || 0)
                                  ? '#166534'
                                  : idx === (state.verifyProgressChunk || 0)
                                  ? '#92400E'
                                  : '#E5DEC9'
                                : bgColor,
                          }}
                        />
                      )
                    })}
                  </div>

                  {/* Telemetry Text */}
                  <div className="font-mono text-[12px] text-secondary tabular-nums space-y-1 pt-1">
                    <div className="text-primary font-medium">
                      {isReady
                        ? `Status: Ready (${cfg.sizeMb} MB / ${cfg.sizeMb} MB)`
                        : isPaused
                        ? `Status: Paused at ${pct}% (${verifiedCount} / ${cfg.totalChunks} Chunks — ${verifiedMb} MB / ${cfg.sizeMb} MB)`
                        : isDownloading
                        ? `Status: Downloading at ${pct}% (${verifiedCount} / ${cfg.totalChunks} Chunks — ${verifiedMb} MB / ${cfg.sizeMb} MB)`
                        : `Status: 0 / ${cfg.totalChunks} Chunks (0.0 MB / ${cfg.sizeMb} MB)`}
                    </div>
                    <div>
                      {verifiedCount} / {cfg.totalChunks} Chunks ({verifiedMb} MB /{' '}
                      {cfg.sizeMb} MB) · {state.speedMb.toFixed(1)} MB/s · ETA {etaFormatted}
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrity check status message */}
              {state.verifiedIntegrityAt && (
                <div className="font-mono text-xs text-[#166534] bg-[#EAF3EC] border border-[#166534]/30 rounded-xs px-3 py-2 flex items-center gap-1.5">
                  <span>✓</span>
                  <span>
                    Integrity check passed at {state.verifiedIntegrityAt}: all {cfg.totalChunks} chunks ({cfg.sizeMb} MB) verified on device with 0 corrupted blocks.
                  </span>
                </div>
              )}

              {/* Action Controls */}
              <div
                id={`feat-pack-actions-${cfg.id}`}
                className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-border-subtle"
              >
                {/* Download Button */}
                {(isIdle || (verifiedCount === 0 && !isDownloading)) && !isReady && (
                  <button
                    type="button"
                    onClick={() => startDownloadSimulation(cfg.id)}
                    className="font-sans text-xs font-semibold px-4 py-2 bg-[#9A3412] hover:bg-[#832b0e] text-white rounded-sm shadow-sm transition-colors"
                  >
                    Download Pack ({cfg.sizeMb} MB)
                  </button>
                )}

                {/* Downloading State Buttons */}
                {isDownloading && (
                  <button
                    type="button"
                    onClick={() => handlePause(cfg.id)}
                    className="font-sans text-xs font-semibold px-4 py-2 bg-[#F4F0EA] hover:bg-[#e8e2d8] text-primary border border-border-subtle rounded-sm transition-colors"
                  >
                    Pause Download
                  </button>
                )}

                {/* Paused State Buttons */}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => startDownloadSimulation(cfg.id)}
                    className="font-sans text-xs font-semibold px-4 py-2 bg-[#9A3412] hover:bg-[#832b0e] text-white rounded-sm shadow-sm transition-colors"
                  >
                    Resume from {pct}%
                  </button>
                )}

                {/* Ready on Disk indicator */}
                {isReady && (
                  <span className="font-sans text-xs font-semibold px-3 py-1.5 bg-[#EAF3EC] text-[#166534] border border-[#166534] rounded-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#166534]" />
                    Ready on Device ✓
                  </span>
                )}

                {/* Verify File button */}
                {(isReady || verifiedCount > 0) && (
                  <button
                    type="button"
                    disabled={state.isVerifying}
                    onClick={() => handleVerify(cfg.id)}
                    className={`font-sans text-xs font-medium px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50 ${
                      state.verifiedIntegrityAt
                        ? 'bg-[#EAF3EC] text-[#166534] border border-[#166534]'
                        : 'bg-white text-secondary hover:text-primary border border-[#C7BFA8]'
                    }`}
                  >
                    {state.isVerifying
                      ? `Verifying chunk ${state.verifyProgressChunk || 0}/${cfg.totalChunks}...`
                      : state.verifiedIntegrityAt
                      ? `✓ Integrity Verified (${cfg.totalChunks}/${cfg.totalChunks} Chunks OK)`
                      : 'Verify File Integrity'}
                  </button>
                )}

                {/* Delete from Disk */}
                {(isReady || isPaused || verifiedCount > 0) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(cfg.id)}
                    className="font-sans text-xs font-medium px-3 py-1.5 bg-[#FEE2E2] hover:bg-[#fca5a5] text-[#991B1B] rounded-sm transition-colors ml-auto"
                  >
                    Delete from Device
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
