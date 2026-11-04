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

export interface IeltsBackupPayload {
  version: number
  exported_at: string
  device_id: string
  local_meta: Partial<LocalMeta>
  study_sessions?: unknown[]
  speaking_attempts?: unknown[]
  writing_attempts?: unknown[]
  fsrs_cards?: unknown[]
}
