import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  getStudySessions,
  getSpeakingAttempts,
  getWritingAttempts,
  getReceptiveAttempts,
  getSrsCards,
  exportIeltsBackup,
} from '../services/storage'
import {
  StudySessionRow,
  SpeakingAttemptRow,
  WritingAttemptRow,
  ReceptiveAttemptRow,
  SrsCardRow,
} from '../types'

function roundIeltsBand(mean: number): number {
  const floorInt = Math.floor(mean)
  const remainder = mean - floorInt
  if (remainder < 0.25) {
    return floorInt
  } else if (remainder < 0.75) {
    return floorInt + 0.5
  } else {
    return floorInt + 1.0
  }
}

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

function formatRelativeTime(ts: number): string {
  const now = Date.now()
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  return `${diffDays} days ago`
}

function Sparkline({ data, color = '#1E4631' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) {
    return (
      <svg className="w-16 h-5 opacity-40" viewBox="0 0 64 20" fill="none">
        <line x1="0" y1="10" x2="64" y2="10" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    )
  }

  const min = Math.min(...data, 4.0)
  const max = Math.max(...data, 9.0)
  const range = max - min || 1
  const width = 64
  const height = 20
  const padding = 2

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - padding - ((val - min) / range) * (height - padding * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="w-16 h-5 overflow-visible" viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export const DashboardPage: React.FC = () => {
  const { meta, updateMeta, storageStatus, setDueCount } = useApp()
  const navigate = useNavigate()

  const [studySessions, setStudySessions] = useState<StudySessionRow[]>([])
  const [speakingAttempts, setSpeakingAttempts] = useState<SpeakingAttemptRow[]>([])
  const [writingAttempts, setWritingAttempts] = useState<WritingAttemptRow[]>([])
  const [receptiveAttempts, setReceptiveAttempts] = useState<ReceptiveAttemptRow[]>([])
  const [srsCards, setSrsCards] = useState<SrsCardRow[]>([])
  const [isExporting, setIsExporting] = useState<boolean>(false)

  useEffect(() => {
    const sessions = getStudySessions()
    const spk = getSpeakingAttempts()
    const wrt = getWritingAttempts()
    const rec = getReceptiveAttempts()
    const cards = getSrsCards()

    setStudySessions(sessions)
    setSpeakingAttempts(spk)
    setWritingAttempts(wrt)
    setReceptiveAttempts(rec)
    setSrsCards(cards)

    // Calculate due count and update context
    const now = Date.now()
    const dueTotal = cards.filter((c) => !c.is_deleted && c.due_at <= now).length
    setDueCount(dueTotal)
  }, [setDueCount])

  // Unscored Speaking audio responses (Lite Mode recordings)
  // Queries speaking_attempts where band_overall = 0 and audio_opfs_path is present
  const unscoredAudioAttempts = speakingAttempts.filter(
    (a) => (!a.band_overall || a.band_overall === 0) && Boolean(a.audio_opfs_path)
  )
  const unscoredCount = unscoredAudioAttempts.length

  // Tier 2 model ready check (from localStorage or false default in 0 MB mode)
  const isTier2Ready = typeof localStorage !== 'undefined' && localStorage.getItem('oxford_model_whisper_ready') === 'true'

  // Latest module scores & attempts
  const latestSpeaking = speakingAttempts.length > 0 ? speakingAttempts[speakingAttempts.length - 1] : null
  const latestWriting = writingAttempts.length > 0 ? writingAttempts[writingAttempts.length - 1] : null
  const readingAttempts = receptiveAttempts.filter((a) => a.module === 'reading')
  const listeningAttempts = receptiveAttempts.filter((a) => a.module === 'listening')
  const latestReading = readingAttempts.length > 0 ? readingAttempts[readingAttempts.length - 1] : null
  const latestListening = listeningAttempts.length > 0 ? listeningAttempts[listeningAttempts.length - 1] : null

  // Trend sparklines (last 10 attempts)
  const speakingTrend = speakingAttempts.slice(-10).map((a) => a.band_overall).filter((b) => b > 0)
  const writingTrend = writingAttempts.slice(-10).map((a) => a.band_overall).filter((b) => b > 0)
  const readingTrend = readingAttempts.slice(-10).map((a) => a.band_score).filter((b) => b > 0)
  const listeningTrend = listeningAttempts.slice(-10).map((a) => a.band_score).filter((b) => b > 0)

  // Sub-scores or defaults
  const spkBand = latestSpeaking && latestSpeaking.band_overall > 0 ? latestSpeaking.band_overall.toFixed(1) : '--'
  const wrtBand = latestWriting && latestWriting.band_overall > 0 ? latestWriting.band_overall.toFixed(1) : '--'
  const rdgBand = latestReading && latestReading.band_score > 0 ? latestReading.band_score.toFixed(1) : '--'
  const lstBand = latestListening && latestListening.band_score > 0 ? latestListening.band_score.toFixed(1) : '--'

  const spkSub = latestSpeaking
    ? `FC ${latestSpeaking.band_fc.toFixed(1)} · LR ${latestSpeaking.band_lr.toFixed(1)} · GRA ${latestSpeaking.band_gra.toFixed(1)} · P ${latestSpeaking.band_p.toFixed(1)}`
    : 'FC -- · LR -- · GRA -- · P --'

  const wrtSub = latestWriting
    ? `TA/TR ${latestWriting.band_ta_tr.toFixed(1)} · CC ${latestWriting.band_cc.toFixed(1)} · LR ${latestWriting.band_lr.toFixed(1)} · GRA ${latestWriting.band_gra.toFixed(1)}`
    : 'TA/TR -- · CC -- · LR -- · GRA --'

  const trackLabelShort = meta.exam_track === 'general' ? 'General' : 'Academic'
  const rdgSub = latestReading
    ? `Latest Raw Score: ${latestReading.raw_score}/40 (${trackLabelShort})`
    : `Latest Raw Score: --/40 (${trackLabelShort})`

  const lstSub = latestListening
    ? `Latest Raw Score: ${latestListening.raw_score}/40`
    : 'Latest Raw Score: --/40'

  // Overall Band calculation
  const completedSessions = studySessions.filter((s) => !s.is_deleted && s.overall_band && s.overall_band > 0)
  const hasScores =
    latestSpeaking?.band_overall ||
    latestWriting?.band_overall ||
    latestReading?.band_score ||
    latestListening?.band_score ||
    completedSessions.length > 0

  let overallBandStr = '--'
  let formulaText = 'Complete at least one practice session to calculate your estimated band.'
  const targetBand = meta.target_band || 7.5
  let gapText = `Gap: 0.0`

  if (hasScores) {
    const spkVal = latestSpeaking?.band_overall || (completedSessions[0]?.overall_band ?? 0)
    const wrtVal = latestWriting?.band_overall || (completedSessions[0]?.overall_band ?? 0)
    const rdgVal = latestReading?.band_score || (completedSessions[0]?.overall_band ?? 0)
    const lstVal = latestListening?.band_score || (completedSessions[0]?.overall_band ?? 0)

    const rawMean = (spkVal + wrtVal + rdgVal + lstVal) / 4
    const roundedOverall = roundIeltsBand(rawMean)
    overallBandStr = roundedOverall.toFixed(1)

    formulaText = `Official Mean: (${spkVal.toFixed(1)} + ${wrtVal.toFixed(1)} + ${rdgVal.toFixed(1)} + ${lstVal.toFixed(1)}) / 4 = ${rawMean.toFixed(3)} -> Band ${overallBandStr}`

    const diff = targetBand - roundedOverall
    if (diff > 0) {
      gapText = `Gap: +${diff.toFixed(1)}`
    } else if (diff < 0) {
      gapText = `Met: +${Math.abs(diff).toFixed(1)}`
    } else {
      gapText = 'Target Met'
    }
  } else {
    gapText = `Gap: +${targetBand.toFixed(1)}`
  }

  // Active mic short name
  const activeMicShort = meta.preferred_mic_label
    ? meta.preferred_mic_label.length > 22
      ? meta.preferred_mic_label.slice(0, 20) + '...'
      : meta.preferred_mic_label
    : 'Default System'

  // FSRS calculations
  const now = Date.now()
  const dueCards = srsCards.filter((c) => !c.is_deleted && c.due_at <= now)
  const dueTotal = dueCards.length
  const pronCount = dueCards.filter((c) => c.card_type === 'pronunciation').length
  const gramCount = dueCards.filter((c) => c.card_type === 'grammar_fix').length
  const collocCount = dueCards.filter((c) => c.card_type === 'collocation').length

  // Recent 8 study sessions
  const recentSessions = [...studySessions]
    .filter((s) => !s.is_deleted)
    .sort((a, b) => b.started_at - a.started_at)
    .slice(0, 8)

  // Local storage metrics
  const dbSizeMb = storageStatus?.usageBytes
    ? (storageStatus.usageBytes / (1024 * 1024)).toFixed(1)
    : '0.8'
  const lastUpdatedStr = meta.last_saved_at ? formatDate(meta.last_saved_at) : 'Never'
  const lastExportStr = meta.last_export_at ? formatRelativeTime(meta.last_export_at) : 'Never'

  const handleQuickExport = async () => {
    setIsExporting(true)
    try {
      const payload = await exportIeltsBackup()
      if (payload.local_meta) {
        updateMeta(payload.local_meta)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleRetroBtnClick = () => {
    if (isTier2Ready) {
      navigate('/speaking')
    } else {
      navigate('/features')
    }
  }

  // Exam countdown calculation
  let daysToExam: number | null = null
  if (meta.exam_date) {
    const examTs = new Date(meta.exam_date).getTime()
    if (!isNaN(examTs)) {
      const diffMs = examTs - Date.now()
      daysToExam = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }
  }
  const trackFullName = meta.exam_track === 'general' ? 'IELTS General Training' : 'IELTS Academic'

  return (
    <div className="space-y-6">
      {/* Top Masthead & Countdown Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary tracking-tight">
            Study Command Center
          </h1>
          <p className="font-sans text-xs text-secondary mt-1">
            {daysToExam !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-xs bg-surface-elevated text-primary font-mono text-xs border border-border-subtle tabular-nums font-medium">
                  {daysToExam} Days to {trackFullName}
                </span>
                <span>&bull; Target: Band {targetBand.toFixed(1)}</span>
              </span>
            ) : (
              <span>Target: Band {targetBand.toFixed(1)} &bull; {trackFullName}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/onboarding"
            className="px-3 py-1.5 rounded-sm bg-surface-elevated text-primary border border-border-subtle text-xs font-semibold hover:border-border-strong transition-colors"
          >
            Revisit Onboarding
          </Link>
          <Link
            to="/speaking"
            className="px-4 py-1.5 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors"
          >
            Start Practice
          </Link>
        </div>
      </div>

      {/* Conditional Retroactive Scoring Banner */}
      {unscoredCount > 0 && (
        <section
          id="dash-retro-banner"
          className="p-4 sm:p-5 rounded-md bg-surface-elevated border border-border-strong flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-slide"
        >
          <div className="space-y-1">
            <div className="font-serif text-base font-semibold text-primary">
              Saved Offline Recordings
            </div>
            <p className="font-sans text-xs text-secondary">
              You have {unscoredCount} recorded Speaking response(s) saved in 0 MB Lite Mode.
            </p>
          </div>
          <button
            id="dash-retro-btn"
            type="button"
            onClick={handleRetroBtnClick}
            className="px-4 py-2 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors cursor-pointer shrink-0"
          >
            {isTier2Ready
              ? `Score ${unscoredCount} Saved Recording(s) Now`
              : 'Manage Speaking AI Pack (76.2 MB) ->'}
          </button>
        </section>
      )}

      {/* Row 1: Band Score Hero & 4-Skill Breakdown (12 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Overall Estimated Band Hero (5 Cols) */}
        <div className="lg:col-span-5 bg-surface-card rounded-md border border-border-subtle p-6 shadow-paper flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span
              id="dash-hero-label"
              className="text-xs font-semibold uppercase tracking-wider text-secondary block"
            >
              ESTIMATED OVERALL BAND
            </span>

            <div className="flex items-baseline gap-3">
              <div
                id="dash-hero-score"
                className="font-serif text-[56px] font-semibold text-primary leading-none tabular-nums"
              >
                {overallBandStr}
              </div>
              <span
                id="dash-hero-target-badge"
                className="px-2.5 py-1 rounded-xs bg-surface-elevated text-primary font-mono text-[13px] border border-border-subtle tabular-nums font-medium"
              >
                Target: {targetBand.toFixed(1)} ({gapText})
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle">
            <p
              id="dash-hero-formula"
              className="font-mono text-[12px] text-secondary leading-relaxed"
            >
              {formulaText}
            </p>
          </div>
        </div>

        {/* Right Card: 4-Pillar Skill Cards (7 Cols — 2x2 Grid) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Speaking Pillar */}
          <article
            id="dash-skill-speaking"
            className="p-4 bg-surface-card rounded-md border border-border-subtle flex flex-col justify-between space-y-3 shadow-paper"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[18px] font-semibold text-primary">
                  Speaking
                </h3>
                <div className="font-mono text-[24px] font-semibold text-primary mt-0.5 tabular-nums">
                  {spkBand}
                </div>
              </div>
              <Sparkline data={speakingTrend} color="#1E4631" />
            </div>
            <div className="font-mono text-[11px] text-secondary border-t border-border-subtle pt-2">
              {spkSub}
            </div>
          </article>

          {/* Writing Pillar */}
          <article
            id="dash-skill-writing"
            className="p-4 bg-surface-card rounded-md border border-border-subtle flex flex-col justify-between space-y-3 shadow-paper"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[18px] font-semibold text-primary">
                  Writing
                </h3>
                <div className="font-mono text-[24px] font-semibold text-primary mt-0.5 tabular-nums">
                  {wrtBand}
                </div>
              </div>
              <Sparkline data={writingTrend} color="#1E4631" />
            </div>
            <div className="font-mono text-[11px] text-secondary border-t border-border-subtle pt-2">
              {wrtSub}
            </div>
          </article>

          {/* Reading Pillar */}
          <article
            id="dash-skill-reading"
            className="p-4 bg-surface-card rounded-md border border-border-subtle flex flex-col justify-between space-y-3 shadow-paper"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[18px] font-semibold text-primary">
                  Reading
                </h3>
                <div className="font-mono text-[24px] font-semibold text-primary mt-0.5 tabular-nums">
                  {rdgBand}
                </div>
              </div>
              <Sparkline data={readingTrend} color="#1E4631" />
            </div>
            <div className="font-mono text-[11px] text-secondary border-t border-border-subtle pt-2">
              {rdgSub}
            </div>
          </article>

          {/* Listening Pillar */}
          <article
            id="dash-skill-listening"
            className="p-4 bg-surface-card rounded-md border border-border-subtle flex flex-col justify-between space-y-3 shadow-paper"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[18px] font-semibold text-primary">
                  Listening
                </h3>
                <div className="font-mono text-[24px] font-semibold text-primary mt-0.5 tabular-nums">
                  {lstBand}
                </div>
              </div>
              <Sparkline data={listeningTrend} color="#1E4631" />
            </div>
            <div className="font-mono text-[11px] text-secondary border-t border-border-subtle pt-2">
              {lstSub}
            </div>
          </article>
        </div>
      </div>

      {/* Row 2: Quick-Start Exam Simulators & Daily FSRS Review (12 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4 Module Launch Cards (8 Cols — 2x2 Grid) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Speaking Simulator */}
          <Link
            to="/speaking"
            id="dash-launch-speaking"
            className="p-5 bg-surface-card rounded-md border border-border-subtle hover:border-border-strong transition-all shadow-paper block group flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="font-serif text-lg font-semibold text-primary group-hover:text-accent-navy transition-colors">
                Speaking Lab
              </div>
              <p className="font-sans text-xs text-secondary">
                Part 1, 2 & 3 Simulator &bull; Mic: {activeMicShort}
              </p>
            </div>
            <div className="pt-4 font-sans text-xs font-semibold text-accent-navy group-hover:underline">
              {'Open Speaking Lab ->'}
            </div>
          </Link>

          {/* Writing Simulator */}
          <Link
            to="/writing"
            id="dash-launch-writing"
            className="p-5 bg-surface-card rounded-md border border-border-subtle hover:border-border-strong transition-all shadow-paper block group flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="font-serif text-lg font-semibold text-primary group-hover:text-accent-navy transition-colors">
                Writing Lab
              </div>
              <p className="font-sans text-xs text-secondary">
                Task 1 SVG Charts & Task 2 Split Editor
              </p>
            </div>
            <div className="pt-4 font-sans text-xs font-semibold text-accent-navy group-hover:underline">
              {'Open Writing Lab ->'}
            </div>
          </Link>

          {/* Reading Simulator */}
          <Link
            to="/reading"
            id="dash-launch-reading"
            className="p-5 bg-surface-card rounded-md border border-border-subtle hover:border-border-strong transition-all shadow-paper block group flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="font-serif text-lg font-semibold text-primary group-hover:text-accent-navy transition-colors">
                Reading Room
              </div>
              <p className="font-sans text-xs text-secondary">
                3-Passage Annotator & 14 Question Types
              </p>
            </div>
            <div className="pt-4 font-sans text-xs font-semibold text-accent-navy group-hover:underline">
              {'Open Reading Room ->'}
            </div>
          </Link>

          {/* Listening Simulator */}
          <Link
            to="/listening"
            id="dash-launch-listening"
            className="p-5 bg-surface-card rounded-md border border-border-subtle hover:border-border-strong transition-all shadow-paper block group flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="font-serif text-lg font-semibold text-primary group-hover:text-accent-navy transition-colors">
                Listening Room
              </div>
              <p className="font-sans text-xs text-secondary">
                4-Section Audio Player & Spelling Normalizer
              </p>
            </div>
            <div className="pt-4 font-sans text-xs font-semibold text-accent-navy group-hover:underline">
              {'Open Listening Room ->'}
            </div>
          </Link>
        </div>

        {/* FSRS v5 Spaced Repetition Due Card (4 Cols — Warm Well) */}
        <aside
          id="dash-fsrs-card"
          className="lg:col-span-4 bg-surface-elevated rounded-md border border-border-subtle p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
              FSRS v5 SPACED REPETITION
            </div>
            <h2 className="font-serif text-[32px] sm:text-[36px] font-semibold text-primary leading-tight">
              {dueTotal} Cards Due Today
            </h2>
            <ul id="dash-fsrs-breakdown" className="space-y-1.5 font-mono text-[13px] text-secondary pt-1">
              <li className="flex justify-between">
                <span>Pronunciation & IPA:</span>
                <span className="font-semibold text-primary">{pronCount}</span>
              </li>
              <li className="flex justify-between">
                <span>Grammar Cloze Fixes:</span>
                <span className="font-semibold text-primary">{gramCount}</span>
              </li>
              <li className="flex justify-between">
                <span>C1/C2 Collocations:</span>
                <span className="font-semibold text-primary">{collocCount}</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <Link
              to="/review"
              id="dash-fsrs-cta"
              className="w-full inline-block text-center py-2.5 px-4 rounded-sm bg-accent-forest text-surface-card text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
            >
              {dueTotal > 0
                ? `Review ${dueTotal} Due Cards ->`
                : 'All Caught Up — Browse Deck ->'}
            </Link>
          </div>
        </aside>
      </div>

      {/* Row 3: Recent Study Sessions & Local Backup Health (12 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Attempts Table (8 Cols) */}
        <div className="lg:col-span-8 bg-surface-card rounded-md border border-border-subtle shadow-paper p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h2 className="font-serif text-lg font-semibold text-primary">
              Recent Study Sessions
            </h2>
            <span className="font-mono text-xs text-secondary">
              Last {recentSessions.length} sessions
            </span>
          </div>

          {recentSessions.length === 0 ? (
            <div
              id="dash-history-empty"
              className="py-12 px-4 text-center font-sans text-[14px] text-secondary"
            >
              No study sessions recorded on this device yet. Select a simulator above to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="dash-history-table" className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-secondary uppercase font-semibold font-sans text-[11px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Prompt</th>
                    <th className="py-2.5 px-3">Band</th>
                    <th className="py-2.5 px-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {recentSessions.map((session) => {
                    const moduleLabel =
                      session.module.charAt(0).toUpperCase() + session.module.slice(1)
                    const bandDisplay =
                      session.overall_band && session.overall_band > 0
                        ? session.overall_band.toFixed(1)
                        : '--'
                    const reportPath =
                      session.module === 'speaking'
                        ? `/speaking/report/${session.id}`
                        : `/${session.module}/${session.id}`

                    return (
                      <tr key={session.id} className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-secondary whitespace-nowrap">
                          {formatDate(session.started_at)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-primary whitespace-nowrap">
                          {moduleLabel} {session.mode ? `(${session.mode})` : ''}
                        </td>
                        <td className="py-2.5 px-3 font-serif text-primary truncate max-w-[200px]">
                          {session.prompt_title || 'IELTS Practice Session'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-xs text-[11px] ${
                              session.overall_band && session.overall_band >= 7.0
                                ? 'bg-success-bg text-success-ink'
                                : session.overall_band && session.overall_band >= 6.0
                                ? 'bg-warning-bg text-warning-ink'
                                : 'bg-surface-elevated text-secondary'
                            }`}
                          >
                            {bandDisplay}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <Link
                            to={reportPath}
                            className="text-xs font-sans font-semibold text-accent-navy hover:underline"
                          >
                            View Diagnostic Report
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Local-First Data Health Card (4 Cols) */}
        <aside
          id="dash-storage-card"
          className="lg:col-span-4 bg-surface-card rounded-md border border-border-subtle shadow-paper p-5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold text-primary border-b border-border-subtle pb-3">
              Local Data & Backup Status
            </h2>

            <div className="space-y-2.5 font-mono text-[12px]">
              <div className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-secondary">Local Storage:</span>
                <span className="text-primary font-semibold tabular-nums">{dbSizeMb} MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-secondary">Last Local Activity:</span>
                <span className="text-primary tabular-nums">{lastUpdatedStr}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-secondary">Last File Export:</span>
                <span className="text-primary tabular-nums">{lastExportStr}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-secondary">Cloud Snapshot:</span>
                <span className="text-secondary">Not Logged In</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle space-y-2">
            <button
              id="dash-quick-export-btn"
              type="button"
              disabled={isExporting}
              onClick={handleQuickExport}
              className="w-full py-2 px-3 rounded-sm bg-surface-elevated text-primary border border-border-subtle text-xs font-semibold hover:border-border-strong transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export Backup (.zip)'}
            </button>
            <Link
              to="/account"
              className="block text-center text-xs font-sans font-semibold text-secondary hover:text-primary transition-colors pt-1"
            >
              {'Manage Snapshots in Account ->'}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
