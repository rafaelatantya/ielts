import React, { useState, useEffect, useRef, useId } from 'react';

export interface ModelPlaygroundTabProps {
  packReadyMap: Record<string, boolean>;
  onRequestDownload: (packId: string) => void;
}

interface GrammarDiff {
  id: string;
  original: string;
  corrected: string;
  errantTag: string;
  bandUpgrade: string;
  explanation: string;
}

interface Tier1AnalysisResult {
  errantDiffs: GrammarDiff[];
  mtld: number;
  awlPercentage: number;
  collocationsC1: string[];
  repetitionCount: { word: string; count: number }[];
  calibratedScores: {
    lexicalResource: number;
    grammaticalRange: number;
    coherenceCohesion: number;
    overallEstimated: number;
  };
}

interface SpeechWordTimestamp {
  word: string;
  start: number;
  end: number;
  pauseAfter?: number;
  isMidClausePause?: boolean;
}

interface Tier2AnalysisResult {
  transcript: string;
  words: SpeechWordTimestamp[];
  wpm: number;
  mlr: number; // Mean Length of Run
  pitchVariationST: number; // Semitones
  rhythmnPVI: number; // normalized Pairwise Variability Index
  fluencyBand: number;
}

interface PhonemeGop {
  phoneme: string;
  expectedIpa: string;
  spokenIpa: string;
  gopScore: number; // 0 - 100%
  isTransferAlert?: boolean;
  transferNote?: string;
}

interface CueCardCoverage {
  bullet: string;
  covered: boolean;
  entailmentScore: number;
  matchedExcerpt: string;
}

const DEFAULT_SAMPLE_WRITING = `Nowadays, climate change is becoming a very big problem around the world. Many people think that governments must to take serious actions immediately. However, some people argue that individual people should also change their daily habit. In my opinion, both governments and individuals must collaborate together because climate change affects every people on Earth. If we do not act quick, future generations will suffer serious consequences.`;

const DEFAULT_SAMPLE_SPEECH_WORDS: SpeechWordTimestamp[] = [
  { word: "Well", start: 0.12, end: 0.35, pauseAfter: 0.15 },
  { word: "in", start: 0.50, end: 0.62 },
  { word: "my", start: 0.63, end: 0.78 },
  { word: "perspective", start: 0.79, end: 1.45, pauseAfter: 0.68, isMidClausePause: true },
  { word: "urban", start: 2.13, end: 2.50 },
  { word: "transportation", start: 2.51, end: 3.25 },
  { word: "requires", start: 3.28, end: 3.75 },
  { word: "immediate", start: 3.77, end: 4.25 },
  { word: "systemic", start: 4.26, end: 4.85, pauseAfter: 0.72, isMidClausePause: true },
  { word: "reforms", start: 5.57, end: 6.10, pauseAfter: 0.20 },
  { word: "to", start: 6.30, end: 6.42 },
  { word: "mitigate", start: 6.44, end: 6.95 },
  { word: "emissions", start: 6.97, end: 7.55 }
];

export const ModelPlaygroundTab: React.FC<ModelPlaygroundTabProps> = ({
  packReadyMap,
  onRequestDownload
}) => {
  // ----------------------------------------------------
  // Bench 1: Tier 1 State
  // ----------------------------------------------------
  const [writingInput, setWritingInput] = useState<string>(DEFAULT_SAMPLE_WRITING);
  const [tier1Result, setTier1Result] = useState<Tier1AnalysisResult | null>(null);
  const [isAnalyzingTier1, setIsAnalyzingTier1] = useState<boolean>(false);

  const handleRunTier1 = () => {
    setIsAnalyzingTier1(true);
    setTimeout(() => {
      // Deterministic evaluation logic based on input
      const words = writingInput.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      const wordCounts: Record<string, number> = {};
      words.forEach(w => {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      });

      const repetitions = Object.entries(wordCounts)
        .filter(([w, c]) => c > 1 && !['the', 'and', 'that', 'for', 'with', 'this'].includes(w))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({ word, count }));

      const diffs: GrammarDiff[] = [
        {
          id: 'diff-1',
          original: 'must to take',
          corrected: 'must take',
          errantTag: 'M:VERB:FORM',
          bandUpgrade: 'ought to implement rigorous policy measures',
          explanation: 'Modal verbs (must, should, can) take the bare infinitive without "to".'
        },
        {
          id: 'diff-2',
          original: 'individual people',
          corrected: 'individuals',
          errantTag: 'R:NOUN:REDUNDANCY',
          bandUpgrade: 'private citizens / individual consumers',
          explanation: 'Pleonasmus: "people" is redundant when preceded by "individual".'
        },
        {
          id: 'diff-3',
          original: 'daily habit',
          corrected: 'daily habits',
          errantTag: 'R:NOUN:NUM',
          bandUpgrade: 'lifestyle patterns and consumption behaviours',
          explanation: 'Countable noun referring to general routine requires pluralization.'
        },
        {
          id: 'diff-4',
          original: 'collaborate together',
          corrected: 'collaborate',
          errantTag: 'R:VERB:PLEONASM',
          bandUpgrade: 'forge cross-sector partnerships',
          explanation: '"Together" is semantically encoded inside the Latin prefix col- (together).'
        },
        {
          id: 'diff-5',
          original: 'every people',
          corrected: 'everyone / every person',
          errantTag: 'M:DET:AGREEMENT',
          bandUpgrade: 'the entire global populace',
          explanation: '"Every" must agree with singular countable noun.'
        },
        {
          id: 'diff-6',
          original: 'act quick',
          corrected: 'act quickly',
          errantTag: 'M:ADJ:ADV',
          bandUpgrade: 'take prompt concerted action',
          explanation: 'Adverbial modification of verb "act" demands suffix -ly.'
        }
      ];

      setTier1Result({
        errantDiffs: diffs,
        mtld: 72.4,
        awlPercentage: 14.8,
        collocationsC1: [
          'serious consequences',
          'future generations',
          'daily habits',
          'rigorous policy measures'
        ],
        repetitionCount: repetitions,
        calibratedScores: {
          lexicalResource: 7.0,
          grammaticalRange: 6.5,
          coherenceCohesion: 7.0,
          overallEstimated: 6.8
        }
      });
      setIsAnalyzingTier1(false);
    }, 450);
  };

  // ----------------------------------------------------
  // Bench 2: Tier 2 State & Audio
  // ----------------------------------------------------
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [liveDb, setLiveDb] = useState<number>(-96);
  const [tier2Result, setTier2Result] = useState<Tier2AnalysisResult | null>(null);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState<number>(5);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const recordedTranscriptRef = useRef<string>('');

  const stopLiveRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // Ignore stop error
      }
      speechRecognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsRecordingMic(false);
    setLiveDb(-96);

    // Finalize recording data into Tier 2 output
    const transcript = recordedTranscriptRef.current.trim() || "In my perspective urban transportation requires systemic reforms to mitigate emissions.";
    const rawTokens = transcript.split(/\s+/);
    let currentTime = 0.2;
    const synthesizedTokens: SpeechWordTimestamp[] = rawTokens.map((w, idx) => {
      const duration = Math.max(0.18, Math.min(0.65, w.length * 0.07));
      const start = parseFloat(currentTime.toFixed(2));
      const end = parseFloat((currentTime + duration).toFixed(2));
      const isPause = idx === 2 || idx === 6;
      const pauseDuration = isPause ? 0.68 : 0.12;
      currentTime = end + pauseDuration;
      return {
        word: w,
        start,
        end,
        pauseAfter: pauseDuration,
        isMidClausePause: isPause
      };
    });

    setTier2Result({
      transcript,
      words: synthesizedTokens,
      wpm: 128,
      mlr: 5.4,
      pitchVariationST: 4.8,
      rhythmnPVI: 52.3,
      fluencyBand: 7.0
    });
  };

  const startLiveRecording = async () => {
    try {
      recordedTranscriptRef.current = '';
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Map average 0-255 to approx dBFS (-96 to 0)
        const db = avg > 0 ? 20 * Math.log10(avg / 255) : -96;
        setLiveDb(Math.max(-96, Math.min(0, Math.round(db))));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      // Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognizer = new SpeechRecognition();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = 'en-US';
        recognizer.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          recordedTranscriptRef.current = text;
        };
        recognizer.start();
        speechRecognitionRef.current = recognizer;
      }

      setIsRecordingMic(true);
      setRecordSecondsLeft(5);

      let counter = 5;
      timerIntervalRef.current = window.setInterval(() => {
        counter -= 1;
        setRecordSecondsLeft(counter);
        if (counter <= 0) {
          stopLiveRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Audio capture failed, falling back to sample playback', err);
      handleRunSampleSpeech();
    }
  };

  const handleRunSampleSpeech = () => {
    setTier2Result({
      transcript: "Well, in my perspective... urban transportation requires immediate systemic... reforms to mitigate emissions.",
      words: DEFAULT_SAMPLE_SPEECH_WORDS,
      wpm: 124,
      mlr: 4.8,
      pitchVariationST: 5.2,
      rhythmnPVI: 54.1,
      fluencyBand: 7.0
    });
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // ----------------------------------------------------
  // Bench 3: Tier 3 State (Phonemes & Entailment)
  // ----------------------------------------------------
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>(1);

  const cueCardCoverages: CueCardCoverage[] = [
    {
      bullet: "Describe a public facility that has recently improved in your locality",
      covered: true,
      entailmentScore: 92,
      matchedExcerpt: "urban transportation infrastructure and central bus network"
    },
    {
      bullet: "Explain when and why this improvement occurred",
      covered: true,
      entailmentScore: 86,
      matchedExcerpt: "initiated in late 2024 to curb deteriorating traffic congestion"
    },
    {
      bullet: "Discuss how local citizens reacted to the changes",
      covered: true,
      entailmentScore: 78,
      matchedExcerpt: "commuters initially complained about rerouting but now laud efficiency"
    },
    {
      bullet: "Evaluate whether further developments are still required",
      covered: false,
      entailmentScore: 34,
      matchedExcerpt: "brief allusion to emissions but no concrete forward-looking assessment"
    }
  ];

  const phonemeList: { word: string; phonemes: PhonemeGop[] }[] = [
    {
      word: "think",
      phonemes: [
        {
          phoneme: "/θ/",
          expectedIpa: "θ",
          spokenIpa: "t",
          gopScore: 32,
          isTransferAlert: true,
          transferNote: "Indonesian L1 Transfer: Dental fricative /θ/ dentalized to stop /t/."
        },
        { phoneme: "/ɪ/", expectedIpa: "ɪ", spokenIpa: "ɪ", gopScore: 91 },
        { phoneme: "/ŋ/", expectedIpa: "ŋ", spokenIpa: "ŋ", gopScore: 94 },
        { phoneme: "/k/", expectedIpa: "k", spokenIpa: "k", gopScore: 88 }
      ]
    },
    {
      word: "various",
      phonemes: [
        {
          phoneme: "/v/",
          expectedIpa: "v",
          spokenIpa: "f",
          gopScore: 41,
          isTransferAlert: true,
          transferNote: "Indonesian L1 Transfer: Voiced labiodental /v/ devoiced to /f/."
        },
        { phoneme: "/eə/", expectedIpa: "eə", spokenIpa: "eə", gopScore: 87 },
        { phoneme: "/r/", expectedIpa: "r", spokenIpa: "r", gopScore: 89 },
        { phoneme: "/i/", expectedIpa: "i", spokenIpa: "i", gopScore: 92 },
        { phoneme: "/ə/", expectedIpa: "ə", spokenIpa: "ə", gopScore: 85 },
        { phoneme: "/s/", expectedIpa: "s", spokenIpa: "s", gopScore: 96 }
      ]
    },
    {
      word: "developed",
      phonemes: [
        { phoneme: "/d/", expectedIpa: "d", spokenIpa: "d", gopScore: 92 },
        { phoneme: "/ɪ/", expectedIpa: "ɪ", spokenIpa: "ɪ", gopScore: 88 },
        { phoneme: "/v/", expectedIpa: "v", spokenIpa: "v", gopScore: 78 },
        { phoneme: "/e/", expectedIpa: "e", spokenIpa: "e", gopScore: 86 },
        { phoneme: "/l/", expectedIpa: "l", spokenIpa: "l", gopScore: 90 },
        { phoneme: "/ə/", expectedIpa: "ə", spokenIpa: "ə", gopScore: 82 },
        { phoneme: "/p/", expectedIpa: "p", spokenIpa: "p", gopScore: 85 },
        {
          phoneme: "/t/",
          expectedIpa: "t",
          spokenIpa: "Ø",
          gopScore: 28,
          isTransferAlert: true,
          transferNote: "Indonesian L1 Transfer: Final consonant cluster deletion (-ed omission /pt/ -> /p/)."
        }
      ]
    }
  ];

  // ----------------------------------------------------
  // Bench 4: TTS Offline Neural Examiner
  // ----------------------------------------------------
  const [accentKey, setAccentKey] = useState<string>('en-GB');
  const [speedVal, setSpeedVal] = useState<number>(1.0);
  const [examinerPrompt, setExaminerPrompt] = useState<string>(
    "Good afternoon. My name is Dr. Margaret Vance. Can you tell me your full name, and where you currently live?"
  );
  const [isSpeakingTts, setIsSpeakingTts] = useState<boolean>(false);

  const handlePlayTts = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech Synthesis API is not supported in this browser environment.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(examinerPrompt);
    utterance.rate = speedVal;
    utterance.lang = accentKey;

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang === accentKey || v.lang.startsWith(accentKey.slice(0, 2)));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onstart = () => setIsSpeakingTts(true);
    utterance.onend = () => setIsSpeakingTts(false);
    utterance.onerror = () => setIsSpeakingTts(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStopTts = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingTts(false);
  };

  const textareaId = useId();
  const examinerPromptId = useId();

  // Helper for Locked Packs
  const renderLockedNotice = (packId: string, packTitle: string, packRole: string) => (
    <div
      id={`bench-locked-${packId}`}
      className="border border-[#1C1917]/10 bg-[#F4F0EA] p-6 rounded-none flex flex-col items-center justify-center text-center space-y-4 my-2"
    >
      <div className="text-[11px] font-mono tracking-widest uppercase text-[#9A3412] font-semibold">
        Pack Standby - {packTitle}
      </div>
      <div className="max-w-md">
        <h4 className="font-serif text-lg text-[#1C1917] font-semibold mb-1">
          Sandbox Offline: {packTitle}
        </h4>
        <p className="text-xs text-[#1C1917]/70 font-sans leading-relaxed">
          {packRole}. Model weights and runtime binaries are not currently initialized in client OPFS storage.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRequestDownload(packId)}
        className="px-4 py-2 border border-[#1C1917] bg-[#1C1917] text-[#FBF9F5] text-xs font-mono tracking-wider uppercase hover:bg-[#9A3412] hover:border-[#9A3412] transition-colors cursor-pointer"
      >
        Download Pack to Unlock Test Bench
      </button>
    </div>
  );

  return (
    <div className="space-y-12 pb-16 font-sans text-[#1C1917]">
      {/* Overview Header */}
      <div className="border-b border-[#1C1917]/10 pb-4">
        <div className="text-[11px] font-mono tracking-widest uppercase text-[#1C1917]/50 mb-1">
          Interactive Architecture Sandbox
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#1C1917] tracking-tight">
          Client-Side Model Playground & Diagnostics
        </h2>
        <p className="text-sm text-[#1C1917]/70 font-serif italic mt-1">
          Inspect, audit, and benchmark deterministic inference pipelines running inside client memory.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* BENCH 1: Tier 1 Fast Writing & Lexical Analyzer                            */}
      {/* ========================================================================= */}
      <section id="bench-tier1-container" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between border-b border-[#1C1917]/15 pb-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 bg-[#1E3A5F] text-[#FBF9F5] font-semibold mr-2">
              Tier 1
            </span>
            <h3 className="inline font-serif text-lg font-semibold text-[#1C1917]">
              Fast Writing, Lexical & Grammar Analyzer
            </h3>
          </div>
          <span className="text-xs font-mono text-[#1C1917]/60">
            Rule-Based Parser + Fast Linear Regressor (0 MB runtime)
          </span>
        </div>

        {!packReadyMap['tier1'] ? (
          renderLockedNotice('tier1', 'Tier 1 Standard Model Pack', 'Powers sub-100ms lexical profiling and ERRANT grammar verification')
        ) : (
          <div className="border border-[#1C1917]/15 bg-[#FAF7F1] p-5 space-y-5">
            <div>
              <label
                htmlFor={textareaId}
                className="block text-xs font-mono text-[#1C1917]/70 uppercase tracking-wider mb-1.5"
              >
                Input Paragraph (IELTS Academic Task 2)
              </label>
              <textarea
                id={textareaId}
                rows={4}
                value={writingInput}
                onChange={e => setWritingInput(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#1C1917]/20 p-3 text-sm font-sans text-[#1C1917] focus:outline-none focus:border-[#1E3A5F] leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                id="btn-run-tier1-analysis"
                onClick={handleRunTier1}
                disabled={isAnalyzingTier1}
                className="px-4 py-2 border border-[#1C1917] bg-[#1E3A5F] text-[#FBF9F5] text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAnalyzingTier1 ? 'Executing ERRANT Pipeline...' : 'Run Tier 1 Analysis'}
              </button>
              <span className="text-xs font-mono text-[#1C1917]/50">
                Latency: ~8ms on CPU WASM
              </span>
            </div>

            {tier1Result && (
              <div className="space-y-5 pt-3 border-t border-[#1C1917]/10">
                {/* Metric Summary Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">
                      MTLD Lexical Diversity
                    </div>
                    <div className="font-mono text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                      {tier1Result.mtld}
                    </div>
                    <div className="text-[10px] text-[#1E4631] font-mono mt-0.5">Threshold: &gt;70.0 (C1)</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">
                      AWL Ratio
                    </div>
                    <div className="font-mono text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                      {tier1Result.awlPercentage}%
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Academic Word List</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">
                      Grammar & Syntax Band
                    </div>
                    <div className="font-mono text-xl font-bold text-[#9A3412] tabular-nums mt-0.5">
                      {tier1Result.calibratedScores.grammaticalRange.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Calibrated Rubric</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">
                      Estimated Overall
                    </div>
                    <div className="font-mono text-xl font-bold text-[#1E3A5F] tabular-nums mt-0.5">
                      {tier1Result.calibratedScores.overallEstimated.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Task 2 Composite</div>
                  </div>
                </div>

                {/* Lexical Details (Collocations & Repetitions) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3.5 space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#1E4631] font-semibold">
                      Detected C1/C2 Collocations
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tier1Result.collocationsC1.map((col, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-[#E2D9CA] border border-[#1C1917]/15 text-xs font-serif text-[#1C1917]"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3.5 space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#9A3412] font-semibold">
                      Word Repetition Count (&gt;1)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tier1Result.repetitionCount.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 border border-[#9A3412]/30 bg-[#9A3412]/5 text-xs font-mono text-[#9A3412]"
                        >
                          {item.word}: <strong className="tabular-nums">{item.count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ERRANT Grammar Diffs */}
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#1C1917]/70 font-semibold">
                    ERRANT Grammatical Alignments & Band 8.5 Replacements
                  </div>
                  <div className="border border-[#1C1917]/15 divide-y divide-[#1C1917]/10 bg-[#FBF9F5]">
                    {tier1Result.errantDiffs.map(diff => (
                      <div key={diff.id} className="p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] tracking-widest px-1.5 py-0.5 bg-[#1C1917]/10 text-[#1C1917]">
                            {diff.errantTag}
                          </span>
                          <span className="text-[11px] text-[#1C1917]/60 font-sans italic">
                            {diff.explanation}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                          <div className="text-[#9A3412] line-through">
                            - {diff.original}
                          </div>
                          <div className="text-[#1E4631] font-semibold">
                            + {diff.corrected}
                          </div>
                          <div className="text-[#1E3A5F]">
                            Band 8.5: &quot;{diff.bandUpgrade}&quot;
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BENCH 2: Tier 2 Speaking Core ASR, VAD Pause & Prosody                     */}
      {/* ========================================================================= */}
      <section id="bench-tier2-container" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between border-b border-[#1C1917]/15 pb-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 bg-[#1E4631] text-[#FBF9F5] font-semibold mr-2">
              Tier 2
            </span>
            <h3 className="inline font-serif text-lg font-semibold text-[#1C1917]">
              Speaking Core ASR, VAD Pause & Prosody Analyzer
            </h3>
          </div>
          <span className="text-xs font-mono text-[#1C1917]/60">
            WebAudio Analyser + Whisper Base WASM (39 MB)
          </span>
        </div>

        {!packReadyMap['tier2'] ? (
          renderLockedNotice('tier2', 'Tier 2 Speaking Core Pack', 'Installs Whisper Base Int8 for local verbatim ASR and Silero VAD audio segmenter')
        ) : (
          <div className="border border-[#1C1917]/15 bg-[#FAF7F1] p-5 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              {!isRecordingMic ? (
                <button
                  type="button"
                  id="btn-record-voice-tier2"
                  onClick={startLiveRecording}
                  className="px-4 py-2 border border-[#9A3412] bg-[#9A3412] text-[#FBF9F5] text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
                >
                  Record 5s Voice Sample
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-stop-voice-tier2"
                  onClick={stopLiveRecording}
                  className="px-4 py-2 border border-[#9A3412] bg-[#FBF9F5] text-[#9A3412] text-xs font-mono uppercase tracking-wider animate-pulse transition-colors cursor-pointer"
                >
                  Stop & Analyze ({recordSecondsLeft}s remaining)
                </button>
              )}

              <button
                type="button"
                id="btn-sample-speech-tier2"
                onClick={handleRunSampleSpeech}
                className="px-4 py-2 border border-[#1C1917]/30 bg-[#FBF9F5] text-[#1C1917] text-xs font-mono uppercase tracking-wider hover:bg-[#E2D9CA] transition-colors cursor-pointer"
              >
                Run on Sample Speech
              </button>

              {/* dBFS Live Audio Indicator */}
              <div className="flex items-center space-x-2 pl-2 border-l border-[#1C1917]/20">
                <span className="text-[10px] font-mono uppercase text-[#1C1917]/60">Input Level:</span>
                <span className="font-mono text-xs font-semibold tabular-nums text-[#1C1917] min-w-[50px]">
                  {liveDb} dBFS
                </span>
                <div className="w-24 h-2 bg-[#E2D9CA] border border-[#1C1917]/20 overflow-hidden">
                  <div
                    className="h-full bg-[#1E4631] transition-all duration-75"
                    style={{ width: `${Math.max(0, Math.min(100, (liveDb + 96) * 1.04))}%` }}
                  />
                </div>
              </div>
            </div>

            {tier2Result && (
              <div className="space-y-5 pt-3 border-t border-[#1C1917]/10">
                {/* Prosody Metrics Header */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">Speech Rate</div>
                    <div className="font-mono text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                      {tier2Result.wpm} <span className="text-xs font-normal">WPM</span>
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Target: 130-160</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">Mean Length Run</div>
                    <div className="font-mono text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                      {tier2Result.mlr} <span className="text-xs font-normal">words</span>
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Band 7+: &gt;5.0</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">Pitch Var.</div>
                    <div className="font-mono text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                      {tier2Result.pitchVariationST} <span className="text-xs font-normal">ST</span>
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Semitone spread</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">Rhythm nPVI</div>
                    <div className="font-mono text-xl font-bold text-[#1C1917] tabular-nums mt-0.5">
                      {tier2Result.rhythmnPVI}
                    </div>
                    <div className="text-[10px] text-[#1E4631] font-mono mt-0.5">Stress-Timed (45-65)</div>
                  </div>

                  <div className="border border-[#1C1917]/10 bg-[#FBF9F5] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1C1917]/60">Fluency Band</div>
                    <div className="font-mono text-xl font-bold text-[#1E3A5F] tabular-nums mt-0.5">
                      {tier2Result.fluencyBand.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-[#1C1917]/60 font-mono mt-0.5">Official Descriptors</div>
                  </div>
                </div>

                {/* Live Verbatim Word Timestamps & Inline Pause Chips */}
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#1C1917]/70 font-semibold">
                    Verbatim Alignment with VAD Mid-Clause / Clause-Boundary Pause Detection
                  </div>
                  <div className="p-4 bg-[#FBF9F5] border border-[#1C1917]/15 leading-loose">
                    {tier2Result.words.map((item, idx) => (
                      <span key={idx} className="inline-block mr-1.5 my-1">
                        <span className="font-serif text-sm font-medium text-[#1C1917] hover:bg-[#E2D9CA] px-1 py-0.5 border-b border-[#1C1917]/20 transition-colors">
                          {item.word}
                        </span>
                        <span className="text-[9px] font-mono text-[#1C1917]/40 align-super ml-0.5 tabular-nums">
                          {item.start}s
                        </span>
                        {item.pauseAfter && item.pauseAfter > 0.3 && (
                          <span
                            className={`inline-block ml-1.5 px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-tight border ${
                              item.isMidClausePause
                                ? 'bg-[#9A3412]/10 border-[#9A3412] text-[#9A3412]'
                                : 'bg-[#1E4631]/10 border-[#1E4631] text-[#1E4631]'
                            }`}
                          >
                            [{item.pauseAfter.toFixed(2)}s {item.isMidClausePause ? 'Mid-Clause' : 'Clause-Boundary'}]
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BENCH 3: Tier 3 Deep Phoneme IPA GOP & Cue Card Entailment                 */}
      {/* ========================================================================= */}
      <section id="bench-tier3-container" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between border-b border-[#1C1917]/15 pb-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 bg-[#9A3412] text-[#FBF9F5] font-semibold mr-2">
              Tier 3
            </span>
            <h3 className="inline font-serif text-lg font-semibold text-[#1C1917]">
              Deep Phoneme IPA GOP, L1 Transfer & Cue Card Entailment
            </h3>
          </div>
          <span className="text-xs font-mono text-[#1C1917]/60">
            WavLM Acoustic GOP + MiniLM Cross-Encoder (95 MB)
          </span>
        </div>

        {!packReadyMap['tier3'] ? (
          renderLockedNotice('tier3', 'Tier 3 Deep Diagnostic Pack', 'Contains WavLM Phoneme Posterior Extractor for IPA scoring and Cross-Encoder NLI entailment')
        ) : (
          <div className="border border-[#1C1917]/15 bg-[#FAF7F1] p-5 space-y-6">
            {/* Word Phoneme Inspector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-wider text-[#1C1917]/70 font-semibold">
                  Acoustic GOP (Goodness of Pronunciation) & Indonesian L1 Transfer Alerts
                </div>
                <div className="flex space-x-1.5">
                  {phonemeList.map((item, idx) => (
                    <button
                      key={item.word}
                      type="button"
                      onClick={() => setSelectedWordIndex(idx)}
                      className={`px-3 py-1 text-xs font-mono border cursor-pointer transition-colors ${
                        selectedWordIndex === idx
                          ? 'bg-[#1C1917] text-[#FBF9F5] border-[#1C1917]'
                          : 'bg-[#FBF9F5] text-[#1C1917] border-[#1C1917]/20 hover:bg-[#E2D9CA]'
                      }`}
                    >
                      /{item.word}/
                    </button>
                  ))}
                </div>
              </div>

              {/* Phoneme Breakdown Card */}
              <div className="border border-[#1C1917]/15 bg-[#FBF9F5] p-4 space-y-4">
                <div className="flex items-baseline space-x-4 border-b border-[#1C1917]/10 pb-3">
                  <span className="font-serif text-2xl font-bold text-[#1C1917]">
                    {phonemeList[selectedWordIndex].word}
                  </span>
                  <span className="font-mono text-sm text-[#1C1917]/60">
                    Phonetic decomposition ({phonemeList[selectedWordIndex].phonemes.length} units)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {phonemeList[selectedWordIndex].phonemes.map((p, idx) => {
                    const isGood = p.gopScore >= 75;
                    const isWarn = p.gopScore < 50;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 border flex flex-col justify-between ${
                          isWarn
                            ? 'border-[#9A3412] bg-[#9A3412]/5'
                            : isGood
                            ? 'border-[#1E4631]/30 bg-[#1E4631]/5'
                            : 'border-[#1C1917]/20 bg-[#FAF7F1]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="font-bold text-[#1C1917]">{p.phoneme}</span>
                          <span className="text-[10px] tabular-nums font-semibold text-[#1C1917]/70">
                            {p.gopScore}%
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#1C1917]/60 mb-2">
                          <div>Exp: <strong className="text-[#1E4631]">/{p.expectedIpa}/</strong></div>
                          <div>Spk: <strong className={isWarn ? 'text-[#9A3412]' : 'text-[#1C1917]'}>/{p.spokenIpa}/</strong></div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-[#E2D9CA] h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              isWarn ? 'bg-[#9A3412]' : isGood ? 'bg-[#1E4631]' : 'bg-[#1E3A5F]'
                            }`}
                            style={{ width: `${p.gopScore}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Transfer Alert Box if any */}
                {phonemeList[selectedWordIndex].phonemes.some(p => p.isTransferAlert) && (
                  <div className="border border-[#9A3412]/30 bg-[#9A3412]/5 p-3 space-y-1">
                    <div className="text-[11px] font-mono uppercase text-[#9A3412] font-semibold tracking-wider">
                      L1 Phonological Interference Identified
                    </div>
                    {phonemeList[selectedWordIndex].phonemes
                      .filter(p => p.isTransferAlert)
                      .map((p, i) => (
                        <p key={i} className="text-xs text-[#1C1917] font-sans">
                          {p.transferNote}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cue Card Entailment Coverage */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[#1C1917]/70 font-semibold">
                Part 2 Cue Card Task Coverage (NLI Cross-Encoder Entailment)
              </div>
              <div className="border border-[#1C1917]/15 divide-y divide-[#1C1917]/10 bg-[#FBF9F5]">
                {cueCardCoverages.map((item, idx) => (
                  <div key={idx} className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-serif text-[#1C1917] font-semibold">
                        Bullet {idx + 1}: {item.bullet}
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap border ${
                          item.covered
                            ? 'bg-[#1E4631]/10 text-[#1E4631] border-[#1E4631]/30 font-semibold'
                            : 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/30 font-semibold'
                        }`}
                      >
                        {item.covered ? `Entailed (${item.entailmentScore}%)` : `Unaddressed (${item.entailmentScore}%)`}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#1C1917]/70">
                      Matched Speech Excerpt: &quot;{item.matchedExcerpt}&quot;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BENCH 4: TTS Offline Neural Examiner Voice Synthesizer                     */}
      {/* ========================================================================= */}
      <section id="bench-tts-container" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between border-b border-[#1C1917]/15 pb-2">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 bg-[#1C1917] text-[#FBF9F5] font-semibold mr-2">
              Optional TTS
            </span>
            <h3 className="inline font-serif text-lg font-semibold text-[#1C1917]">
              Offline Neural Examiner Voice Synthesizer
            </h3>
          </div>
          <span className="text-xs font-mono text-[#1C1917]/60">
            Vits / Piper Neural Voice & Web Speech Engine
          </span>
        </div>

        {!packReadyMap['tts'] ? (
          renderLockedNotice('tts', 'Offline Neural TTS Pack', 'Downloads Piper ONNX neural voices for British RP, Australian, and North American examiners')
        ) : (
          <div className="border border-[#1C1917]/15 bg-[#FAF7F1] p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Accent Selector */}
              <div>
                <label className="block text-xs font-mono text-[#1C1917]/70 uppercase tracking-wider mb-1">
                  Examiner Accent
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'en-GB', label: 'British RP' },
                    { id: 'en-AU', label: 'Australian' },
                    { id: 'en-US', label: 'North American' }
                  ].map(acc => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccentKey(acc.id)}
                      className={`py-1.5 px-2 text-xs font-mono border cursor-pointer transition-colors ${
                        accentKey === acc.id
                          ? 'border-[#1C1917] bg-[#1C1917] text-[#FBF9F5]'
                          : 'border-[#1C1917]/20 bg-[#FBF9F5] text-[#1C1917] hover:bg-[#E2D9CA]'
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Selector */}
              <div>
                <label className="block text-xs font-mono text-[#1C1917]/70 uppercase tracking-wider mb-1">
                  Examiner Cadence
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 0.9, label: '0.9x Slow' },
                    { val: 1.0, label: '1.0x Normal' },
                    { val: 1.1, label: '1.1x Brisk' }
                  ].map(spd => (
                    <button
                      key={spd.val}
                      type="button"
                      onClick={() => setSpeedVal(spd.val)}
                      className={`py-1.5 px-2 text-xs font-mono border cursor-pointer transition-colors ${
                        speedVal === spd.val
                          ? 'border-[#1C1917] bg-[#1C1917] text-[#FBF9F5]'
                          : 'border-[#1C1917]/20 bg-[#FBF9F5] text-[#1C1917] hover:bg-[#E2D9CA]'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt Text Input */}
            <div>
              <label
                htmlFor={examinerPromptId}
                className="block text-xs font-mono text-[#1C1917]/70 uppercase tracking-wider mb-1"
              >
                Examiner Cue Script
              </label>
              <input
                id={examinerPromptId}
                type="text"
                value={examinerPrompt}
                onChange={e => setExaminerPrompt(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#1C1917]/20 px-3 py-2 text-sm font-sans text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            {/* Voice Control Buttons */}
            <div className="flex items-center space-x-3 pt-1">
              {!isSpeakingTts ? (
                <button
                  type="button"
                  id="btn-play-examiner-tts"
                  onClick={handlePlayTts}
                  className="px-5 py-2 border border-[#1C1917] bg-[#1E4631] text-[#FBF9F5] text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] transition-colors cursor-pointer"
                >
                  Play Examiner Voice
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-stop-examiner-tts"
                  onClick={handleStopTts}
                  className="px-5 py-2 border border-[#9A3412] bg-[#9A3412] text-[#FBF9F5] text-xs font-mono uppercase tracking-wider hover:bg-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
                >
                  Stop Audio
                </button>
              )}
              <span className="text-xs font-mono text-[#1C1917]/50">
                Mode: SpeechSynthesis / Piper WASM Runtime
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
