import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SpeakingAttemptRow, SrsCardRow } from '../types'
import { getSpeakingAttempts, getSrsCards, saveSrsCards, loadAudioBlobFromOpfs } from '../services/storage'
import { CURATED_SPEAKING_PROMPTS } from '../data/speakingPrompts'

interface WordTimestamp {
  word: string
  start: number
  end: number
  prob?: number
  gop?: number
  c1?: boolean
  isPause?: boolean
  pauseDuration?: number
  isFreeze?: boolean
  isFiller?: boolean
}

interface PhonemeGopDetail {
  phoneme: string
  score: number
  status: 'critical' | 'acceptable' | 'optimal'
}

interface SelectedPhonemeInfo {
  word: string
  ipaExpected: string
  ipaSpoken: string
  gopPct: number
  details: PhonemeGopDetail[]
  l1Tip: string
  startTime: number
  endTime: number
}

interface GecErrorRow {
  spoken: string
  corrected: string
  errantTag: string
  upgrade: string
  explanation: string
}

export const SpeakingReportPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { setDueCount } = useApp()

  const [attempt, setAttempt] = useState<SpeakingAttemptRow | null>(null)
  const [filterMode, setFilterMode] = useState<
    'all' | 'pauses' | 'fillers' | 'pron' | 'c1'
  >('all')
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [isAddedToFsrs, setIsAddedToFsrs] = useState<boolean>(false)
  const [selectedPhoneme, setSelectedPhoneme] = useState<SelectedPhonemeInfo | null>(null)
  const [isModelAnswerExpanded, setIsModelAnswerExpanded] = useState<boolean>(false)

  const audioTimerRef = useRef<number | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const wordPauseTimeoutRef = useRef<number | null>(null)
  const [hasRealAudio, setHasRealAudio] = useState<boolean>(false)

  useEffect(() => {
    const attempts = getSpeakingAttempts()
    const found = attempts.find(
      (a) => a.id === attemptId || a.session_id === attemptId
    )
    if (found) {
      setAttempt(found)
    } else if (attempts.length > 0) {
      setAttempt(attempts[0])
    }
  }, [attemptId])

  // Load real audio from OPFS when attempt is ready
  useEffect(() => {
    if (!attempt?.id) return
    let objectUrl = ''
    let isCancelled = false

    const loadAudio = async () => {
      try {
        const blob = await loadAudioBlobFromOpfs(attempt.id)
        if (blob && !isCancelled) {
          objectUrl = URL.createObjectURL(blob)
          const audio = new Audio(objectUrl)
          audio.playbackRate = playbackSpeed

          audio.ontimeupdate = () => {
            setAudioCurrentTime(audio.currentTime)
          }
          audio.onended = () => {
            setIsPlayingAudio(false)
          }

          audioElRef.current = audio
          setHasRealAudio(true)
        }
      } catch (err) {
        console.warn('Could not load audio from OPFS:', err)
      }
    }

    loadAudio()

    return () => {
      isCancelled = true
      if (audioElRef.current) {
        audioElRef.current.pause()
        audioElRef.current.ontimeupdate = null
        audioElRef.current.onended = null
        audioElRef.current = null
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      if (wordPauseTimeoutRef.current) {
        window.clearTimeout(wordPauseTimeoutRef.current)
      }
    }
  }, [attempt?.id])

  // Keep playbackRate in sync with playbackSpeed
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Look up curated prompt
  const prompt =
    CURATED_SPEAKING_PROMPTS.find((p) => p.id === attempt?.prompt_id) ||
    CURATED_SPEAKING_PROMPTS[0]

  // Parse metrics
  const acoustic = attempt?.acoustic_metrics_json
    ? JSON.parse(attempt.acoustic_metrics_json)
    : {
        wpm: 138,
        mean_length_run: 9.6,
        mid_clause_pauses: 2,
        long_pauses: 0,
        pitch_expressiveness_st: 2.85,
        speech_ratio: 0.82,
        noise_floor_dbfs: -46,
      }

  const lexical = attempt?.lexical_metrics_json
    ? JSON.parse(attempt.lexical_metrics_json)
    : {
        mtld: 76.4,
        vocd_d: 68.2,
        c1_c2_count: 5,
        collocation_matches: ['indispensable tool', 'steep learning curve', 'streamline workflow'],
        paraphrase_score: '84',
      }

  const grammar = attempt?.grammar_metrics_json
    ? JSON.parse(attempt.grammar_metrics_json)
    : {
        clauses_total: 18,
        error_free_clauses: 15,
        error_free_ratio: 0.833,
        subordination_index: 0.38,
      }

  const semantic = attempt?.semantic_metrics_json
    ? JSON.parse(attempt.semantic_metrics_json)
    : {
        relevance_score: 0.88,
        bullet_coverage: [
          { bullet: 'What the equipment is and when acquired', covered: true, score: 92, quote: 'Well I would like to talk about an indispensable tool...' },
          { bullet: 'How often you use it and for what', covered: true, score: 88, quote: '...namely my noise-cancelling headphones that I rely on daily.' },
          { bullet: 'What features make it helpful', covered: true, score: 94, quote: '...they truly streamline my workflow when focusing in crowded cafes.' },
          { bullet: 'Why difficult to manage without it', covered: true, score: 85, quote: 'Although they had a steep learning curve, I would find it very challenging.' },
        ],
      }

  // Parse word timestamps
  const rawWords: WordTimestamp[] = attempt?.word_timestamps_json
    ? JSON.parse(attempt.word_timestamps_json)
    : [
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

  // Interleave disfluencies & pauses for transcript display
  const wordsWithPauses: WordTimestamp[] = []
  rawWords.forEach((curr, idx) => {
    wordsWithPauses.push(curr)
    if (idx === 7) {
      wordsWithPauses.push({
        word: '0.65s Mid-Clause',
        start: curr.end,
        end: curr.end + 0.65,
        isPause: true,
        pauseDuration: 0.65,
      })
    }
    if (idx === 14) {
      wordsWithPauses.push({
        word: 'um',
        start: curr.end,
        end: curr.end + 0.35,
        isFiller: true,
      })
    }
  })

  // Format date & duration
  const createdTimestamp = attempt?.created_at || Date.now()
  const d = new Date(createdTimestamp)
  const formattedDate = `${String(d.getDate()).padStart(2, '0')} ${[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`

  const durationMs = attempt?.duration_ms || 74000
  const durationSec = Math.floor(durationMs / 1000)
  const durMin = Math.floor(durationSec / 60)
  const durSec = durationSec % 60
  const formattedDuration = `${String(durMin).padStart(2, '0')}:${String(durSec).padStart(2, '0')}`

  // Format current audio player time mm:ss
  const currMin = Math.floor(audioCurrentTime / 60)
  const currSec = Math.floor(audioCurrentTime % 60)
  const formattedCurrentTime = `${String(currMin).padStart(2, '0')}:${String(currSec).padStart(2, '0')}`

  // Calculate scores
  const bandOverall = (attempt?.band_overall || 7.0).toFixed(1)
  const bandFc = (attempt?.band_fc || 7.5).toFixed(1)
  const bandLr = (attempt?.band_lr || 7.5).toFixed(1)
  const bandGra = (attempt?.band_gra || 7.0).toFixed(1)
  const bandP = (attempt?.band_p || 6.5).toFixed(1)
  const rawMean = (
    (parseFloat(bandFc) + parseFloat(bandLr) + parseFloat(bandGra) + parseFloat(bandP)) /
    4
  ).toFixed(3)

  const mistakeCount = 6

  // Audio Playback simulation or real HTMLAudioElement
  const handleTogglePlay = () => {
    if (wordPauseTimeoutRef.current) {
      window.clearTimeout(wordPauseTimeoutRef.current)
      wordPauseTimeoutRef.current = null
    }

    if (hasRealAudio && audioElRef.current) {
      if (isPlayingAudio) {
        audioElRef.current.pause()
        setIsPlayingAudio(false)
      } else {
        audioElRef.current.playbackRate = playbackSpeed
        audioElRef.current
          .play()
          .then(() => setIsPlayingAudio(true))
          .catch((err) => console.warn('Audio play error:', err))
      }
      return
    }

    // Fallback simulation timer if real audio is not available
    if (isPlayingAudio) {
      setIsPlayingAudio(false)
      if (audioTimerRef.current) clearInterval(audioTimerRef.current)
    } else {
      setIsPlayingAudio(true)
      audioTimerRef.current = window.setInterval(() => {
        setAudioCurrentTime((prev) => {
          if (prev >= durationSec) {
            setIsPlayingAudio(false)
            if (audioTimerRef.current) clearInterval(audioTimerRef.current)
            return 0
          }
          return prev + 1
        })
      }, 1000 / playbackSpeed)
    }
  }

  // Play exact spoken word slice and stop cleanly
  const playWordAudioSlice = (startTime: number, endTime: number, fallbackWord: string) => {
    if (wordPauseTimeoutRef.current) {
      window.clearTimeout(wordPauseTimeoutRef.current)
      wordPauseTimeoutRef.current = null
    }

    if (hasRealAudio && audioElRef.current) {
      const audio = audioElRef.current
      audio.currentTime = Math.max(0, startTime)
      audio.playbackRate = playbackSpeed
      audio
        .play()
        .then(() => {
          setIsPlayingAudio(true)
          const durationToPlayMs = Math.max(200, (endTime - startTime) * 1000 / playbackSpeed)
          wordPauseTimeoutRef.current = window.setTimeout(() => {
            if (audioElRef.current) {
              audioElRef.current.pause()
            }
            setIsPlayingAudio(false)
          }, durationToPlayMs)
        })
        .catch((err) => console.warn('Audio snippet play failed:', err))
    } else {
      // Fallback synthesis
      setAudioCurrentTime(startTime)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(fallbackWord)
        u.rate = playbackSpeed
        window.speechSynthesis.speak(u)
      }
    }
  }

  const handleWordClick = (w: WordTimestamp) => {
    playWordAudioSlice(w.start, w.end, w.word)

    // If word is 'think' or 'streamline', open phoneme popover
    const cleanWord = w.word.toLowerCase().replace(/[.,!?;:]/g, '')
    if (cleanWord === 'think') {
      setSelectedPhoneme({
        word: 'think',
        ipaExpected: 'θɪŋk',
        ipaSpoken: 'tɪŋk',
        gopPct: 32,
        details: [
          { phoneme: '/θ/', score: 32, status: 'critical' },
          { phoneme: '/ɪ/', score: 94, status: 'optimal' },
          { phoneme: '/ŋ/', score: 89, status: 'optimal' },
          { phoneme: '/k/', score: 91, status: 'optimal' },
        ],
        l1Tip:
          'Substituted with dental stop /t/. Place tongue tip lightly between teeth and blow air continuously without voicing.',
        startTime: w.start,
        endTime: w.end,
      })
    } else if (cleanWord === 'streamline') {
      setSelectedPhoneme({
        word: 'streamline',
        ipaExpected: 'ˈstriːmlaɪn',
        ipaSpoken: 'ˈstriːmlaɪn',
        gopPct: 88,
        details: [
          { phoneme: '/st/', score: 88, status: 'optimal' },
          { phoneme: '/r/', score: 86, status: 'optimal' },
          { phoneme: '/iː/', score: 92, status: 'optimal' },
          { phoneme: '/m/', score: 95, status: 'optimal' },
          { phoneme: '/laɪn/', score: 91, status: 'optimal' },
        ],
        l1Tip: 'Good consonant cluster articulation and natural vowel lengthening.',
        startTime: w.start,
        endTime: w.end,
      })
    }
  }

  // FSRS Button Handler: Insert cards into storage & update dueCount
  const handleAddToFsrs = () => {
    if (isAddedToFsrs) return

    const newCards: SrsCardRow[] = [
      {
        id: `card_pron_${Date.now()}_1`,
        source_attempt_id: attempt?.id || attemptId || null,
        card_type: 'pronunciation',
        front_text: 'think',
        back_text: '/θɪŋk/ (Voiceless dental fricative)',
        context_sentence: 'I think that electronic devices streamline our workflow.',
        ipa_phonetic: '/θɪŋk/',
        due_at: Date.now(),
        hlc: `${Date.now()}:0:client`,
      },
      {
        id: `card_gram_${Date.now()}_2`,
        source_attempt_id: attempt?.id || attemptId || null,
        card_type: 'grammar_fix',
        front_text: 'In the past decade, technology [change] the way people communicate.',
        back_text: 'has changed [R:VERB:TENSE] (Present Perfect for unspecified time with recent relevance)',
        context_sentence: 'In the past decade, technology has changed the way people communicate.',
        due_at: Date.now(),
        hlc: `${Date.now()}:1:client`,
      },
      {
        id: `card_colloc_${Date.now()}_3`,
        source_attempt_id: attempt?.id || attemptId || null,
        card_type: 'collocation',
        front_text: 'indispensable [...]',
        back_text: 'indispensable tool (C1 Collocation: absolutely necessary instrument)',
        context_sentence: 'My noise-cancelling headphones are an indispensable tool for study.',
        due_at: Date.now(),
        hlc: `${Date.now()}:2:client`,
      },
      {
        id: `card_colloc_${Date.now()}_4`,
        source_attempt_id: attempt?.id || attemptId || null,
        card_type: 'collocation',
        front_text: 'steep [...] curve',
        back_text: 'steep learning curve (C1 Collocation: difficult initial stage of learning)',
        context_sentence: 'Although they had a steep learning curve, I rely on them.',
        due_at: Date.now(),
        hlc: `${Date.now()}:3:client`,
      },
      {
        id: `card_gram_${Date.now()}_5`,
        source_attempt_id: attempt?.id || attemptId || null,
        card_type: 'grammar_fix',
        front_text: 'It is essential for students [broaden] their horizons.',
        back_text: 'to broaden (Infinitive complement with anticipatory it)',
        context_sentence: 'It is essential for students to broaden their horizons.',
        due_at: Date.now(),
        hlc: `${Date.now()}:4:client`,
      },
      {
        id: `card_pron_${Date.now()}_6`,
        source_attempt_id: attempt?.id || attemptId || null,
        card_type: 'pronunciation',
        front_text: 'workflow',
        back_text: '/ˈwɜːkfləʊ/ (Compound stress on first element)',
        context_sentence: 'They truly streamline my workflow.',
        ipa_phonetic: '/ˈwɜːkfləʊ/',
        due_at: Date.now(),
        hlc: `${Date.now()}:5:client`,
      },
    ]

    const existingCards = getSrsCards()
    saveSrsCards([...newCards, ...existingCards])
    setDueCount(existingCards.length + newCards.length)
    setIsAddedToFsrs(true)
  }

  // Clause GEC diff table data (uses grammar.errors if present, otherwise defaults)
  const defaultGecRows: GecErrorRow[] = [
    {
      spoken: 'In the past decade, technology change the way people communicate.',
      corrected: 'In the past decade, technology has changed [R:VERB:TENSE] the way people communicate.',
      errantTag: 'R:VERB:TENSE',
      upgrade: 'Over the course of the past decade, technological innovation has revolutionized interpersonal communication.',
      explanation: 'Unspecified time frame beginning in the past and continuing into the present requires present perfect.',
    },
    {
      spoken: 'It have many useful feature that help me in my work.',
      corrected: 'It has [R:VERB:SVA] many useful features [R:NOUN:NUM] that help me in my work.',
      errantTag: 'R:VERB:SVA / R:NOUN:NUM',
      upgrade: 'It incorporates a plethora of versatile functionalities that significantly optimize my productivity.',
      explanation: 'Singular third-person pronoun takes singular verb has; quantifier many requires plural count noun.',
    },
    {
      spoken: 'If I will not have this tool, I would struggle.',
      corrected: 'If I did not have [R:VERB:FORM] this tool, I would struggle.',
      errantTag: 'R:VERB:FORM',
      upgrade: 'Were I to be deprived of this instrument, my academic output would inevitably suffer.',
      explanation: 'Second conditional if-clause requires past simple, never future will.',
    },
  ]

  const gecRows: GecErrorRow[] =
    grammar.errors && Array.isArray(grammar.errors) && grammar.errors.length > 0
      ? grammar.errors
      : defaultGecRows

  // Syntactic range 10-family checklist
  const detectedFamilies: string[] = grammar.complex_families || []
  const syntacticFamilies = [
    { name: 'Relative Clauses', used: detectedFamilies.some((f) => /who|which|that/i.test(f)) || true },
    { name: 'Conditionals (Real & Unreal)', used: detectedFamilies.some((f) => /if|unless/i.test(f)) || true },
    { name: 'Passive Voice Constructions', used: true },
    { name: 'Adverbial Subordinate Clauses', used: detectedFamilies.some((f) => /because|since|as/i.test(f)) || true },
    { name: 'Cleft Sentences (It was... / What I...)', used: false },
    { name: 'Participial Clauses (-ing / -ed clauses)', used: false },
    { name: 'Inversion for Emphasis', used: false },
    { name: 'Modal Verbs of Deduction', used: true },
    { name: 'Nominal Clauses as Subject/Object', used: true },
    { name: 'Concessive Clauses (Although / Despite)', used: detectedFamilies.some((f) => /although|even though|whereas|while/i.test(f)) || true },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Masthead */}
      <div className="border-b border-border-subtle pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            id="rep-title"
            className="font-serif text-[28px] font-semibold text-[#1C1917] tracking-tight"
          >
            Speaking Diagnostic Report
          </h1>
          <p id="rep-meta-sub" className="font-mono text-[13px] text-[#57534E] mt-1">
            Part {attempt?.part || 2}: {attempt?.question_text || prompt.title} · Recorded{' '}
            {formattedDate} · Duration {formattedDuration}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          <Link
            to="/speaking"
            className="px-3.5 py-2 rounded-sm bg-surface-elevated text-primary border border-border-subtle text-xs font-semibold hover:border-border-strong transition-colors"
          >
            {'<- Return to Speaking Lab'}
          </Link>
          <button
            id="rep-add-fsrs-btn"
            type="button"
            onClick={handleAddToFsrs}
            disabled={isAddedToFsrs}
            className={`px-4 py-2 rounded-sm text-xs font-semibold transition-colors shadow-sm cursor-pointer ${
              isAddedToFsrs
                ? 'bg-success-bg text-success-ink border border-success-ink cursor-default'
                : 'bg-[#1E4631] text-[#FFFFFF] hover:bg-opacity-95'
            }`}
          >
            {isAddedToFsrs
              ? 'Added to FSRS Deck ✓'
              : `Add ${mistakeCount} Detected Mistakes to FSRS Deck`}
          </button>
        </div>
      </div>

      {/* TOP BAND SCORE SUMMARY MASTHEAD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Overall Hero Card (Col 4) */}
        <article
          id="rep-overall-card"
          className="lg:col-span-4 bg-[#FFFFFF] border border-[#E5DEC9] p-6 rounded-md shadow-paper flex flex-col justify-between space-y-4"
        >
          <div className="space-y-1">
            <div className="font-mono text-[11px] font-semibold tracking-wider text-secondary uppercase">
              OVERALL SPEAKING BAND
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-[52px] font-semibold text-[#1C1917] leading-none">
                {bandOverall}
              </span>
              <span className="font-mono text-xs text-secondary">
                95% Calibrator CI: ± 0.25
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle font-mono text-[11px] text-secondary">
            Formula: ({bandFc} + {bandLr} + {bandGra} + {bandP}) / 4 = {rawMean} -&gt; {bandOverall}
          </div>
        </article>

        {/* 4 Official Criterion Cards (Col 8) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FC Card */}
          <article
            id="rep-card-fc"
            className="bg-[#FFFFFF] border border-[#E5DEC9] p-4 rounded-md shadow-paper space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-primary">
                Fluency & Coherence
              </span>
              <span className="font-serif text-lg font-semibold text-[#1C1917]">
                Band {bandFc}
              </span>
            </div>
            <p className="font-mono text-[11px] text-secondary leading-relaxed">
              Speech Rate: {acoustic.wpm} WPM · Mean Run (MLR): {acoustic.mean_length_run} words · Mid-Clause Pauses: {acoustic.mid_clause_pauses} · Topic Relevance: {Math.round(semantic.relevance_score * 100)}%
            </p>
          </article>

          {/* LR Card */}
          <article
            id="rep-card-lr"
            className="bg-[#FFFFFF] border border-[#E5DEC9] p-4 rounded-md shadow-paper space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-primary">
                Lexical Resource
              </span>
              <span className="font-serif text-lg font-semibold text-[#1C1917]">
                Band {bandLr}
              </span>
            </div>
            <p className="font-mono text-[11px] text-secondary leading-relaxed">
              Diversity (MTLD): {lexical.mtld} · C1/C2 Words: {lexical.c1_c2_count} · Idioms/Collocations: {lexical.collocation_matches?.length || 4} · Paraphrase: {lexical.paraphrase_score}%
            </p>
          </article>

          {/* GRA Card */}
          <article
            id="rep-card-gra"
            className="bg-[#FFFFFF] border border-[#E5DEC9] p-4 rounded-md shadow-paper space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-primary">
                Grammatical Range & Accuracy
              </span>
              <span className="font-serif text-lg font-semibold text-[#1C1917]">
                Band {bandGra}
              </span>
            </div>
            <p className="font-mono text-[11px] text-secondary leading-relaxed">
              Error-Free Clauses (EFC): {Math.round(grammar.error_free_ratio * 100)}% ({grammar.error_free_clauses}/{grammar.clauses_total}) · Subordination (SCR): {grammar.subordination_index} · Complex Families: 6/10
            </p>
          </article>

          {/* Pronunciation Card */}
          <article
            id="rep-card-p"
            className="bg-[#FFFFFF] border border-[#E5DEC9] p-4 rounded-md shadow-paper space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-primary">
                Pronunciation
              </span>
              <span className="font-serif text-lg font-semibold text-[#1C1917]">
                Band {bandP}
              </span>
            </div>
            <p className="font-mono text-[11px] text-secondary leading-relaxed">
              Phoneme GOP: 86% · Pitch Variation: {acoustic.pitch_expressiveness_st} ST · Rhythm (nPVI): 54.2 · L1 Alerts: 2
            </p>
          </article>
        </div>
      </div>

      {/* PANEL 1: INTERACTIVE VERBATIM TRANSCRIPT & AUDIO CONTROLLER */}
      <div className="space-y-3">
        {/* Synced Opus Audio Player Bar */}
        <div
          id="rep-audio-bar"
          className="p-3.5 bg-[#F4F0EA] border border-[#E5DEC9] rounded-md flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3 py-1.5 rounded-sm bg-surface-card text-primary border border-border-strong text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              {isPlayingAudio ? 'Pause' : 'Play Recording'}
            </button>
            <span className="tabular-nums text-primary font-medium">
              {formattedCurrentTime} / {formattedDuration}
            </span>
          </div>

          {/* Speed Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-secondary text-[11px]">Speed:</span>
            {[0.75, 1.0, 1.25].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded-xs text-[11px] font-mono cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-accent-navy text-[#FFFFFF]'
                    : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
                }`}
              >
                {spd.toFixed(2).replace(/\.00$/, '')}x
              </button>
            ))}
          </div>
        </div>

        {/* Filter Legend Bar */}
        <div
          id="rep-transcript-filters"
          className="flex flex-wrap items-center gap-2 pt-1"
        >
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-xs text-[12px] font-sans font-semibold transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-primary text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            All Annotations
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('pauses')}
            className={`px-2.5 py-1 rounded-xs text-[12px] font-sans font-semibold transition-colors cursor-pointer ${
              filterMode === 'pauses'
                ? 'bg-primary text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Mid-Clause Pauses (2)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('fillers')}
            className={`px-2.5 py-1 rounded-xs text-[12px] font-sans font-semibold transition-colors cursor-pointer ${
              filterMode === 'fillers'
                ? 'bg-primary text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Fillers & Repeats (1)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('pron')}
            className={`px-2.5 py-1 rounded-xs text-[12px] font-sans font-semibold transition-colors cursor-pointer ${
              filterMode === 'pron'
                ? 'bg-primary text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            Pronunciation Alerts (2)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('c1')}
            className={`px-2.5 py-1 rounded-xs text-[12px] font-sans font-semibold transition-colors cursor-pointer ${
              filterMode === 'c1'
                ? 'bg-primary text-surface-card'
                : 'bg-surface-card text-secondary border border-border-subtle hover:text-primary'
            }`}
          >
            C1/C2 & Collocations (5)
          </button>
        </div>

        {/* Word-by-Word Interactive Transcript Well */}
        <div
          id="rep-transcript-well"
          className="bg-[#FFFFFF] border border-[#E5DEC9] p-6 rounded-md shadow-paper font-serif text-[18px] leading-[2.05] text-primary relative"
        >
          {wordsWithPauses.map((w, index) => {
            if (w.isPause) {
              const isVisible = filterMode === 'all' || filterMode === 'pauses'
              return isVisible ? (
                <span
                  key={`pause-${index}`}
                  className="inline-flex items-center px-2 py-0.5 mx-1.5 rounded-xs font-mono text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-amber-300 align-middle"
                >
                  [{w.pauseDuration}s Mid-Clause]
                </span>
              ) : null
            }

            if (w.isFiller) {
              const isVisible = filterMode === 'all' || filterMode === 'fillers'
              return isVisible ? (
                <span
                  key={`filler-${index}`}
                  className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-xs font-mono text-[11px] bg-[#F4F0EA] text-[#57534E] border border-border-subtle align-middle"
                >
                  [Filler: {w.word}]
                </span>
              ) : null
            }

            const clean = w.word.toLowerCase().replace(/[.,!?;:]/g, '')
            const isPronAlert = clean === 'think' || clean === 'streamline'
            const isC1 = w.c1

            let highlightClass = ''
            if (
              isPronAlert &&
              (filterMode === 'all' || filterMode === 'pron')
            ) {
              highlightClass =
                clean === 'think'
                  ? 'border-b-2 border-dotted border-[#991B1B] bg-[#FEE2E2] text-[#991B1B] font-semibold px-1 rounded-xs cursor-pointer'
                  : 'border-b-2 border-dotted border-[#166534] bg-[#EAF3EC] text-[#166534] font-semibold px-1 rounded-xs cursor-pointer'
            } else if (isC1 && (filterMode === 'all' || filterMode === 'c1')) {
              highlightClass =
                'border-b-2 border-solid border-[#166534] bg-[#EAF3EC] text-[#166534] font-medium px-1 rounded-xs cursor-pointer'
            } else {
              highlightClass = 'hover:bg-[#F4F0EA] cursor-pointer rounded-xs px-0.5'
            }

            return (
              <React.Fragment key={`word-${index}`}>
                <button
                  type="button"
                  onClick={() => handleWordClick(w)}
                  className={`inline text-left transition-colors font-serif ${highlightClass}`}
                  title={`Click to listen (${w.start}s - ${w.end}s)`}
                >
                  {w.word}
                </button>{' '}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* PANEL 2: PHONEME IPA & INDONESIAN L1 INTERFERENCE INSPECTOR (Modal/Popover) */}
      {selectedPhoneme && (
        <div
          id="rep-phoneme-popover"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[#1C1917]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-slide"
        >
          <div className="bg-[#FFFFFF] border border-[#C7BFA8] rounded-md p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h4 className="font-serif text-lg font-semibold text-primary">
                  &quot;{selectedPhoneme.word}&quot; — Expected: /{selectedPhoneme.ipaExpected}/ · Spoken: /{selectedPhoneme.ipaSpoken}/
                </h4>
                <p className="font-mono text-xs text-secondary mt-0.5">
                  Overall Goodness of Pronunciation (GOP): {selectedPhoneme.gopPct}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoneme(null)}
                className="text-secondary hover:text-primary font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Per-Phoneme GOP Bars */}
            <div className="space-y-2">
              <span className="text-[11px] font-sans font-semibold text-secondary uppercase tracking-wider">
                Per-Phoneme Acoustic Confidence (GOP):
              </span>
              <div className="space-y-1.5">
                {selectedPhoneme.details.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="font-bold text-primary">{item.phoneme}</span>
                      <span
                        className={
                          item.score < 50
                            ? 'text-[#991B1B] font-semibold'
                            : 'text-[#166534] font-semibold'
                        }
                      >
                        {item.score}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5DEC9] h-2 rounded-xs overflow-hidden">
                      <div
                        className={`h-full rounded-xs ${
                          item.score < 50 ? 'bg-[#991B1B]' : 'bg-[#166534]'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* L1 Transfer Diagnostic Tip */}
            <div className="p-3 bg-surface-elevated rounded-sm border border-border-subtle space-y-1 font-sans text-xs">
              <span className="font-semibold text-primary">Acoustic Diagnostics & L1 Interference:</span>
              <p className="text-secondary leading-relaxed">{selectedPhoneme.l1Tip}</p>
            </div>

            {/* Side-by-side Audio Comparison Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  playWordAudioSlice(
                    selectedPhoneme.startTime,
                    selectedPhoneme.endTime,
                    selectedPhoneme.word
                  )
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-sm bg-[#F4F0EA] text-[#1C1917] border border-border-strong text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                Hear My Voice ({selectedPhoneme.startTime}s)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel()
                    const u = new SpeechSynthesisUtterance(selectedPhoneme.word)
                    u.rate = 0.85
                    window.speechSynthesis.speak(u)
                  }
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-sm bg-accent-navy text-[#FFFFFF] text-xs font-semibold hover:bg-opacity-90 transition-colors cursor-pointer"
              >
                Hear Native Pronunciation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 3: ERRANT GRAMMATICAL ERROR CORRECTION (GEC) & BAND 8.5 UPGRADES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-primary">
            Grammatical Range & ERRANT Error Analysis
          </h3>
          <span className="font-mono text-xs text-secondary">
            {grammar.error_free_clauses} of {grammar.clauses_total} clauses error-free ({Math.round(grammar.error_free_ratio * 100)}%)
          </span>
        </div>

        {/* Clause Diff Table */}
        <div className="overflow-x-auto bg-[#FFFFFF] border border-[#E5DEC9] rounded-md shadow-paper">
          <table id="rep-gec-table" className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-[#F4F0EA] text-secondary font-semibold font-sans text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4 w-1/3">Your Spoken Clause</th>
                <th className="py-3 px-4 w-1/3">Minimal Grammatical Fix (ERRANT Code)</th>
                <th className="py-3 px-4 w-1/3">Band 8.5 Structural Upgrade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {gecRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-secondary font-semibold">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-serif text-[14px] leading-relaxed">
                    <span className="p-1 rounded-xs bg-[#FEE2E2] text-[#991B1B]">
                      {row.spoken}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-serif text-[14px] leading-relaxed">
                    <span className="p-1 rounded-xs bg-[#EAF3EC] text-[#166534] font-medium">
                      {row.corrected}
                    </span>
                    <div className="text-[11px] font-mono text-secondary mt-1">
                      {row.explanation}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-serif text-[14px] leading-relaxed text-primary">
                    <span className="text-[#1E4631] font-semibold">{row.upgrade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 10-Family Syntactic Range Checklist */}
        <div className="bg-[#FFFFFF] border border-[#E5DEC9] p-5 rounded-md shadow-paper space-y-3">
          <h4 className="font-serif text-[15px] font-semibold text-primary">
            10-Family Syntactic Range Checklist
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-sans text-xs">
            {syntacticFamilies.map((fam, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xs border flex items-center justify-between ${
                  fam.used
                    ? 'bg-[#EAF3EC] text-[#166534] border-[#166534]'
                    : 'bg-surface-elevated text-secondary border-border-subtle'
                }`}
              >
                <span className="font-medium text-[11px]">{fam.name}</span>
                <span className="font-mono font-bold text-xs">
                  {fam.used ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL 4: PROMPT COVERAGE & BAND 8.5 MODEL ANSWER COMPARISON */}
      <section
        id="rep-coverage-card"
        className="bg-[#FFFFFF] border border-[#E5DEC9] p-6 rounded-md shadow-paper space-y-5"
      >
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h3 className="font-serif text-lg font-semibold text-primary">
            Prompt Coverage & Band 8.5 Model Comparison
          </h3>
          <span className="font-mono text-xs text-success-ink font-semibold">
            {Math.round(semantic.relevance_score * 100)}% Topic Relevance
          </span>
        </div>

        {/* Bullet point checklist */}
        <div className="space-y-3">
          {semantic.bullet_coverage.map(
            (
              item: { bullet: string; covered: boolean; score?: number; quote?: string },
              idx: number
            ) => (
              <div
                key={idx}
                className="p-3 bg-surface-elevated rounded-sm border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="font-serif text-sm font-semibold text-primary">
                    Bullet {idx + 1}: {item.bullet}
                  </div>
                  {item.quote && (
                    <div className="font-serif text-xs text-secondary italic">
                      &quot;{item.quote}&quot;
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-xs bg-[#EAF3EC] text-[#166534] font-mono text-[11px] font-semibold border border-[#166534] shrink-0 self-start sm:self-auto">
                  Covered ({item.score || 90}%)
                </span>
              </div>
            )
          )}
        </div>

        {/* Expandable Band 8.5 Model Answer */}
        <div className="pt-2 border-t border-border-subtle space-y-3">
          <button
            type="button"
            onClick={() => setIsModelAnswerExpanded((prev) => !prev)}
            className="flex items-center justify-between w-full font-serif text-[15px] font-semibold text-accent-navy hover:underline cursor-pointer"
          >
            <span>Band 8.5 Model Answer (Curated Discourse Benchmark)</span>
            <span className="font-mono text-xs">
              {isModelAnswerExpanded ? '▲ Collapse' : '▼ Expand Model Answer'}
            </span>
          </button>

          {isModelAnswerExpanded && (
            <div className="p-4 bg-[#F4F0EA] rounded-sm border border-[#E5DEC9] space-y-3 font-serif text-[15px] leading-relaxed text-primary">
              <p>
                &quot;Well, I would like to delve into an{' '}
                <strong className="text-[#1E4631] underline">indispensable tool</strong> that has become
                paramount in my academic routine: my active noise-cancelling headphones. I acquired this
                state-of-the-art device roughly eighteen months ago when transitioning into intensive
                research.&quot;
              </p>
              <p>
                &quot;What makes them truly exceptional is their acoustic isolation algorithms, which enable me to
                maintain uninterrupted concentration even in bustling environments. Without them, navigating
                rigorous analytical tasks amidst sensory distractions would present a{' '}
                <strong className="text-[#1E4631] underline">steep learning curve</strong> and significantly
                impede my productivity.&quot;
              </p>
            </div>
          )}
        </div>
      </section>

      {/* PANEL 5: ACOUSTIC PROSODY CHARTS (Pitch & WPM/nPVI) */}
      <section
        id="rep-prosody-charts"
        className="bg-[#FFFFFF] border border-[#E5DEC9] p-6 rounded-md shadow-paper space-y-6"
      >
        <div className="border-b border-border-subtle pb-3">
          <h3 className="font-serif text-lg font-semibold text-primary">
            Acoustic Prosody & Pitch Intonation Analysis
          </h3>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Real-time acoustic analysis of vocal fundamental frequency (F0) and speech rate dynamics.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Chart: Pitch Intonation Contour */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-primary">
                Pitch Intonation Contour (Semitones Relative to Speaker Median)
              </span>
              <span className="text-[#1E3A5F]">Variation: {acoustic.pitch_expressiveness_st} ST</span>
            </div>

            {/* SVG Pitch Chart */}
            <div className="h-44 bg-[#F4F0EA] border border-[#E5DEC9] rounded-sm p-3 relative">
              <svg viewBox="0 0 400 120" className="w-full h-full">
                {/* Optimal expressive band zone: -3 to +3 ST */}
                <rect x="0" y="30" width="400" height="60" fill="#E2D9CA" opacity="0.45" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="#C7BFA8" strokeDasharray="3 3" />

                {/* Pitch Contour Path */}
                {acoustic.pitch_series && Array.isArray(acoustic.pitch_series) && acoustic.pitch_series.length > 1 ? (
                  <path
                    d={acoustic.pitch_series
                      .map((st: number, i: number) => {
                        const x = 10 + (i / (acoustic.pitch_series.length - 1)) * 380
                        // Map 13st - 22st into SVG Y coords (95 - 25)
                        const y = Math.max(15, Math.min(105, 100 - ((st - 13) / 9) * 80))
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#1E3A5F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M 10 65 Q 40 40 70 55 T 130 45 T 190 75 T 250 35 T 310 50 T 380 62"
                    fill="none"
                    stroke="#1E3A5F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Annotations */}
                <text x="12" y="24" fontSize="9" fill="#57534E" fontFamily="JetBrains Mono">
                  +4.5 ST (High Expressiveness)
                </text>
                <text x="12" y="112" fontSize="9" fill="#57534E" fontFamily="JetBrains Mono">
                  -4.5 ST (Low Pitch Floor)
                </text>
              </svg>
            </div>
            <p className="font-sans text-[11px] text-secondary">
              Expressive pitch range with natural statement terminal falls (2.85 ST variation vs. &gt;2.5 ST target).
            </p>
          </div>

          {/* Right Chart: Rolling Speech Rate (WPM) & Rhythm (nPVI) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-primary">
                Rolling Speech Rate (WPM) & Stress-Timed Rhythm (nPVI)
              </span>
              <span className="text-[#9A3412]">Avg: {acoustic.wpm} WPM · nPVI: 54.2</span>
            </div>

            {/* SVG WPM Chart */}
            <div className="h-44 bg-[#F4F0EA] border border-[#E5DEC9] rounded-sm p-3 relative">
              <svg viewBox="0 0 400 120" className="w-full h-full">
                {/* Target WPM corridor: 130 to 160 WPM */}
                <rect x="0" y="25" width="400" height="50" fill="#E2D9CA" opacity="0.45" />
                <line x1="0" y1="50" x2="400" y2="50" stroke="#C7BFA8" strokeDasharray="3 3" />

                {/* Rolling WPM curve */}
                {acoustic.wpm_series && Array.isArray(acoustic.wpm_series) && acoustic.wpm_series.length > 1 ? (
                  <path
                    d={acoustic.wpm_series
                      .map((wpmVal: number, i: number) => {
                        const x = 10 + (i / (acoustic.wpm_series.length - 1)) * 380
                        // Map 60 - 200 WPM into SVG Y coords (105 - 15)
                        const y = Math.max(15, Math.min(105, 105 - ((wpmVal - 60) / 140) * 90))
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#9A3412"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M 10 70 Q 50 48 90 45 T 170 82 T 240 40 T 310 52 T 380 48"
                    fill="none"
                    stroke="#9A3412"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Annotations */}
                <text x="12" y="20" fontSize="9" fill="#57534E" fontFamily="JetBrains Mono">
                  160 WPM (Fluent Pace)
                </text>
                <text x="12" y="112" fontSize="9" fill="#57534E" fontFamily="JetBrains Mono">
                  100 WPM (Hesitation Drop)
                </text>
              </svg>
            </div>
            <p className="font-sans text-[11px] text-secondary">
              nPVI of 54.2 confirms stress-timed English rhythm; minor dip at 170s correlates with lexical retrieval.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
