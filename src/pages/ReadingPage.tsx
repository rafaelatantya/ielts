import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  READING_PASSAGES,
  ReadingPassage,
  QuestionBase,
  calculateReadingBandScore,
} from '../data/readingPassages'
import {
  saveReceptiveAttempts,
  getReceptiveAttempts,
  saveStudySessions,
  getStudySessions,
  saveSrsCards,
  getSrsCards,
} from '../services/storage'
import { ReceptiveAttemptRow, StudySessionRow, SrsCardRow } from '../types'

interface HighlightItem {
  id: string
  passageIndex: number
  color: 'amber' | 'sage' | 'rose'
  text: string
  note?: string
  createdAt: number
}

interface FloatingToolbarPos {
  top: number
  left: number
  selectedText: string
}

export const ReadingPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { setDueCount } = useApp()

  // 1. Passage Tab Index: 0, 1, or 2
  const [activePassageIndex, setActivePassageIndex] = useState<0 | 1 | 2>(0)
  const currentPassage: ReadingPassage = READING_PASSAGES[activePassageIndex]

  // 2. Font Controls: '16px' | '17.5px' | '19px'
  const [fontSize, setFontSize] = useState<'16px' | '17.5px' | '19px'>('17.5px')

  // 3. Monotonic 60-Minute Countdown Timer
  const totalDurationMs = 60 * 60 * 1000 // 60 minutes
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(totalDurationMs)
  const [isTestSubmitted, setIsTestSubmitted] = useState<boolean>(false)
  const deadlineRef = useRef<number>(Date.now() + totalDurationMs)

  // 4. Answers dictionary (1..40)
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('oxford_reading_active_answers')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // 5. Flagged questions set
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('oxford_reading_flagged_questions')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Active question in focus (for Flag button & jump)
  const [activeQuestionId, setActiveQuestionId] = useState<number>(1)

  // 6. Highlights & Margin Notes (persisted to receptive_attempts.highlights_json and local storage)
  const [highlights, setHighlights] = useState<HighlightItem[]>(() => {
    try {
      const saved = localStorage.getItem('oxford_reading_highlights')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Floating selection toolbar state
  const [toolbarPos, setToolbarPos] = useState<FloatingToolbarPos | null>(null)
  const [activeNotePrompt, setActiveNotePrompt] = useState<string | null>(null)
  const [noteInputValue, setNoteInputValue] = useState<string>('')

  // 7. Results & Review Mode state
  const [completedAttemptId, setCompletedAttemptId] = useState<string | null>(
    searchParams.get('attemptId') || null
  )
  const [addedVocabCards, setAddedVocabCards] = useState<Record<string, boolean>>({})

  // Passage article DOM ref
  const articleRef = useRef<HTMLElement | null>(null)

  // Sync answers & flags to localStorage
  useEffect(() => {
    if (!isTestSubmitted) {
      localStorage.setItem('oxford_reading_active_answers', JSON.stringify(answers))
    }
  }, [answers, isTestSubmitted])

  useEffect(() => {
    localStorage.setItem('oxford_reading_flagged_questions', JSON.stringify(flaggedQuestions))
  }, [flaggedQuestions])

  useEffect(() => {
    localStorage.setItem('oxford_reading_highlights', JSON.stringify(highlights))
  }, [highlights])

  // Timer loop
  useEffect(() => {
    if (isTestSubmitted) return

    const timer = setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now())
      setTimeRemainingMs(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        handleSubmitTest()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isTestSubmitted])

  // Timer formatting: {mm:ss}
  const formatTimer = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Answer handler
  const handleSelectAnswer = (qId: number, val: string) => {
    if (isTestSubmitted) return
    setAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }))
  }

  // Word count helper for summary completion live validation
  const getWordCount = (val: string): number => {
    const trimmed = val.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).filter(Boolean).length
  }

  // Toggle flag
  const toggleFlag = (qId: number) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }))
  }

  // Text selection listener for Floating Highlighter Popover
  const handlePassageMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      setToolbarPos(null)
      return
    }

    const text = sel.toString().trim()
    if (text.length < 2) {
      setToolbarPos(null)
      return
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      setToolbarPos(null)
      return
    }

    setToolbarPos({
      top: rect.top - 48,
      left: Math.max(16, rect.left + rect.width / 2 - 130),
      selectedText: text,
    })
  }

  // Apply highlight
  const applyHighlight = (color: 'amber' | 'sage' | 'rose') => {
    if (!toolbarPos || !toolbarPos.selectedText) return
    const newHighlight: HighlightItem = {
      id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      passageIndex: activePassageIndex,
      color,
      text: toolbarPos.selectedText,
      createdAt: Date.now(),
    }
    setHighlights((prev) => [...prev, newHighlight])
    setToolbarPos(null)
    window.getSelection()?.removeAllRanges()
  }

  // Add margin note
  const startAddNote = () => {
    if (!toolbarPos) return
    setActiveNotePrompt(toolbarPos.selectedText)
    setNoteInputValue('')
    setToolbarPos(null)
  }

  const saveMarginNote = () => {
    if (!activeNotePrompt || !noteInputValue.trim()) {
      setActiveNotePrompt(null)
      return
    }
    const newHighlight: HighlightItem = {
      id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      passageIndex: activePassageIndex,
      color: 'amber',
      text: activeNotePrompt,
      note: noteInputValue.trim(),
      createdAt: Date.now(),
    }
    setHighlights((prev) => [...prev, newHighlight])
    setActiveNotePrompt(null)
    setNoteInputValue('')
    window.getSelection()?.removeAllRanges()
  }

  // Clear highlights in current passage or selected text
  const clearHighlights = () => {
    if (toolbarPos && toolbarPos.selectedText) {
      setHighlights((prev) =>
        prev.filter((h) => !h.text.includes(toolbarPos.selectedText) && !toolbarPos.selectedText.includes(h.text))
      )
    } else {
      setHighlights((prev) => prev.filter((h) => h.passageIndex !== activePassageIndex))
    }
    setToolbarPos(null)
    window.getSelection()?.removeAllRanges()
  }

  // Grade test deterministically and save to receptive_attempts
  const handleSubmitTest = () => {
    if (isTestSubmitted) return

    let rawScore = 0
    const allQuestions = READING_PASSAGES.flatMap((p) => p.questions)

    allQuestions.forEach((q) => {
      const userAns = (answers[q.id] || '').trim().toUpperCase()
      const correctAns = q.correctAnswer.trim().toUpperCase()
      if (userAns === correctAns) {
        rawScore += 1
      }
    })

    const band = calculateReadingBandScore(rawScore)
    const now = Date.now()
    const attemptId = `rcp-rdg-${now}`
    const sessionId = `sess-rdg-${now}`

    const newReceptiveAttempt: ReceptiveAttemptRow = {
      id: attemptId,
      session_id: sessionId,
      prompt_id: 'rdg-cambridge-standard-01',
      module: 'reading',
      raw_score: rawScore,
      total_questions: 40,
      band_score: band,
      answers_json: JSON.stringify(answers),
      highlights_json: JSON.stringify(highlights),
      created_at: now,
      hlc: `${now}:1:node_reading`,
    }

    const newSession: StudySessionRow = {
      id: sessionId,
      module: 'reading',
      mode: 'official_split_exam',
      started_at: now - (totalDurationMs - timeRemainingMs),
      completed_at: now,
      overall_band: band,
      prompt_title: 'Full Academic Reading Test (Passages 1–3)',
      hlc: `${now}:1:node_reading`,
    }

    saveReceptiveAttempts([...getReceptiveAttempts(), newReceptiveAttempt])
    saveStudySessions([...getStudySessions(), newSession])

    setCompletedAttemptId(attemptId)
    setIsTestSubmitted(true)
  }

  // Navigate & Jump to evidence span
  const jumpToEvidence = (qId: number, paraLetter: string) => {
    const targetPassageIndex = READING_PASSAGES.findIndex((p) =>
      p.questions.some((q) => q.id === qId)
    )
    if (targetPassageIndex !== -1 && targetPassageIndex !== activePassageIndex) {
      setActivePassageIndex(targetPassageIndex as 0 | 1 | 2)
    }

    setTimeout(() => {
      const spanElem = document.querySelector(`[data-evidence-span="q${qId}"]`)
      if (spanElem) {
        spanElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        spanElem.classList.add('evidence-flash')
        setTimeout(() => {
          spanElem.classList.remove('evidence-flash')
        }, 3000)
      } else {
        const paraElem = document.getElementById(`para-${paraLetter}`)
        if (paraElem) {
          paraElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }, 100)
  }

  // 1-Click Save Unknown Vocabulary to FSRS Deck
  const handleSaveVocabToFsrs = (vocab: { word: string; ipa: string; cefr: string; definition: string }) => {
    const existingCards = getSrsCards()
    const cardId = `srs-rdg-${vocab.word.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

    if (existingCards.some((c) => c.id === cardId)) {
      setAddedVocabCards((prev) => ({ ...prev, [vocab.word]: true }))
      return
    }

    const newCard: SrsCardRow = {
      id: cardId,
      source_attempt_id: completedAttemptId || 'rdg-session',
      card_type: 'collocation',
      front_text: vocab.word,
      back_text: `${vocab.definition} [${vocab.cefr}]`,
      context_sentence: `Passage Academic Vocabulary: ${vocab.word} (${vocab.ipa})`,
      ipa_phonetic: vocab.ipa,
      due_at: Date.now(),
      stability: 1.0,
      difficulty: 5.0,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review_at: null,
      hlc: `${Date.now()}:1:node_reading_fsrs`,
    }

    const updated = [...existingCards, newCard]
    saveSrsCards(updated)
    setDueCount(updated.filter((c) => c.due_at <= Date.now()).length)
    setAddedVocabCards((prev) => ({ ...prev, [vocab.word]: true }))
  }

  // Compute stats if submitted
  const allQuestionsList = READING_PASSAGES.flatMap((p) => p.questions)
  const totalCorrect = allQuestionsList.filter(
    (q) => (answers[q.id] || '').trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()
  ).length
  const computedBand = calculateReadingBandScore(totalCorrect)

  return (
    <div className="space-y-4">
      <style>{`
        .evidence-flash {
          outline: 2px solid #9A3412 !important;
          background-color: #FEF3C7 !important;
          transition: all 400ms ease;
          border-radius: 4px;
          padding: 2px 4px;
        }
      `}</style>

      {/* 2.1 Top Reading Header (56px height) */}
      <header className="h-[56px] bg-surface-card border border-border-subtle rounded-md px-4 flex items-center justify-between shadow-paper">
        {/* rdg-passage-tabs */}
        <div
          id="rdg-passage-tabs"
          role="tablist"
          aria-label="Passage Switcher"
          className="flex items-center space-x-1.5"
        >
          {READING_PASSAGES.map((passage, idx) => {
            const isActive = activePassageIndex === idx
            return (
              <button
                key={passage.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActivePassageIndex(idx as 0 | 1 | 2)}
                className={`px-3 py-1.5 rounded-sm text-xs font-sans font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent-navy text-surface-card'
                    : 'bg-surface-elevated text-secondary hover:text-primary hover:bg-neutral'
                }`}
              >
                Passage {idx + 1} ({passage.readingRange})
              </button>
            )
          })}
        </div>

        {/* Center: Font controls */}
        <div id="rdg-font-controls" className="flex items-center space-x-1">
          <span className="text-[11px] font-sans text-secondary mr-1">Passage Size:</span>
          {(['16px', '17.5px', '19px'] as const).map((sz, i) => (
            <button
              key={sz}
              onClick={() => setFontSize(sz)}
              className={`px-2 py-0.5 rounded-sm text-xs font-sans transition-colors ${
                fontSize === sz
                  ? 'bg-accent-navy text-surface-card font-semibold'
                  : 'bg-surface-elevated text-secondary hover:text-primary border border-border-subtle'
              }`}
            >
              {i === 0 ? 'A-' : i === 1 ? 'A' : 'A+'}
            </button>
          ))}
        </div>

        {/* Right: Monotonic Countdown Timer + Submit Button */}
        <div className="flex items-center space-x-3">
          <div
            id="rdg-timer-pill"
            className="font-mono text-sm font-semibold text-primary bg-surface-elevated px-3 py-1 rounded-sm border border-border-subtle tabular-nums flex items-center space-x-1.5"
          >
            <span>Time Remaining:</span>
            <span
              className={
                timeRemainingMs < 5 * 60 * 1000 ? 'text-danger-ink font-bold animate-pulse' : ''
              }
            >
              {formatTimer(timeRemainingMs)}
            </span>
          </div>

          {!isTestSubmitted ? (
            <button
              id="rdg-submit-btn"
              onClick={handleSubmitTest}
              className="bg-tertiary hover:bg-tertiary/90 text-surface-card px-4 py-1.5 rounded-sm text-xs font-sans font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Submit Reading Test -&gt;
            </button>
          ) : (
            <span className="text-xs font-sans font-semibold text-success-ink bg-success-bg px-3 py-1.5 rounded-sm border border-success-ink/20">
              Exam Graded & Reviewed
            </span>
          )}
        </div>
      </header>

      {/* Floating Selection Highlighter Popover */}
      {toolbarPos && (
        <div
          id="rdg-highlight-toolbar"
          role="toolbar"
          aria-label="Highlighter Toolbar"
          style={{
            position: 'fixed',
            top: `${toolbarPos.top}px`,
            left: `${toolbarPos.left}px`,
            zIndex: 50,
          }}
          className="flex items-center space-x-1.5 bg-surface-card border border-border-strong rounded-full px-3 py-1.5 shadow-float animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => applyHighlight('amber')}
            title="Amber Highlight"
            className="w-5 h-5 rounded-full bg-[#FEF3C7] border border-warning-ink/40 hover:scale-110 transition-transform"
          >
            <span className="sr-only">Amber</span>
          </button>
          <button
            onClick={() => applyHighlight('sage')}
            title="Sage Highlight"
            className="w-5 h-5 rounded-full bg-[#EAF3EC] border border-success-ink/40 hover:scale-110 transition-transform"
          >
            <span className="sr-only">Sage</span>
          </button>
          <button
            onClick={() => applyHighlight('rose')}
            title="Rose Highlight"
            className="w-5 h-5 rounded-full bg-[#FEE2E2] border border-danger-ink/40 hover:scale-110 transition-transform"
          >
            <span className="sr-only">Rose</span>
          </button>
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <button
            onClick={startAddNote}
            className="text-[11px] font-sans font-medium text-primary hover:text-accent-navy px-1.5 py-0.5 rounded hover:bg-surface-elevated"
          >
            Add Note
          </button>
          <button
            onClick={clearHighlights}
            className="text-[11px] font-sans text-secondary hover:text-danger-ink px-1.5 py-0.5 rounded hover:bg-surface-elevated"
          >
            Clear
          </button>
        </div>
      )}

      {/* Note Input Dialog Modal */}
      {activeNotePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-xs">
          <div className="bg-surface-card p-4 rounded-md border border-border-strong shadow-float max-w-sm w-full space-y-3">
            <div className="font-serif text-sm font-semibold text-primary">
              Margin Note for Highlight
            </div>
            <div className="p-2 bg-surface-elevated rounded text-xs italic text-secondary border border-border-subtle line-clamp-2">
              &quot;{activeNotePrompt}&quot;
            </div>
            <textarea
              value={noteInputValue}
              onChange={(e) => setNoteInputValue(e.target.value)}
              placeholder="Write your margin reflection or synthesis note..."
              rows={3}
              className="w-full text-xs font-sans p-2 border border-border-subtle rounded focus:outline-none focus:border-accent-navy bg-neutral"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setActiveNotePrompt(null)}
                className="px-3 py-1 text-xs font-sans text-secondary hover:text-primary rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveMarginNote}
                className="px-3 py-1 text-xs font-sans font-semibold text-surface-card bg-accent-navy hover:bg-accent-navy/90 rounded"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Test Band Summary Score Banner (if submitted) */}
      {isTestSubmitted && (
        <div className="bg-surface-card border border-success-ink/30 p-4 rounded-md shadow-paper flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-success-bg border border-success-ink/40 flex items-center justify-center font-serif text-lg font-bold text-success-ink">
              {computedBand.toFixed(1)}
            </div>
            <div>
              <div className="font-serif text-base font-semibold text-primary">
                {totalCorrect} / 40 Correct -&gt; Band {computedBand.toFixed(1)} (Academic Reading)
              </div>
              <p className="font-sans text-xs text-secondary mt-0.5">
                Full deterministic grade saved to receptive_attempts. Review rationales and jump to passage evidence below.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-sans text-secondary">
              Highlights &amp; Margin Notes stored persistently in OPFS
            </span>
          </div>
        </div>
      )}

      {/* 2.2 Resizable Two-Pane Reading Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[550px]">
        {/* Left Pane — Literary Serif Passage Reader */}
        <section
          className="lg:col-span-6 bg-neutral border border-border-subtle rounded-md p-6 overflow-y-auto relative shadow-paper select-text"
          onMouseUp={handlePassageMouseUp}
          ref={articleRef}
        >
          {/* rdg-passage-article */}
          <article
            id="rdg-passage-article"
            className="mx-auto"
            style={{
              maxWidth: '66ch',
              fontSize: fontSize,
              lineHeight: 1.78,
            }}
          >
            <div className="border-b border-border-subtle pb-4 mb-6">
              <span className="text-[11px] font-mono uppercase tracking-wider text-tertiary font-semibold">
                Reading Passage {currentPassage.passageIndex + 1}
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary mt-1 leading-snug">
                {currentPassage.title}
              </h2>
              <p className="font-sans text-xs text-secondary mt-1.5 leading-relaxed">
                {currentPassage.subtitle}
              </p>
            </div>

            {/* Paragraphs with Letter Badges and Evidence Spans */}
            <div className="space-y-6 text-primary font-serif">
              {currentPassage.paragraphs.map((p) => (
                <div key={p.letter} id={`para-${p.letter}`} className="relative pl-7 group">
                  {/* Paragraph Letter Badge in JetBrains Mono */}
                  <span
                    className="absolute left-0 top-1 w-5 h-5 rounded-xs bg-surface-elevated border border-border-strong/60 text-secondary font-mono text-[11px] font-semibold flex items-center justify-center select-none"
                    title={`Paragraph ${p.letter}`}
                  >
                    {p.letter}
                  </span>

                  <p className="leading-relaxed">
                    {/* Render paragraph segments with evidence spans attached */}
                    {renderParagraphWithEvidence(p, currentPassage.questions)}
                  </p>
                </div>
              ))}
            </div>

            {/* Persistent Highlights & Margin Notes Drawer in Left Pane */}
            {highlights.filter((h) => h.passageIndex === activePassageIndex).length > 0 && (
              <div className="mt-8 pt-4 border-t border-border-subtle text-xs font-sans">
                <div className="font-semibold text-secondary mb-2 flex items-center justify-between">
                  <span>Passage Annotations ({highlights.filter((h) => h.passageIndex === activePassageIndex).length})</span>
                  <button
                    onClick={clearHighlights}
                    className="text-[11px] text-danger-ink hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1.5">
                  {highlights
                    .filter((h) => h.passageIndex === activePassageIndex)
                    .map((h) => (
                      <div
                        key={h.id}
                        className="p-2 rounded bg-surface-card border border-border-subtle text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full inline-block ${
                              h.color === 'amber'
                                ? 'bg-amber-400'
                                : h.color === 'sage'
                                ? 'bg-emerald-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          <span className="italic text-primary line-clamp-1">&quot;{h.text}&quot;</span>
                        </div>
                        {h.note && (
                          <div className="mt-1 text-secondary font-sans pl-4 border-l-2 border-accent-navy">
                            {h.note}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </article>
        </section>

        {/* Right Pane — Question Sheet */}
        <section
          id="rdg-question-pane"
          className="lg:col-span-6 bg-surface-card border border-border-subtle rounded-md p-6 overflow-y-auto shadow-paper flex flex-col space-y-6"
        >
          {/* Header Instruction Banner */}
          <div className="bg-surface-elevated p-3.5 rounded border border-border-subtle space-y-1">
            <div className="font-serif text-sm font-semibold text-primary">
              Questions {currentPassage.questions[0]?.id}–{currentPassage.questions[currentPassage.questions.length - 1]?.id}
            </div>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Answer the questions below based on Reading Passage {activePassageIndex + 1}. All answers are evaluated according to official Cambridge assessment standards.
            </p>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {currentPassage.questions.map((q) => {
              const currentAns = answers[q.id] || ''
              const isFlagged = !!flaggedQuestions[q.id]
              const isCorrect = isTestSubmitted && currentAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()
              const wordCount = getWordCount(currentAns)
              const isOverLimit = q.type === 'summary_completion' && wordCount > 1

              return (
                <div
                  key={q.id}
                  id={`question-box-${q.id}`}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`p-4 rounded-md border transition-all ${
                    activeQuestionId === q.id
                      ? 'border-accent-navy bg-neutral/30'
                      : 'border-border-subtle bg-surface-card'
                  } ${
                    isTestSubmitted
                      ? isCorrect
                        ? 'border-l-4 border-l-success-ink bg-success-bg/10'
                        : 'border-l-4 border-l-danger-ink bg-danger-bg/10'
                      : ''
                  }`}
                >
                  {/* Question header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-accent-navy bg-surface-elevated px-2 py-0.5 rounded border border-border-subtle">
                        Q{q.id}
                      </span>
                      <span className="font-sans text-[11px] uppercase tracking-wider text-secondary">
                        {q.type === 'tfng'
                          ? 'True / False / Not Given'
                          : q.type === 'matching_headings'
                          ? 'Matching Headings'
                          : q.type === 'multiple_choice'
                          ? 'Multiple Choice'
                          : 'Summary Completion'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFlag(q.id)
                      }}
                      title={isFlagged ? 'Unflag question' : 'Flag for review'}
                      className={`text-xs px-2 py-0.5 rounded flex items-center space-x-1 transition-colors ${
                        isFlagged
                          ? 'bg-warning-bg text-warning-ink font-semibold border border-warning-ink/30'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      <span>{isFlagged ? '🚩 Flagged' : 'Flag'}</span>
                    </button>
                  </div>

                  {/* Question Prompt */}
                  <p className="font-sans text-sm font-medium text-primary mb-3 leading-relaxed">
                    {q.prompt}
                  </p>

                  {/* Question Input Forms */}
                  {/* 1. True / False / Not Given */}
                  {q.type === 'tfng' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => {
                        const isSelected = currentAns === opt
                        return (
                          <button
                            key={opt}
                            disabled={isTestSubmitted}
                            onClick={() => handleSelectAnswer(q.id, opt)}
                            className={`px-3 py-1.5 rounded text-xs font-sans font-medium border transition-colors ${
                              isSelected
                                ? 'bg-accent-navy text-surface-card border-accent-navy'
                                : 'bg-surface-elevated text-secondary hover:text-primary border-border-subtle hover:bg-neutral'
                            } ${isTestSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 2. Matching Headings */}
                  {q.type === 'matching_headings' && (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-sans text-secondary block">
                        Select Roman numeral heading for {q.targetParagraph}:
                      </label>
                      <select
                        value={currentAns}
                        disabled={isTestSubmitted}
                        onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                        className="w-full text-xs font-sans p-2 border border-border-subtle rounded bg-neutral focus:outline-none focus:border-accent-navy text-primary"
                      >
                        <option value="">-- Choose Heading --</option>
                        {q.headingsList?.map((h) => (
                          <option key={h.roman} value={h.roman}>
                            {h.roman}. {h.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3. Multiple Choice */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-1.5 pt-1">
                      {q.options?.map((opt) => {
                        const letter = opt.substring(0, 1)
                        const isSelected = currentAns === letter
                        return (
                          <label
                            key={opt}
                            className={`flex items-start p-2 rounded border text-xs font-sans cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-accent-navy/5 border-accent-navy text-primary font-medium'
                                : 'border-border-subtle text-secondary hover:bg-neutral'
                            } ${isTestSubmitted ? 'cursor-default' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`mc-q-${q.id}`}
                              value={letter}
                              checked={isSelected}
                              disabled={isTestSubmitted}
                              onChange={() => handleSelectAnswer(q.id, letter)}
                              className="mt-0.5 mr-2"
                            />
                            <span>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {/* 4. Summary Completion with live strict ONE WORD ONLY validator */}
                  {q.type === 'summary_completion' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={currentAns}
                          disabled={isTestSubmitted}
                          onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                          placeholder="Type ONE WORD ONLY..."
                          className={`w-full max-w-sm text-xs font-sans p-2 border rounded focus:outline-none uppercase ${
                            isOverLimit
                              ? 'border-danger-ink bg-danger-bg/20'
                              : 'border-border-subtle bg-neutral focus:border-accent-navy'
                          }`}
                        />
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${
                            isOverLimit
                              ? 'bg-danger-bg text-danger-ink border-danger-ink font-semibold'
                              : 'bg-surface-elevated text-secondary border-border-subtle'
                          }`}
                        >
                          {isOverLimit ? '⚠️ STRICT: ONE WORD ONLY' : 'ONE WORD ONLY'}
                        </span>
                      </div>
                      {isOverLimit && (
                        <p className="text-[11px] font-sans text-danger-ink">
                          Warning: You have entered {wordCount} words. Official IELTS rules penalize answers with more than one word.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section 2.4 & Section 3: rdg-evidence-jump-btn & Review Mode Rationale */}
                  {/* Forbidden Elements Rule: DO NOT show before user clicks Submit Reading Test -> */}
                  {isTestSubmitted && (
                    <div className="mt-4 pt-3 border-t border-border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-sans font-semibold ${
                            isCorrect ? 'text-success-ink' : 'text-danger-ink'
                          }`}
                        >
                          {isCorrect
                            ? '✓ Correct'
                            : `✕ Incorrect — Correct Answer: ${q.correctAnswer}`}
                        </span>

                        {/* rdg-evidence-jump-btn */}
                        <button
                          id="rdg-evidence-jump-btn"
                          onClick={() => jumpToEvidence(q.id, q.evidenceParagraph)}
                          className="bg-accent-navy hover:bg-accent-navy/90 text-surface-card px-3 py-1 rounded-sm text-xs font-sans font-semibold transition-colors shadow-xs cursor-pointer"
                        >
                          Jump to Passage Evidence (Paragraph {q.evidenceParagraph}) -&gt;
                        </button>
                      </div>

                      {/* Explanation & FALSE vs NOT GIVEN Rationale */}
                      <div className="p-3 bg-surface-elevated rounded border border-border-subtle text-xs font-sans text-secondary space-y-1.5">
                        <p className="text-primary font-medium">{q.explanation}</p>
                        {q.falseVsNotGivenRationale && (
                          <div className="p-2 bg-warning-bg/40 border border-warning-ink/30 rounded text-warning-ink text-[11px] leading-relaxed">
                            <strong>FALSE vs NOT GIVEN Distinction:</strong>{' '}
                            {q.falseVsNotGivenRationale}
                          </div>
                        )}
                        <div className="text-[11px] text-secondary/80 italic">
                          &quot;{q.evidenceText}&quot;
                        </div>

                        {/* 1-Click Save Unknown Vocabulary to FSRS Deck */}
                        {q.academicVocab && (
                          <div className="pt-2 flex items-center justify-between border-t border-border-subtle mt-2">
                            <span className="text-[11px] font-mono text-tertiary">
                              Academic Vocab: <strong>{q.academicVocab.word}</strong> ({q.academicVocab.ipa}) — {q.academicVocab.cefr}
                            </span>
                            <button
                              onClick={() => handleSaveVocabToFsrs(q.academicVocab!)}
                              disabled={addedVocabCards[q.academicVocab.word]}
                              className={`text-[11px] font-sans font-semibold px-2.5 py-1 rounded border transition-colors ${
                                addedVocabCards[q.academicVocab.word]
                                  ? 'bg-success-bg text-success-ink border-success-ink/30'
                                  : 'bg-surface-card text-accent-navy border-accent-navy hover:bg-accent-navy hover:text-surface-card'
                              }`}
                            >
                              {addedVocabCards[q.academicVocab.word]
                                ? '✓ Added to FSRS'
                                : '+ Save Unknown Passage Vocabulary to FSRS Deck'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* 2.3 Bottom 40-Question Palette Bar (52px fixed dock) */}
      <nav
        id="rdg-bottom-palette"
        aria-label="Question Navigation Palette"
        className="h-[52px] bg-surface-card border border-border-subtle rounded-md px-3 flex items-center justify-between shadow-paper"
      >
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-[calc(100%-140px)]">
          {Array.from({ length: 40 }, (_, i) => i + 1).map((qNum) => {
            const hasAns = !!answers[qNum]?.trim()
            const isFlag = !!flaggedQuestions[qNum]
            const targetPassageIdx = qNum <= 13 ? 0 : qNum <= 26 ? 1 : 2
            const isCurrentActive = activeQuestionId === qNum

            // Post-Test Review Mode colors: Correct (#166534 green) vs. Incorrect (#991B1B crimson)
            let buttonBgClass = 'bg-surface-card text-primary border-border-subtle hover:bg-neutral'
            if (isTestSubmitted) {
              const matchedQ = allQuestionsList.find((q) => q.id === qNum)
              const userAns = (answers[qNum] || '').trim().toUpperCase()
              const isRight = matchedQ && userAns === matchedQ.correctAnswer.trim().toUpperCase()
              buttonBgClass = isRight
                ? 'bg-success-ink text-surface-card border-success-ink font-semibold'
                : 'bg-danger-ink text-surface-card border-danger-ink font-semibold'
            } else if (hasAns) {
              buttonBgClass = 'bg-accent-navy text-surface-card border-accent-navy font-semibold'
            }

            return (
              <button
                key={qNum}
                onClick={() => {
                  setActiveQuestionId(qNum)
                  if (activePassageIndex !== targetPassageIdx) {
                    setActivePassageIndex(targetPassageIdx as 0 | 1 | 2)
                  }
                  setTimeout(() => {
                    const el = document.getElementById(`question-box-${qNum}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 50)
                }}
                className={`relative w-7 h-7 shrink-0 rounded-xs font-mono text-xs flex items-center justify-center border transition-all ${buttonBgClass} ${
                  isCurrentActive ? 'ring-2 ring-accent-navy ring-offset-1' : ''
                }`}
                title={`Question ${qNum}${hasAns ? ' (Answered)' : ''}${isFlag ? ' (Flagged)' : ''}`}
              >
                <span>{qNum}</span>
                {/* Flagged Amber corner dot */}
                {isFlag && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* Flag Active Question Quick Action */}
        <div className="flex items-center space-x-2 pl-2 border-l border-border-subtle">
          <button
            onClick={() => toggleFlag(activeQuestionId)}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs font-semibold border transition-colors ${
              flaggedQuestions[activeQuestionId]
                ? 'bg-warning-bg text-warning-ink border-warning-ink/40'
                : 'bg-surface-elevated text-secondary hover:text-primary border-border-subtle'
            }`}
          >
            [Flag Q{activeQuestionId}]
          </button>
        </div>
      </nav>
    </div>
  )
}

// Helper to render paragraph with evidence span attributes and highlight wrappers
function renderParagraphWithEvidence(
  paragraph: { letter: string; content: string; evidenceQuestions: number[] },
  questions: QuestionBase[]
) {
  // Extract evidence questions that belong to this paragraph
  const evQuestions = questions.filter((q) => paragraph.evidenceQuestions.includes(q.id))

  if (evQuestions.length === 0) {
    return paragraph.content
  }

  // Find evidence substrings in paragraph content
  const content = paragraph.content
  const nodes: React.ReactNode[] = []
  let currentIndex = 0

  // Sort matching evidence by occurrence in content
  const matches = evQuestions
    .map((q) => {
      const idx = content.indexOf(q.evidenceText)
      return { q, idx }
    })
    .filter((m) => m.idx !== -1)
    .sort((a, b) => a.idx - b.idx)

  if (matches.length === 0) {
    // If exact sentence not found as whole substring, wrap the entire paragraph with evidence-span of the first question
    return (
      <span data-evidence-span={`q${evQuestions[0].id}`}>
        {paragraph.content}
      </span>
    )
  }

  matches.forEach(({ q, idx }) => {
    if (idx > currentIndex) {
      nodes.push(content.substring(currentIndex, idx))
    }
    nodes.push(
      <span
        key={q.id}
        data-evidence-span={`q${q.id}`}
        className="rounded-xs transition-colors"
      >
        {q.evidenceText}
      </span>
    )
    currentIndex = idx + q.evidenceText.length
  })

  if (currentIndex < content.length) {
    nodes.push(content.substring(currentIndex))
  }

  return nodes
}
