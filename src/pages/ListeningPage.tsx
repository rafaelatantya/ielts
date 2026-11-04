import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  LISTENING_TEST,
  ListeningSection,
  normalizeListeningAnswer,
  calculateListeningBandScore,
} from '../data/listeningTests'
import {
  saveReceptiveAttempts,
  getReceptiveAttempts,
  saveStudySessions,
  getStudySessions,
  saveSrsCards,
  getSrsCards,
} from '../services/storage'
import { ReceptiveAttemptRow, StudySessionRow, SrsCardRow } from '../types'

export const ListeningPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { setDueCount } = useApp()

  // 1. Active Section State: 0, 1, 2, 3
  const [activeSectionIndex, setActiveSectionIndex] = useState<0 | 1 | 2 | 3>(0)
  const currentSection: ListeningSection = LISTENING_TEST[activeSectionIndex]

  // 2. Audio Deck & Mode State
  // Strict Exam Audio (No Rewind) vs Practice Mode (Scrubbing Enabled)
  const [isStrictExamMode, setIsStrictExamMode] = useState<boolean>(true)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const [volume, setVolume] = useState<number>(0.85)

  // Pre-Section Reading Time (30 seconds official countdown)
  const [readingTimeRemaining, setReadingTimeRemaining] = useState<number>(30)
  const [isPreReadingActive, setIsPreReadingActive] = useState<boolean>(true)

  // Audio Playback Position (in seconds)
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0)
  const audioIntervalRef = useRef<number | null>(null)

  // 3. User Answers & Flags
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('oxford_listening_active_answers')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Scratchpad margin note state
  const [scratchpadText, setScratchpadText] = useState<string>(() => {
    try {
      return localStorage.getItem('oxford_listening_scratchpad') || ''
    } catch {
      return ''
    }
  })

  // 4. Test Submission & Review Mode
  const [isTestSubmitted, setIsTestSubmitted] = useState<boolean>(false)
  const [completedAttemptId, setCompletedAttemptId] = useState<string | null>(
    searchParams.get('attemptId') || null
  )
  const [activeDialogueHighlightSec, setActiveDialogueHighlightSec] = useState<number | null>(null)
  const [addedSpellingCards, setAddedSpellingCards] = useState<Record<string, boolean>>({})

  // Speaker audio test oscillator reference
  const audioContextRef = useRef<AudioContext | null>(null)

  // Sync answers and scratchpad to localStorage
  useEffect(() => {
    if (!isTestSubmitted) {
      localStorage.setItem('oxford_listening_active_answers', JSON.stringify(answers))
    }
  }, [answers, isTestSubmitted])

  useEffect(() => {
    localStorage.setItem('oxford_listening_scratchpad', scratchpadText)
  }, [scratchpadText])

  // Pre-section 30s countdown timer
  useEffect(() => {
    if (!isPreReadingActive || isTestSubmitted) return

    const t = setInterval(() => {
      setReadingTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(t)
          setIsPreReadingActive(false)
          setIsPlaying(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(t)
  }, [isPreReadingActive, isTestSubmitted, activeSectionIndex])

  // Audio simulation timer loop (WebAudio synthesis + clock)
  useEffect(() => {
    if (!isPlaying || isPreReadingActive || isTestSubmitted) {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
      return
    }

    const stepMs = 250
    audioIntervalRef.current = window.setInterval(() => {
      setCurrentTimeSec((prev) => {
        const next = prev + (stepMs / 1000) * playbackSpeed
        if (next >= currentSection.audioDurationSec) {
          setIsPlaying(false)
          return currentSection.audioDurationSec
        }
        return next
      })
    }, stepMs)

    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
    }
  }, [isPlaying, isPreReadingActive, isTestSubmitted, currentSection.audioDurationSec, playbackSpeed])

  // Handle Section Change
  const handleSwitchSection = (idx: 0 | 1 | 2 | 3) => {
    setActiveSectionIndex(idx)
    setCurrentTimeSec(0)
    if (!isTestSubmitted) {
      setIsPreReadingActive(true)
      setReadingTimeRemaining(30)
      setIsPlaying(false)
    }
  }

  // Handle audio play/pause
  const togglePlayPause = () => {
    if (isPreReadingActive) {
      // Allow skipping the preview countdown in practice mode
      if (!isStrictExamMode) {
        setIsPreReadingActive(false)
        setIsPlaying(true)
      }
      return
    }
    setIsPlaying(!isPlaying)
  }

  // Handle audio seek (allowed only in Practice Mode)
  const handleSeek = (newSec: number) => {
    if (isStrictExamMode && !isTestSubmitted) return
    setCurrentTimeSec(Math.max(0, Math.min(newSec, currentSection.audioDurationSec)))
  }

  // Speaker output sound test (Web Audio chime)
  const handleTestSpeaker = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioContextRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {
      // AudioContext not available in some sandbox heads
    }
  }

  // Word count parser for validation
  const getWordCount = (val: string): number => {
    const trimmed = (val || '').trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).filter(Boolean).length
  }

  // Submit test deterministically
  const handleSubmitTest = () => {
    if (isTestSubmitted) return

    let rawScore = 0
    const allQuestions = LISTENING_TEST.flatMap((s) => s.questions)

    allQuestions.forEach((q) => {
      const userAns = answers[q.id] || ''
      const result = normalizeListeningAnswer(userAns, q)
      if (result.isCorrect) {
        rawScore += 1
      }
    })

    const band = calculateListeningBandScore(rawScore)
    const now = Date.now()
    const attemptId = `rcp-lst-${now}`
    const sessionId = `sess-lst-${now}`

    const newReceptiveAttempt: ReceptiveAttemptRow = {
      id: attemptId,
      session_id: sessionId,
      prompt_id: 'lst-cambridge-standard-01',
      module: 'listening',
      raw_score: rawScore,
      total_questions: 40,
      band_score: band,
      answers_json: JSON.stringify(answers),
      created_at: now,
      hlc: `${now}:1:node_listening`,
    }

    const newSession: StudySessionRow = {
      id: sessionId,
      module: 'listening',
      mode: 'official_split_exam',
      started_at: now - 30 * 60 * 1000,
      completed_at: now,
      overall_band: band,
      prompt_title: 'Full Academic Listening Test (Sections 1–4)',
      hlc: `${now}:1:node_listening`,
    }

    saveReceptiveAttempts([...getReceptiveAttempts(), newReceptiveAttempt])
    saveStudySessions([...getStudySessions(), newSession])

    setCompletedAttemptId(attemptId)
    setIsTestSubmitted(true)
    setIsStrictExamMode(false) // Unlock audio scrubbing in review mode
  }

  // Add misspelled word to FSRS deck
  const handleAddSpellingToFsrs = (misspelledWord: string, correctSpelling: string) => {
    const existingCards = getSrsCards()
    const cardId = `srs-lst-${correctSpelling.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

    if (existingCards.some((c) => c.id === cardId)) {
      setAddedSpellingCards((prev) => ({ ...prev, [correctSpelling]: true }))
      return
    }

    const newCard: SrsCardRow = {
      id: cardId,
      source_attempt_id: completedAttemptId || 'lst-session',
      card_type: 'spelling',
      front_text: `Spelling Check: ${misspelledWord || 'Misspelled word'}`,
      back_text: `Correct Spelling: ${correctSpelling}`,
      context_sentence: `Listening Exam Spelling: Target word is "${correctSpelling}". Avoid writing "${misspelledWord}".`,
      due_at: Date.now(),
      stability: 1.0,
      difficulty: 6.0,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review_at: null,
      hlc: `${Date.now()}:1:node_listening_spelling`,
    }

    const updated = [...existingCards, newCard]
    saveSrsCards(updated)
    setDueCount(updated.filter((c) => c.due_at <= Date.now()).length)
    setAddedSpellingCards((prev) => ({ ...prev, [correctSpelling]: true }))
  }

  // Format seconds to mm:ss
  const formatTime = (secs: number): string => {
    const s = Math.floor(secs)
    const m = Math.floor(s / 60)
    const remS = s % 60
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}`
  }

  // Total correct calculation for summary
  const allQuestionsList = LISTENING_TEST.flatMap((s) => s.questions)
  const totalCorrect = allQuestionsList.filter((q) => {
    const userAns = answers[q.id] || ''
    return normalizeListeningAnswer(userAns, q).isCorrect
  }).length
  const computedBand = calculateListeningBandScore(totalCorrect)

  return (
    <div className="space-y-4 max-w-[1080px] mx-auto pb-12">
      {/* 2.1 Top Audio & Section Control Bar (64px height) */}
      <header className="bg-surface-card border border-border-subtle rounded-md p-3 shadow-paper flex flex-col md:flex-row items-center justify-between gap-3">
        {/* lst-section-tabs */}
        <div
          id="lst-section-tabs"
          role="tablist"
          aria-label="Listening Section Switcher"
          className="flex items-center space-x-1.5"
        >
          {LISTENING_TEST.map((sec, idx) => {
            const isActive = activeSectionIndex === idx
            return (
              <button
                key={sec.sectionIndex}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSwitchSection(idx as 0 | 1 | 2 | 3)}
                className={`px-3 py-1.5 rounded-sm text-xs font-sans font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent-navy text-surface-card'
                    : 'bg-surface-elevated text-secondary hover:text-primary hover:bg-neutral'
                }`}
              >
                Sec {idx + 1} ({sec.readingRange})
              </button>
            )
          })}
        </div>

        {/* Submit Button or Graded Status */}
        <div className="flex items-center space-x-3">
          {!isTestSubmitted ? (
            <button
              id="lst-submit-btn"
              onClick={handleSubmitTest}
              className="bg-tertiary hover:bg-tertiary/90 text-surface-card px-4 py-1.5 rounded-sm text-xs font-sans font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Submit Listening Answers -&gt;
            </button>
          ) : (
            <span className="text-xs font-sans font-semibold text-success-ink bg-success-bg px-3 py-1.5 rounded-sm border border-success-ink/20">
              Score: {totalCorrect}/40 (Band {computedBand.toFixed(1)})
            </span>
          )}
        </div>
      </header>

      {/* lst-audio-deck */}
      <section
        id="lst-audio-deck"
        className="bg-surface-elevated border border-border-subtle rounded-md p-4 shadow-paper space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Status Label */}
          <div className="font-mono text-xs font-semibold text-primary flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-navy animate-pulse" />
            {isPreReadingActive && !isTestSubmitted ? (
              <span className="text-tertiary font-bold">
                Pre-Section Reading Time: {readingTimeRemaining}s
              </span>
            ) : (
              <span>
                Playing Section {activeSectionIndex + 1}: {formatTime(currentTimeSec)} /{' '}
                {formatTime(currentSection.audioDurationSec)}
              </span>
            )}
          </div>

          {/* Mode Toggle: Strict Exam Audio (No Rewind) vs. Practice Mode (Scrubbing Enabled) */}
          <div className="flex items-center space-x-2 text-xs font-sans">
            <button
              disabled={isTestSubmitted}
              onClick={() => setIsStrictExamMode(true)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                isStrictExamMode
                  ? 'bg-accent-navy text-surface-card font-semibold'
                  : 'bg-surface-card text-secondary hover:text-primary border border-border-subtle'
              }`}
            >
              Strict Exam Audio (No Rewind)
            </button>
            <button
              onClick={() => setIsStrictExamMode(false)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                !isStrictExamMode
                  ? 'bg-accent-navy text-surface-card font-semibold'
                  : 'bg-surface-card text-secondary hover:text-primary border border-border-subtle'
              }`}
            >
              Practice Mode (Scrubbing Enabled)
            </button>
          </div>
        </div>

        {/* Audio Progress Bar & Scrubbing */}
        <div className="space-y-1">
          <div className="relative w-full h-2.5 bg-neutral rounded-full overflow-hidden border border-border-subtle">
            <div
              className="h-full bg-accent-navy transition-all duration-150"
              style={{
                width: `${(currentTimeSec / currentSection.audioDurationSec) * 100}%`,
              }}
            />
          </div>
          {!isStrictExamMode && (
            <input
              type="range"
              min={0}
              max={currentSection.audioDurationSec}
              step={1}
              value={currentTimeSec}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full accent-accent-navy cursor-pointer mt-1"
            />
          )}
        </div>

        {/* Player Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlayPause}
              className="px-4 py-1.5 rounded bg-accent-navy hover:bg-accent-navy/90 text-surface-card text-xs font-sans font-semibold shadow-xs"
            >
              {isPreReadingActive && !isTestSubmitted
                ? isStrictExamMode
                  ? 'Reading Preview (30s)...'
                  : 'Skip Preview ->'
                : isPlaying
                ? 'Pause Audio'
                : 'Play Audio'}
            </button>

            {/* Skip Controls (Practice mode or post-test only) */}
            {!isStrictExamMode && (
              <>
                <button
                  onClick={() => handleSeek(currentTimeSec - 5)}
                  className="px-2 py-1 rounded bg-surface-card border border-border-subtle text-xs font-mono text-secondary hover:text-primary"
                  title="Rewind 5 seconds"
                >
                  ⏪ -5s
                </button>
                <button
                  onClick={() => handleSeek(currentTimeSec + 5)}
                  className="px-2 py-1 rounded bg-surface-card border border-border-subtle text-xs font-mono text-secondary hover:text-primary"
                  title="Forward 5 seconds"
                >
                  ⏩ +5s
                </button>
              </>
            )}

            {/* Playback Speed Controls */}
            {!isStrictExamMode && (
              <div className="flex items-center space-x-1 pl-2 border-l border-border-subtle">
                {[0.85, 1.0, 1.25].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-xs font-mono ${
                      playbackSpeed === spd
                        ? 'bg-accent-navy text-surface-card font-semibold'
                        : 'bg-surface-card text-secondary hover:text-primary border border-border-subtle'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Slider & Output Speaker Test Button */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-secondary font-sans">
              <span>Vol:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 accent-accent-navy"
              />
            </div>
            <button
              onClick={handleTestSpeaker}
              className="px-2.5 py-1 rounded bg-surface-card border border-border-subtle text-xs font-sans text-secondary hover:text-primary shadow-xs"
            >
              🔔 Test Speaker
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Left Question Sheet + Right Scratchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          {/* lst-wordlimit-banner */}
          <div
            id="lst-wordlimit-banner"
            className="bg-[#FEF3C7] border border-warning-ink/30 text-[#92400E] p-3.5 rounded-md shadow-xs space-y-1"
          >
            <div className="font-sans text-xs font-bold uppercase tracking-wide">
              {currentSection.instructionHeader}
            </div>
            <p className="font-sans text-xs opacity-90 leading-relaxed">
              Official IELTS listening rule: Contractions count as one word. Hyphenated words count as single words. Numbers can be written in words or figures.
            </p>
          </div>

          {/* Section 2 Map Plan Labeling (if active) */}
          {currentSection.mapConfig && (
            <div className="bg-surface-card border border-border-subtle rounded-md p-4 shadow-paper space-y-3">
              <div className="font-serif text-sm font-bold text-primary">
                {currentSection.mapConfig.title}
              </div>
              <p className="font-sans text-xs text-secondary">
                Listen to the officer&apos;s directions and write the correct letter (A–H) next to Questions 13–18.
              </p>

              {/* Interactive SVG Map */}
              <div className="relative border border-border-subtle rounded bg-[#FAF7F1] p-2 flex justify-center">
                <svg
                  viewBox="0 0 380 360"
                  className="w-full max-w-[480px] h-auto select-none"
                  style={{ background: '#FAF7F1' }}
                >
                  {/* River on North & East */}
                  <path
                    d="M 20 20 Q 200 40, 360 20 L 360 80 Q 220 90, 20 50 Z"
                    fill="#DBEAFE"
                    stroke="#93C5FD"
                    strokeWidth="1.5"
                  />
                  <text x="180" y="35" fontSize="10" fontFamily="sans-serif" fill="#1E40AF" fontStyle="italic">
                    River Wycombe (North)
                  </text>

                  {/* Circular Pond */}
                  <circle cx="180" cy="220" r="30" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
                  <text x="160" y="224" fontSize="9" fontFamily="sans-serif" fill="#1E40AF">
                    Pond
                  </text>

                  {/* Pathways */}
                  <path
                    d="M 290 320 L 290 160 L 220 70 M 290 220 L 180 220 L 70 240 M 120 150 L 180 220 L 150 310"
                    fill="none"
                    stroke="#D6CEB8"
                    strokeWidth="4"
                    strokeDasharray="4 2"
                  />

                  {/* Map Points A..H */}
                  {currentSection.mapConfig.points.map((pt) => (
                    <g key={pt.letter} transform={`translate(${pt.x}, ${pt.y})`}>
                      <rect
                        x="-16"
                        y="-14"
                        width="32"
                        height="28"
                        rx="4"
                        fill="#1E3A5F"
                        stroke="#FAF7F1"
                        strokeWidth="1.5"
                        className="shadow-sm"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="13"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {pt.letter}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* lst-question-sheet */}
          <article
            id="lst-question-sheet"
            className="bg-surface-card border border-border-subtle rounded-md p-6 shadow-paper space-y-5"
          >
            <div className="border-b border-border-subtle pb-3">
              <h2 className="font-serif text-lg font-bold text-primary">
                {currentSection.title}
              </h2>
              <p className="font-sans text-xs text-secondary mt-0.5">
                {currentSection.typeDesc}
              </p>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {currentSection.questions.map((q) => {
                const currentAns = answers[q.id] || ''
                const wordCount = getWordCount(currentAns)
                const isOverLimit = wordCount > currentSection.maxWords
                const normalizer = normalizeListeningAnswer(currentAns, q)

                return (
                  <div
                    key={q.id}
                    id={`lst-q-${q.id}`}
                    className={`p-3.5 rounded border transition-colors ${
                      isTestSubmitted
                        ? normalizer.isCorrect
                          ? 'border-success-ink/40 bg-success-bg/15'
                          : 'border-danger-ink/40 bg-danger-bg/15'
                        : 'border-border-subtle bg-surface-card hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-accent-navy bg-surface-elevated px-2 py-0.5 rounded border border-border-subtle">
                          Q{q.id}
                        </span>
                        <span className="font-sans text-[11px] uppercase tracking-wider text-secondary">
                          {q.type === 'form_completion'
                            ? 'Form Completion'
                            : q.type === 'note_completion'
                            ? 'Note Completion'
                            : q.type === 'map_labeling'
                            ? 'Map Labeling'
                            : 'Multiple Choice'}
                        </span>
                      </div>

                      {/* Review Mode: lst-normalizer-badge */}
                      {isTestSubmitted && (
                        <span
                          id="lst-normalizer-badge"
                          className={`text-[11px] font-sans font-semibold px-2 py-0.5 rounded border ${
                            normalizer.isCorrect
                              ? 'bg-[#EAF3EC] text-[#166534] border-[#166534]/30'
                              : 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]/30'
                          }`}
                        >
                          {normalizer.isCorrect
                            ? `✓ Correct (Accepted: ${normalizer.canonicalDisplay})`
                            : `✗ Your Answer: "${normalizer.userNormalized || 'Empty'}" · Correct: "${q.correctAnswer}"`}
                        </span>
                      )}
                    </div>

                    {/* Question Prompt */}
                    <div className="font-sans text-xs sm:text-sm font-medium text-primary mb-2 leading-relaxed">
                      {q.prompt}
                    </div>

                    {/* Completion Input with live validation */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {q.type === 'map_labeling' ? (
                          <select
                            value={currentAns}
                            disabled={isTestSubmitted}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value.toUpperCase() }))
                            }
                            className="text-xs font-mono p-1.5 border border-border-subtle rounded bg-neutral focus:border-accent-navy text-primary"
                          >
                            <option value="">Select letter (A–H)</option>
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l) => (
                              <option key={l} value={l}>
                                Point {l}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={currentAns}
                            disabled={isTestSubmitted}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            placeholder={`Write ${currentSection.wordLimitRule.toLowerCase()}...`}
                            className={`w-full max-w-md text-xs font-sans p-2 border rounded uppercase focus:outline-none ${
                              isOverLimit
                                ? 'border-danger-ink bg-danger-bg/20'
                                : 'border-border-subtle bg-neutral focus:border-accent-navy'
                            }`}
                          />
                        )}

                        {/* Live Word Count Limit Violation Warning */}
                        {isOverLimit && (
                          <span className="text-[11px] font-sans font-semibold text-danger-ink bg-danger-bg px-2 py-1 rounded border border-danger-ink/30 whitespace-nowrap">
                            Exceeds {currentSection.maxWords} word limit
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review Mode Details & Spelling Add to FSRS */}
                    {isTestSubmitted && (
                      <div className="mt-3 pt-2 border-t border-border-subtle text-xs font-sans text-secondary space-y-1.5">
                        <p className="text-primary font-medium">{q.explanation}</p>
                        {q.distractorNote && (
                          <div className="p-2 bg-warning-bg/40 border border-warning-ink/30 rounded text-warning-ink text-[11px] leading-relaxed">
                            <strong>Distractor Warning:</strong> {q.distractorNote}
                          </div>
                        )}

                        {/* If user made a spelling mistake, give 1-click FSRS add */}
                        {!normalizer.isCorrect && (
                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-tertiary">
                              Spelling Target: <strong>{q.correctAnswer}</strong>
                            </span>
                            <button
                              onClick={() => handleAddSpellingToFsrs(currentAns, q.correctAnswer)}
                              disabled={addedSpellingCards[q.correctAnswer]}
                              className={`text-[11px] font-sans font-semibold px-2.5 py-1 rounded border transition-colors ${
                                addedSpellingCards[q.correctAnswer]
                                  ? 'bg-success-bg text-success-ink border-success-ink/30'
                                  : 'bg-surface-card text-accent-navy border-accent-navy hover:bg-accent-navy hover:text-surface-card'
                              }`}
                            >
                              {addedSpellingCards[q.correctAnswer]
                                ? '✓ Added to FSRS'
                                : '+ Add Spelling to FSRS'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </article>
        </div>

        {/* Right Pane: Scratchpad Margin Notes */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-surface-card border border-border-subtle rounded-md p-4 shadow-paper space-y-2 sticky top-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="font-serif text-xs font-semibold text-primary">
                Listening Scratchpad
              </span>
              <span className="text-[11px] font-mono text-secondary">
                Auto-saved
              </span>
            </div>
            <p className="text-[11px] font-sans text-secondary leading-relaxed">
              Jot down numbers, name spellings, and dates while listening before transferring to official answers.
            </p>
            <textarea
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              placeholder="e.g. 47 Ravenswood... HP12 4YT... 8:30am..."
              rows={12}
              className="w-full text-xs font-mono p-2.5 border border-border-subtle rounded bg-neutral focus:outline-none focus:border-accent-navy leading-relaxed"
            />
          </div>
        </aside>
      </div>

      {/* 2.3 & 3: lst-transcript-panel */}
      {/* STRICT RULE Section 4: DO NOT reveal listening transcript while test is in progress */}
      {isTestSubmitted && (
        <section
          id="lst-transcript-panel"
          className="bg-surface-card border border-border-subtle rounded-md p-6 shadow-paper space-y-4"
        >
          <div className="border-b border-border-subtle pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-base font-bold text-primary">
                Time-Synced Audio Transcript &amp; Distractor Notes
              </h3>
              <p className="font-sans text-xs text-secondary mt-0.5">
                Click any dialogue line to jump audio directly to that timestamp. Distractor traps highlighted in amber.
              </p>
            </div>
            <span className="text-xs font-mono text-secondary">
              Section {activeSectionIndex + 1} Transcript
            </span>
          </div>

          <div className="space-y-3 font-serif text-sm leading-relaxed text-primary max-h-[420px] overflow-y-auto pr-2">
            {currentSection.dialogueTurns.map((turn, tIdx) => {
              const isTurnHighlighted = activeDialogueHighlightSec === turn.timestampSec
              return (
                <div
                  key={tIdx}
                  onClick={() => {
                    handleSeek(turn.timestampSec)
                    setActiveDialogueHighlightSec(turn.timestampSec)
                  }}
                  className={`p-2.5 rounded cursor-pointer transition-colors border ${
                    isTurnHighlighted
                      ? 'bg-warning-bg/40 border-warning-ink/40'
                      : 'border-transparent hover:bg-neutral'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-mono text-xs text-secondary mb-1">
                    <span className="text-accent-navy font-semibold hover:underline">
                      [{formatTime(turn.timestampSec)}]
                    </span>
                    <span className="font-bold text-primary">{turn.speaker}:</span>
                    {turn.targetQuestionId && (
                      <span className="bg-accent-navy text-surface-card text-[10px] px-1.5 py-0.2 rounded font-sans">
                        Answer Q{turn.targetQuestionId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm">{turn.text}</p>
                  {turn.distractorTrap && (
                    <div className="mt-1.5 p-2 bg-[#FEF3C7] border border-warning-ink/30 rounded text-[#92400E] text-xs font-sans">
                      <strong>⚠️ Distractor Trap:</strong> {turn.distractorTrap}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
