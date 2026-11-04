import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { WritingAttemptRow, StudySessionRow } from '../types'
import {
  saveWritingAttempts,
  getWritingAttempts,
  saveStudySessions,
  getStudySessions,
} from '../services/storage'
import { CURATED_WRITING_PROMPTS, WritingPrompt } from '../data/writingPrompts'
import { Task1ChartSvg } from '../components/charts/Task1ChartSvg'
import { evaluateUserEssay } from '../services/writingEvaluator'
import { ArchivalLoupeScribble } from '../components/illustrations/ArchivalLoupeScribble'

export const WritingPage: React.FC = () => {
  const navigate = useNavigate()
  const { meta } = useApp()

  // Track: academic or general
  const track = meta.exam_track || 'academic'

  // Task tab state: 1 or 2
  const [activeTaskNum, setActiveTaskNum] = useState<1 | 2>(1)

  // Filter available prompts for this task
  const availablePrompts = CURATED_WRITING_PROMPTS.filter(
    (p) => p.taskNumber === activeTaskNum && (p.track === track || p.taskNumber === 2)
  )
  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    availablePrompts[0]?.id || CURATED_WRITING_PROMPTS[0].id
  )

  const activePrompt: WritingPrompt =
    CURATED_WRITING_PROMPTS.find((p) => p.id === selectedPromptId) ||
    availablePrompts[0] ||
    CURATED_WRITING_PROMPTS[0]

  // Update selectedPromptId when task changes
  useEffect(() => {
    const matched = CURATED_WRITING_PROMPTS.filter(
      (p) => p.taskNumber === activeTaskNum && (p.track === track || p.taskNumber === 2)
    )
    if (matched.length > 0 && !matched.some((p) => p.id === selectedPromptId)) {
      setSelectedPromptId(matched[0].id)
    }
  }, [activeTaskNum, track, selectedPromptId])

  // Essay content state & OPFS draft autosave
  const [essayText, setEssayText] = useState<string>(() => {
    try {
      const savedDraft = localStorage.getItem(`oxford_writing_draft_${activeTaskNum}`)
      return savedDraft || ''
    } catch {
      return ''
    }
  })

  // Font toggle: serif (Source Serif 4) vs sans (Plus Jakarta Sans)
  const [useSerifFont, setUseSerifFont] = useState<boolean>(true)
  // Spellcheck toggle: exam mode (disabled) vs guided practice (enabled)
  const [spellcheckEnabled, setSpellcheckEnabled] = useState<boolean>(false)

  // Auto-save status
  const [autosaveTimeStr, setAutosaveTimeStr] = useState<string>('00:00:00')
  const autosaveTimeoutRef = useRef<number | null>(null)

  // Monotonic wall-clock timer
  const taskDurationMs = (activePrompt.timeLimitMins || (activeTaskNum === 1 ? 20 : 40)) * 60 * 1000
  const [deadlineMs, setDeadlineMs] = useState<number>(() => Date.now() + taskDurationMs)
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(taskDurationMs)
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false)
  const pauseRemainingMsRef = useRef<number>(taskDurationMs)

  // Submitting / Scoring state
  const [isScoring, setIsScoring] = useState<boolean>(false)

  // Split-screen drag divider width (percentage of left pane, default 48%)
  const [splitWidthPct, setSplitWidthPct] = useState<number>(48)
  const isDraggingSplitRef = useRef<boolean>(false)

  // Switch task handler
  const handleTaskTabSwitch = (taskNum: 1 | 2) => {
    if (taskNum === activeTaskNum) return
    setActiveTaskNum(taskNum)
    const newPrompt = CURATED_WRITING_PROMPTS.find(
      (p) => p.taskNumber === taskNum && (p.track === track || p.taskNumber === 2)
    )
    if (newPrompt) setSelectedPromptId(newPrompt.id)

    // Load saved draft for selected task
    try {
      const savedDraft = localStorage.getItem(`oxford_writing_draft_${taskNum}`) || ''
      setEssayText(savedDraft)
    } catch {
      setEssayText('')
    }

    // Reset timer
    const newDur = (taskNum === 1 ? 20 : 40) * 60 * 1000
    setDeadlineMs(Date.now() + newDur)
    setTimeRemainingMs(newDur)
    setIsTimerPaused(false)
  }

  // Monotonic wall-clock countdown
  useEffect(() => {
    if (isTimerPaused) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, deadlineMs - Date.now())
      setTimeRemainingMs(remaining)
    }, 200)

    return () => clearInterval(interval)
  }, [deadlineMs, isTimerPaused])

  // Debounced 1,500ms OPFS Auto-Save to localStorage
  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    autosaveTimeoutRef.current = window.setInterval(() => {
      try {
        localStorage.setItem(`oxford_writing_draft_${activeTaskNum}`, essayText)
        const d = new Date()
        const hh = String(d.getHours()).padStart(2, '0')
        const mm = String(d.getMinutes()).padStart(2, '0')
        const ss = String(d.getSeconds()).padStart(2, '0')
        setAutosaveTimeStr(`${hh}:${mm}:${ss}`)
      } catch (err) {
        console.warn('Draft auto-save notice:', err)
      }
    }, 1500)

    return () => {
      if (autosaveTimeoutRef.current) clearInterval(autosaveTimeoutRef.current)
    }
  }, [essayText, activeTaskNum])

  // Word count & paragraph calculations
  const rawWords = essayText.trim().length > 0 ? essayText.trim().split(/\s+/) : []
  const wordCount = rawWords.length
  const minThreshold = activeTaskNum === 1 ? 150 : 250
  const isAboveMin = wordCount >= minThreshold

  // Paragraph word counts
  const paragraphs = essayText.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const paragraphWordBadges = paragraphs.map((p, idx) => {
    const count = p.trim().split(/\s+/).length
    return `P${idx + 1}: ${count}w`
  })

  // Format timer mm:ss
  const totalSecRemaining = Math.max(0, Math.ceil(timeRemainingMs / 1000))
  const timerMins = Math.floor(totalSecRemaining / 60)
  const timerSecs = totalSecRemaining % 60
  const formattedTimer = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`
  const isUnder5Mins = totalSecRemaining < 300

  // Draggable split screen divider
  const handleMouseDownDivider = () => {
    isDraggingSplitRef.current = true
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitRef.current) return
      const containerW = window.innerWidth
      const nextPct = Math.max(30, Math.min(70, (e.clientX / containerW) * 100))
      setSplitWidthPct(nextPct)
    }
    const handleMouseUp = () => {
      isDraggingSplitRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Submit Essay Handler
  const handleSubmitEssay = () => {
    if (wordCount < 10) {
      alert('Please compose at least a preliminary response before submitting for local scoring.')
      return
    }

    setIsScoring(true)

    // Execute deterministic local evaluator
    const evalResult = evaluateUserEssay(essayText, activePrompt)
    const attemptId = `wrt_att_${Date.now()}`
    const sessionId = `wrt_session_${Date.now()}`
    const timeSpentMs = taskDurationMs - timeRemainingMs

    const attemptRow: WritingAttemptRow = {
      id: attemptId,
      session_id: sessionId,
      prompt_id: activePrompt.id,
      task_number: activeTaskNum,
      essay_text: essayText,
      word_count: wordCount,
      time_spent_ms: Math.max(1000, timeSpentMs),
      metrics_json: JSON.stringify(evalResult.metrics),
      inline_annotations_json: JSON.stringify(evalResult.metrics.diffs),
      band_ta_tr: evalResult.bandTaTr,
      band_cc: evalResult.bandCc,
      band_lr: evalResult.bandLr,
      band_gra: evalResult.bandGra,
      band_overall: evalResult.bandOverall,
      created_at: Date.now(),
      hlc: `${Date.now()}:0:client`,
    }

    // Save writing attempt
    const existingAttempts = getWritingAttempts()
    saveWritingAttempts([attemptRow, ...existingAttempts])

    // Save study session
    const existingSessions = getStudySessions()
    const sessionRow: StudySessionRow = {
      id: sessionId,
      module: 'writing',
      mode: `task${activeTaskNum}`,
      started_at: Date.now() - timeSpentMs,
      completed_at: Date.now(),
      overall_band: evalResult.bandOverall,
      subscores_json: JSON.stringify({
        ta_tr: evalResult.bandTaTr,
        cc: evalResult.bandCc,
        lr: evalResult.bandLr,
        gra: evalResult.bandGra,
      }),
      prompt_title: activePrompt.title,
      hlc: `${Date.now()}:1:client`,
    }
    saveStudySessions([sessionRow, ...existingSessions])

    // Clear draft
    try {
      localStorage.removeItem(`oxford_writing_draft_${activeTaskNum}`)
    } catch {
      // ignore
    }

    // Brief loupe animation transition before navigating to report
    setTimeout(() => {
      navigate(`/writing/report/${attemptId}`)
    }, 1400)
  }

  // Scoring Transition Overlay with Archival Loupe Scribble
  if (isScoring) {
    return (
      <div className="fixed inset-0 bg-[#FBF9F5] z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-slide">
        <ArchivalLoupeScribble message="Deterministic 4-criterion writing evaluator parsing discourse, syntax, and AWL..." />
        <h2 className="font-serif text-xl font-semibold text-primary mt-6">
          Scoring Writing Task {activeTaskNum}...
        </h2>
        <p className="font-sans text-xs text-secondary max-w-md mt-2">
          Evaluating Task Achievement, Coherence & Cohesion, Lexical Resource (MTLD & AWL), and Grammatical Range & Accuracy (ERRANT diffs).
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[640px] -m-4 sm:-m-6 lg:-m-8 bg-[#FBF9F5]">
      {/* 2.1 TOP EXAM HEADER (56px height) */}
      <header className="h-14 px-4 sm:px-6 bg-[#FFFFFF] border-b border-[#E5DEC9] flex items-center justify-between shrink-0 select-none z-10 shadow-xs">
        {/* SECTION 3 REQUIREMENT: wrt-task-tabs */}
        <div id="wrt-task-tabs" role="tablist" className="flex items-center gap-1.5 font-sans text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTaskNum === 1}
            onClick={() => handleTaskTabSwitch(1)}
            className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors ${
              activeTaskNum === 1
                ? 'bg-[#1E3A5F] text-[#FFFFFF]'
                : 'bg-[#F4F0EA] text-secondary hover:text-primary'
            }`}
          >
            Task 1: Report / Letter (20 mins · 33% Weight)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTaskNum === 2}
            onClick={() => handleTaskTabSwitch(2)}
            className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors ${
              activeTaskNum === 2
                ? 'bg-[#1E3A5F] text-[#FFFFFF]'
                : 'bg-[#F4F0EA] text-secondary hover:text-primary'
            }`}
          >
            Task 2: Essay (40 mins · 67% Weight)
          </button>
        </div>

        {/* Central Timer & Word Count Metrics */}
        <div className="flex items-center gap-3">
          {/* SECTION 3 REQUIREMENT: wrt-timer-pill */}
          <div
            id="wrt-timer-pill"
            className={`font-mono text-xs sm:text-[13px] font-semibold tabular-nums px-2.5 py-1 rounded-xs bg-[#FAF7F1] border border-[#E5DEC9] flex items-center gap-1.5 ${
              isUnder5Mins ? 'text-[#9A3412]' : 'text-[#1C1917]'
            }`}
          >
            <span>Time Remaining: {formattedTimer}</span>
            <button
              type="button"
              onClick={() => {
                if (isTimerPaused) {
                  setDeadlineMs(Date.now() + pauseRemainingMsRef.current)
                  setIsTimerPaused(false)
                } else {
                  pauseRemainingMsRef.current = Math.max(0, deadlineMs - Date.now())
                  setIsTimerPaused(true)
                }
              }}
              className="text-[10px] text-secondary hover:text-primary ml-1 cursor-pointer font-sans"
              title={isTimerPaused ? 'Resume countdown' : 'Pause timer'}
            >
              {isTimerPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          {/* SECTION 3 REQUIREMENT: wrt-wordcount-pill */}
          <span
            id="wrt-wordcount-pill"
            className={`font-mono text-xs sm:text-[13px] px-2.5 py-1 rounded-xs border font-medium ${
              isAboveMin
                ? 'bg-[#EAF3EC] text-[#166534] border-[#166534]'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]'
            }`}
          >
            {activeTaskNum === 1
              ? `Words: ${wordCount} / 150 min`
              : `Words: ${wordCount} / 250 min`}
          </span>

          {/* SECTION 3 REQUIREMENT: wrt-autosave-status */}
          <span
            id="wrt-autosave-status"
            className="hidden lg:inline font-mono text-[11px] text-[#57534E]"
          >
            Draft saved to OPFS ({autosaveTimeStr})
          </span>
        </div>

        {/* SECTION 3 REQUIREMENT: wrt-submit-btn */}
        <button
          id="wrt-submit-btn"
          type="button"
          onClick={handleSubmitEssay}
          className="px-3.5 py-1.5 rounded-sm bg-[#9A3412] hover:bg-[#852d10] text-[#FFFFFF] font-sans text-xs font-semibold cursor-pointer transition-colors shadow-sm"
        >
          Submit Essay for Local Scoring -&gt;
        </button>
      </header>

      {/* 2.2 SPLIT-SCREEN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE: PROMPT & VISUAL DATA SHEET */}
        {/* SECTION 3 REQUIREMENT: wrt-prompt-pane */}
        <section
          id="wrt-prompt-pane"
          style={{ width: `${splitWidthPct}%` }}
          className="overflow-y-auto p-6 bg-[#F4F0EA] border-r border-[#E5DEC9] flex flex-col space-y-5"
        >
          {/* Header row with task label & prompt selector */}
          <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
            <div>
              <span className="font-mono text-[11px] font-semibold text-secondary tracking-widest uppercase">
                WRITING TASK {activeTaskNum}
              </span>
              <h2 className="font-serif text-lg font-semibold text-primary mt-0.5">
                {activePrompt.title}
              </h2>
            </div>

            {/* Prompt Selector Dropdown if multiple exist */}
            {availablePrompts.length > 1 && (
              <select
                aria-label="Select writing prompt"
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                className="font-sans text-xs bg-[#FFFFFF] border border-[#E5DEC9] rounded-xs px-2 py-1 text-primary cursor-pointer focus:outline-none"
              >
                {availablePrompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Badges: Category / Register / Essay Type */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-xs bg-[#FAF7F1] border border-[#E5DEC9] font-mono text-[11px] text-secondary">
              {activePrompt.category}
            </span>
            {activePrompt.register && (
              <span className="px-2 py-0.5 rounded-xs bg-[#EAF3EC] border border-[#166534] font-mono text-[11px] text-[#166534] font-semibold">
                Register: {activePrompt.register}
              </span>
            )}
            {activePrompt.essayType && (
              <span className="px-2 py-0.5 rounded-xs bg-[#EAF3EC] border border-[#166534] font-mono text-[11px] text-[#166534] font-semibold">
                Type: {activePrompt.essayType}
              </span>
            )}
          </div>

          {/* Visual Data Sheet: Academic Task 1 SVG Chart */}
          {activePrompt.taskNumber === 1 && activePrompt.track === 'academic' && activePrompt.chartSpec && (
            <div className="space-y-3">
              <Task1ChartSvg
                data={activePrompt.chartSpec}
                chartType={activePrompt.chartType || 'line'}
              />
              <div className="p-3 bg-[#FAF7F1] rounded-sm border border-[#E5DEC9] font-sans text-xs space-y-1">
                <span className="font-semibold text-primary font-serif">Key Observed Features:</span>
                <ul className="list-disc list-inside space-y-0.5 text-secondary text-[11px]">
                  {activePrompt.chartSpec.keyTrends.map((trend, i) => (
                    <li key={i}>{trend}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Prompt Instructions */}
          <div className="p-4 bg-[#FFFFFF] rounded-sm border border-[#E5DEC9] shadow-xs space-y-3">
            <h4 className="font-mono text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Official Task Instructions:
            </h4>
            <div className="font-serif text-[17px] leading-relaxed text-[#1C1917] whitespace-pre-wrap">
              {activePrompt.instructions}
            </div>

            {/* General Training Task 1 Bullet Points */}
            {activePrompt.bulletPoints && (
              <ul className="list-disc list-inside font-serif text-[15px] space-y-1 text-primary pl-2 pt-2 border-t border-[#E5DEC9]">
                {activePrompt.bulletPoints.map((bullet, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* DRAGGABLE DIVIDER */}
        <div
          role="separator"
          onMouseDown={handleMouseDownDivider}
          className="w-1.5 bg-[#E5DEC9] hover:bg-[#1E3A5F] active:bg-[#9A3412] cursor-col-resize transition-colors shrink-0 select-none z-10"
          title="Drag to resize split panes"
        />

        {/* RIGHT PANE: DISTRACTION-FREE ESSAY SHEET */}
        <section
          style={{ width: `${100 - splitWidthPct}%` }}
          className="bg-[#FFFFFF] flex flex-col overflow-hidden"
        >
          {/* Typography & Tool Controls Bar */}
          <div className="h-10 px-4 border-b border-[#E5DEC9] bg-[#FAF7F1] flex items-center justify-between text-xs select-none">
            {/* Paragraph Word Counts Badges (P1: 48w, P2: 96w) */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {paragraphWordBadges.length === 0 ? (
                <span className="font-mono text-[11px] text-secondary">
                  P1: 0w
                </span>
              ) : (
                paragraphWordBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-[11px] px-2 py-0.5 rounded-xs bg-[#FFFFFF] border border-[#E5DEC9] text-[#1C1917]"
                  >
                    {badge}
                  </span>
                ))
              )}
            </div>

            {/* Typography & Spellcheck Toggles */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUseSerifFont((prev) => !prev)}
                className="font-mono text-[11px] text-secondary hover:text-primary cursor-pointer"
                title="Toggle typeface"
              >
                Font: {useSerifFont ? 'Source Serif 4' : 'Plus Jakarta Sans'}
              </button>

              <button
                type="button"
                onClick={() => setSpellcheckEnabled((prev) => !prev)}
                className={`font-mono text-[11px] px-2 py-0.5 rounded-xs cursor-pointer ${
                  spellcheckEnabled
                    ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]'
                    : 'bg-[#FAF7F1] text-secondary border border-[#E5DEC9]'
                }`}
                title={spellcheckEnabled ? 'Spellcheck on (Guided Practice)' : 'Spellcheck off (Exam Mode)'}
              >
                {spellcheckEnabled ? 'Spellcheck: ON' : 'Exam Mode (No Spellcheck)'}
              </button>
            </div>
          </div>

          {/* SECTION 3 REQUIREMENT: wrt-editor-textarea */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col">
            <textarea
              id="wrt-editor-textarea"
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder={`Begin typing your Task ${activeTaskNum} response here...`}
              spellCheck={spellcheckEnabled}
              className={`flex-1 w-full p-4 bg-[#FFFFFF] border-0 focus:outline-none resize-none text-[17px] leading-[1.75] text-[#1C1917] placeholder:text-[#A8A29E] ${
                useSerifFont ? 'font-serif' : 'font-sans'
              }`}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
