export type ExamTrack = 'academic' | 'general'

export type BandScore = 6.0 | 6.5 | 7.0 | 7.5 | 8.0 | 8.5 | 9.0

export interface LocalMeta {
  onboarding_completed: boolean
  exam_track: ExamTrack
  target_band: number
  exam_date: string
  preferred_mic_device_id: string
  preferred_mic_label: string
  last_saved_at: number
  last_export_at?: number
}

export interface StorageStatus {
  quotaBytes: number
  usageBytes: number
  freeGb: string
  isPersistent: boolean
  isIncognito: boolean
}

export interface MicDeviceInfo {
  deviceId: string
  label: string
}

export type LeaderStatus = 'leader' | 'follower'

export interface StudySessionRow {
  id: string
  user_id?: string | null
  module: 'speaking' | 'writing' | 'reading' | 'listening'
  mode: string
  started_at: number
  completed_at?: number | null
  overall_band?: number | null
  subscores_json?: string | null
  prompt_title?: string | null
  hlc: string
  is_deleted?: number
}

export interface SpeakingAttemptRow {
  id: string
  session_id: string
  prompt_id: string
  part: number
  question_text: string
  duration_ms: number
  audio_opfs_path?: string | null
  audio_sha256?: string | null
  audio_size_bytes?: number | null
  audio_r2_synced?: number
  transcript_raw: string
  word_timestamps_json: string
  acoustic_metrics_json: string
  lexical_metrics_json: string
  grammar_metrics_json: string
  semantic_metrics_json: string
  band_fc: number
  band_lr: number
  band_gra: number
  band_p: number
  band_overall: number
  created_at: number
  hlc: string
  is_deleted?: number
}

export interface WritingAttemptRow {
  id: string
  session_id: string
  prompt_id: string
  task_number: number
  essay_text: string
  word_count: number
  time_spent_ms: number
  metrics_json: string
  inline_annotations_json: string
  band_ta_tr: number
  band_cc: number
  band_lr: number
  band_gra: number
  band_overall: number
  created_at: number
  hlc: string
  is_deleted?: number
}

export interface ReceptiveAttemptRow {
  id: string
  session_id: string
  prompt_id: string
  module: 'reading' | 'listening'
  raw_score: number
  total_questions: number
  band_score: number
  answers_json: string
  highlights_json?: string | null
  created_at: number
  hlc: string
  is_deleted?: number
}

export interface SrsCardRow {
  id: string
  source_attempt_id?: string | null
  card_type: 'pronunciation' | 'grammar_fix' | 'collocation' | string
  front_text: string
  back_text: string
  context_sentence?: string | null
  ipa_phonetic?: string | null
  due_at: number
  stability?: number
  difficulty?: number
  elapsed_days?: number
  scheduled_days?: number
  reps?: number
  lapses?: number
  state?: number
  last_review_at?: number | null
  hlc: string
  is_deleted?: number
}

export interface IeltsBackupPayload {
  version: number
  exported_at: string
  device_id: string
  local_meta: Partial<LocalMeta>
  study_sessions?: StudySessionRow[]
  speaking_attempts?: SpeakingAttemptRow[]
  writing_attempts?: WritingAttemptRow[]
  receptive_attempts?: ReceptiveAttemptRow[]
  srs_cards?: SrsCardRow[]
  fsrs_cards?: SrsCardRow[]
}
