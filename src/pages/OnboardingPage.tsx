import React, { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ExamTrack, BandScore } from '../types'
import { GooseneckLampScribble } from '../components/illustrations/GooseneckLampScribble'
import { MicStudioBar } from '../components/audio/MicStudioBar'
import { parseBackupFile } from '../services/storage'

const BAND_DESCRIPTORS: Record<BandScore, string> = {
  6.0: 'Band 6.0 (Competent User): Generally effective command of the language despite some inaccuracies and misunderstandings.',
  6.5: 'Band 6.5 (High Competent User): Communicates complex ideas fairly well with occasional grammatical slips and hesitation.',
  7.0: 'Band 7.0 (Good User): Operational command of the language; handles complex reasoning and produces frequent error-free sentences.',
  7.5: 'Band 7.5 (Very Good User): High lexical precision and natural stress-timed fluency with only rare, minor inaccuracies.',
  8.0: 'Band 8.0 (Very Good+ User): Fully operational command with skillful idiomatic usage and only unsystematic slips.',
  8.5: 'Band 8.5 (Near-Expert User): Effortless fluency, wide syntactic range, and native-like prosodic control.',
  9.0: 'Band 9.0 (Expert User): Complete operational command: appropriate, accurate, and fluent with full understanding.',
}

const BANDS: BandScore[] = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const { meta, updateMeta, storageStatus, requestPersist } = useApp()

  const [track, setTrack] = useState<ExamTrack>(meta.exam_track || 'academic')
  const [targetBand, setTargetBand] = useState<BandScore>(
    (meta.target_band as BandScore) || 7.5
  )
  const [examDate, setExamDate] = useState<string>(meta.exam_date || '')
  const [isPersisted, setIsPersisted] = useState<boolean>(
    Boolean(storageStatus?.isPersistent)
  )
  const [isPersistLoading, setIsPersistLoading] = useState<boolean>(false)
  const [importNotice, setImportNotice] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handlePersistClick = async () => {
    setIsPersistLoading(true)
    try {
      const granted = await requestPersist()
      setIsPersisted(granted)
    } finally {
      setIsPersistLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const backup = await parseBackupFile(file)
      if (backup.local_meta) {
        updateMeta({
          ...backup.local_meta,
          onboarding_completed: true,
        })
        setImportNotice('Progress and settings imported successfully.')
        setTimeout(() => {
          navigate('/')
        }, 1200)
      }
    } catch (err) {
      console.error('Import failed:', err)
      alert('Failed to parse backup file. Please ensure it is a valid .ieltsbackup file.')
    }
  }

  const handleSkip = () => {
    updateMeta({
      exam_track: 'academic',
      target_band: 7.5,
      onboarding_completed: true,
    })
    navigate('/')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMeta({
      exam_track: track,
      target_band: targetBand,
      exam_date: examDate,
      onboarding_completed: true,
    })
    navigate('/')
  }

  const freeStorageDisplay = storageStatus?.freeGb ?? '14.2'

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[680px] bg-surface-card rounded-md border border-border-subtle shadow-paper p-6 sm:p-8 space-y-8 animate-fade-slide">
        {/* Animated Scribble Hero */}
        <GooseneckLampScribble className="w-full mb-2" />

        {/* Editorial Welcome Header */}
        <div className="space-y-3 text-center sm:text-left">
          <h1
            id="onb-title"
            className="font-serif text-[28px] sm:text-[32px] font-semibold text-primary leading-tight tracking-[-0.015em]"
          >
            Your Private, Local-First IELTS Study Studio.
          </h1>
          <p
            id="onb-subtitle"
            className="font-sans text-[15px] text-secondary leading-relaxed"
          >
            All speaking recordings, essays, and band diagnostics are processed and stored directly on your device using WebAssembly and SQLite. Zero mandatory account, zero background data drain.
          </p>

          {/* 3 Trust Pills */}
          <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
            <span
              id="onb-pill-1"
              className="inline-flex items-center px-2.5 py-1 rounded-xs bg-surface-elevated text-primary text-xs font-semibold tracking-wide border border-border-subtle"
            >
              100% Offline SQLite OPFS
            </span>
            <span
              id="onb-pill-2"
              className="inline-flex items-center px-2.5 py-1 rounded-xs bg-surface-elevated text-primary text-xs font-semibold tracking-wide border border-border-subtle"
            >
              Zero Auto-Download Quota Drain
            </span>
            <span
              id="onb-pill-3"
              className="inline-flex items-center px-2.5 py-1 rounded-xs bg-surface-elevated text-primary text-xs font-semibold tracking-wide border border-border-subtle"
            >
              Sovereign .ieltsbackup Export
            </span>
          </div>
        </div>

        {/* Main Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Exam Track & Target Band */}
          <div className="space-y-4 pt-2 border-t border-border-subtle">
            <h2
              id="onb-section-1-label"
              className="font-serif text-[18px] font-semibold text-primary"
            >
              1. Exam Track & Target Band
            </h2>

            {/* Exam Module Segmented Radios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
              <button
                type="button"
                id="onb-track-academic"
                role="radio"
                aria-checked={track === 'academic'}
                onClick={() => setTrack('academic')}
                className={`p-3.5 rounded-sm text-left transition-all ${
                  track === 'academic'
                    ? 'bg-surface-card border-2 border-accent-navy shadow-sm'
                    : 'bg-surface-elevated border border-border-subtle hover:border-border-strong'
                }`}
              >
                <div className="font-sans text-sm font-semibold text-primary">
                  IELTS Academic
                </div>
                <div className="font-sans text-xs text-secondary mt-1 leading-normal">
                  University & Professional Registration (Charts/Graphs Task 1)
                </div>
              </button>

              <button
                type="button"
                id="onb-track-general"
                role="radio"
                aria-checked={track === 'general'}
                onClick={() => setTrack('general')}
                className={`p-3.5 rounded-sm text-left transition-all ${
                  track === 'general'
                    ? 'bg-surface-card border-2 border-accent-navy shadow-sm'
                    : 'bg-surface-elevated border border-border-subtle hover:border-border-strong'
                }`}
              >
                <div className="font-sans text-sm font-semibold text-primary">
                  IELTS General Training
                </div>
                <div className="font-sans text-xs text-secondary mt-1 leading-normal">
                  Migration & Work Experience (Formal/Informal Letter Task 1)
                </div>
              </button>
            </div>

            {/* Target Band Picker */}
            <div className="space-y-2 pt-1">
              <label className="block font-sans text-xs font-semibold text-secondary uppercase tracking-wider">
                Target IELTS Band Score
              </label>
              <div
                id="onb-band-picker"
                role="radiogroup"
                className="grid grid-cols-7 gap-1.5 sm:gap-2"
              >
                {BANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    role="radio"
                    aria-checked={targetBand === b}
                    onClick={() => setTargetBand(b)}
                    className={`py-2 rounded-xs font-mono text-[14px] sm:text-[15px] font-semibold tabular-nums text-center transition-colors ${
                      targetBand === b
                        ? 'bg-accent-navy text-surface-card'
                        : 'bg-surface-elevated text-primary border border-border-subtle hover:border-border-strong'
                    }`}
                  >
                    {b.toFixed(1)}
                  </button>
                ))}
              </div>

              {/* Dynamic Band Descriptor */}
              <p
                id="onb-band-desc"
                className="font-serif italic text-[14px] text-secondary pt-1 leading-relaxed"
              >
                {BAND_DESCRIPTORS[targetBand]}
              </p>
            </div>

            {/* Optional Exam Date Input */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="onb-exam-date"
                className="block font-sans text-xs font-semibold text-secondary uppercase tracking-wider"
              >
                Target Exam Date (Optional)
              </label>
              <input
                id="onb-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full sm:w-64 font-mono text-[14px] bg-surface-card text-primary border border-border-strong rounded-xs px-3 py-2 focus:outline-none focus:border-accent-navy tabular-nums"
              />
            </div>
          </div>

          {/* Step 2: Local Storage & Microphone Check */}
          <div className="space-y-4 pt-2 border-t border-border-subtle">
            <h2
              id="onb-section-2-label"
              className="font-serif text-[18px] font-semibold text-primary"
            >
              2. Local Storage & Microphone Check
            </h2>

            {/* Local Disk Storage Row */}
            <div className="p-3.5 bg-surface-elevated rounded-sm border border-border-subtle space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div
                  id="onb-storage-status"
                  className="font-mono text-[13px] text-primary"
                >
                  Local Disk Quota: {freeStorageDisplay} GB available
                </div>
                <button
                  type="button"
                  id="onb-storage-btn"
                  onClick={handlePersistClick}
                  disabled={isPersistLoading}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors shrink-0 ${
                    isPersisted
                      ? 'bg-success-bg text-success-ink border border-success-ink'
                      : 'bg-surface-card text-primary border border-border-subtle hover:bg-neutral'
                  }`}
                >
                  {isPersisted
                    ? 'Persistent Storage Locked ✓'
                    : isPersistLoading
                    ? 'Requesting...'
                    : 'Lock Persistent Storage'}
                </button>
              </div>

              {/* Incognito Warning if Quota < 150MB */}
              {storageStatus?.isIncognito && (
                <div className="p-2.5 rounded-xs bg-warning-bg text-warning-ink border border-amber-300 font-sans text-xs leading-normal">
                  You appear to be in a Private/Incognito window. Local data will be cleared when you close all tabs—remember to Export Backup before exiting.
                </div>
              )}
            </div>

            {/* Microphone Selector & dBFS Loopback Bar */}
            <MicStudioBar />
          </div>

          {/* Step 3: Secondary / Restore Link */}
          <div className="pt-2 border-t border-border-subtle space-y-2">
            <p className="font-sans text-xs text-secondary">
              Already have a .ieltsbackup file or a Google Cloud Snapshot?
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <button
                type="button"
                id="onb-restore-btn"
                onClick={() => fileInputRef.current?.click()}
                className="text-accent-navy underline hover:text-primary transition-colors cursor-pointer text-left"
              >
                Already have a .ieltsbackup file? Import Progress
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ieltsbackup,.zip,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-secondary select-none">|</span>
              <Link
                to="/account"
                className="text-secondary underline hover:text-primary transition-colors"
              >
                Sign in on /account to Pull Cloud Data
              </Link>
            </div>
            {importNotice && (
              <p className="font-sans text-xs text-success-ink font-medium">
                {importNotice}
              </p>
            )}
          </div>

          {/* Primary CTA & Skip Bar */}
          <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              id="onb-skip-btn"
              onClick={handleSkip}
              className="text-secondary text-xs font-semibold hover:text-primary transition-colors py-2"
            >
              Skip (Use Defaults: Academic, Band 7.5)
            </button>
            <button
              type="submit"
              id="onb-submit-btn"
              className="w-full sm:w-auto px-6 py-3 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors tracking-wide cursor-pointer shadow-sm text-center"
            >
              {'Enter Study Studio ->'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
