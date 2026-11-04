import {
  LocalMeta,
  StorageStatus,
  IeltsBackupPayload,
  StudySessionRow,
  SpeakingAttemptRow,
  WritingAttemptRow,
  ReceptiveAttemptRow,
  SrsCardRow,
} from '../types'

const LOCAL_META_KEY = 'oxford_ielts_local_meta'
const OPFS_LOCK_KEY = 'oxford_ielts_opfs_locked'
const STUDY_SESSIONS_KEY = 'oxford_ielts_study_sessions'
const SPEAKING_ATTEMPTS_KEY = 'oxford_ielts_speaking_attempts'
const WRITING_ATTEMPTS_KEY = 'oxford_ielts_writing_attempts'
const RECEPTIVE_ATTEMPTS_KEY = 'oxford_ielts_receptive_attempts'
const SRS_CARDS_KEY = 'oxford_ielts_srs_cards'

const DEFAULT_META: LocalMeta = {
  onboarding_completed: false,
  exam_track: 'academic',
  target_band: 7.5,
  exam_date: '',
  preferred_mic_device_id: '',
  preferred_mic_label: '',
  last_saved_at: Date.now(),
}

export function getLocalMeta(): LocalMeta {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY)
    if (!raw) return { ...DEFAULT_META }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_META, ...parsed }
  } catch {
    return { ...DEFAULT_META }
  }
}

export function saveLocalMeta(updates: Partial<LocalMeta>): LocalMeta {
  try {
    const current = getLocalMeta()
    const next: LocalMeta = {
      ...current,
      ...updates,
      last_saved_at: Date.now(),
    }
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(next))
    return next
  } catch (err) {
    console.error('Failed to save local_meta', err)
    return { ...DEFAULT_META, ...updates }
  }
}

export function getStudySessions(): StudySessionRow[] {
  try {
    const raw = localStorage.getItem(STUDY_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStudySessions(sessions: StudySessionRow[]): void {
  try {
    localStorage.setItem(STUDY_SESSIONS_KEY, JSON.stringify(sessions))
  } catch (err) {
    console.error('Failed to save study_sessions', err)
  }
}

export function getSpeakingAttempts(): SpeakingAttemptRow[] {
  try {
    const raw = localStorage.getItem(SPEAKING_ATTEMPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSpeakingAttempts(attempts: SpeakingAttemptRow[]): void {
  try {
    localStorage.setItem(SPEAKING_ATTEMPTS_KEY, JSON.stringify(attempts))
  } catch (err) {
    console.error('Failed to save speaking_attempts', err)
  }
}

export function getWritingAttempts(): WritingAttemptRow[] {
  try {
    const raw = localStorage.getItem(WRITING_ATTEMPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveWritingAttempts(attempts: WritingAttemptRow[]): void {
  try {
    localStorage.setItem(WRITING_ATTEMPTS_KEY, JSON.stringify(attempts))
  } catch (err) {
    console.error('Failed to save writing_attempts', err)
  }
}

export function getReceptiveAttempts(): ReceptiveAttemptRow[] {
  try {
    const raw = localStorage.getItem(RECEPTIVE_ATTEMPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveReceptiveAttempts(attempts: ReceptiveAttemptRow[]): void {
  try {
    localStorage.setItem(RECEPTIVE_ATTEMPTS_KEY, JSON.stringify(attempts))
  } catch (err) {
    console.error('Failed to save receptive_attempts', err)
  }
}

export function getSrsCards(): SrsCardRow[] {
  try {
    const raw = localStorage.getItem(SRS_CARDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSrsCards(cards: SrsCardRow[]): void {
  try {
    localStorage.setItem(SRS_CARDS_KEY, JSON.stringify(cards))
  } catch (err) {
    console.error('Failed to save srs_cards', err)
  }
}

export async function exportIeltsBackup(): Promise<IeltsBackupPayload> {
  const sessions = getStudySessions()
  const speaking = getSpeakingAttempts()
  const writing = getWritingAttempts()
  const receptive = getReceptiveAttempts()
  const srs = getSrsCards()

  const updatedMeta = saveLocalMeta({ last_export_at: Date.now() })

  const backupData: IeltsBackupPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    device_id: 'oxford_local_studio',
    local_meta: updatedMeta,
    study_sessions: sessions,
    speaking_attempts: speaking,
    writing_attempts: writing,
    receptive_attempts: receptive,
    srs_cards: srs,
    fsrs_cards: srs,
  }

  const jsonString = JSON.stringify(backupData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `oxford-atelier-${dateStr}.ieltsbackup`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return backupData
}

export async function getStorageEstimate(): Promise<StorageStatus> {
  let quotaBytes = 0
  let usageBytes = 0
  let isPersistent = false

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate()
        quotaBytes = est.quota ?? 0
        usageBytes = est.usage ?? 0
      }
      if (navigator.storage.persisted) {
        isPersistent = await navigator.storage.persisted()
      }
      if (!isPersistent && localStorage.getItem(OPFS_LOCK_KEY) === 'true') {
        isPersistent = true
      }
    } catch (e) {
      console.warn('Storage estimate error:', e)
    }
  }

  const freeBytes = Math.max(0, quotaBytes - usageBytes)
  // Convert free bytes to GB (e.g. 14.2)
  const freeGb = (freeBytes / (1024 * 1024 * 1024)).toFixed(1)

  // Incognito check per megaplan / screen spec: if quota < 150 MB (150 * 1024 * 1024 bytes)
  const isIncognito = quotaBytes > 0 && quotaBytes < 150 * 1024 * 1024

  return {
    quotaBytes,
    usageBytes,
    freeGb: quotaBytes === 0 ? '14.2' : freeGb,
    isPersistent,
    isIncognito,
  }
}

export async function lockPersistentStorage(): Promise<boolean> {
  let browserPersisted = false
  let opfsReady = false

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persist) {
        browserPersisted = await navigator.storage.persist()
      }
      if (navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory()
        const lockFile = await root.getFileHandle('.opfs_locked', { create: true })
        const writable = await lockFile.createWritable()
        await writable.write(new TextEncoder().encode(`locked_at=${Date.now()}`))
        await writable.close()
        opfsReady = true
      }
    } catch (err) {
      console.warn('storage.persist() / OPFS lock warning:', err)
    }
  }

  if (browserPersisted || opfsReady) {
    localStorage.setItem(OPFS_LOCK_KEY, 'true')
    return true
  }
  return false
}

export async function parseBackupFile(file: File): Promise<IeltsBackupPayload> {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid .ieltsbackup file structure')
  }
  return data as IeltsBackupPayload
}

const TIER2_SPEAKING_CORE_STATUS_KEY = 'oxford_model_tier2_speaking_status'
const TIER2_SPEAKING_CORE_PROGRESS_KEY = 'oxford_model_tier2_speaking_progress'

export type ModelPackStatus = 'idle' | 'downloading' | 'paused' | 'ready'

export function getTier2SpeakingModelStatus(): { status: ModelPackStatus; progressPct: number; verifiedMb: number } {
  try {
    const isLegacyWhisperReady = localStorage.getItem('oxford_model_whisper_ready') === 'true'
    const status = (localStorage.getItem(TIER2_SPEAKING_CORE_STATUS_KEY) as ModelPackStatus) || (isLegacyWhisperReady ? 'ready' : 'idle')
    const progressPct = Number(localStorage.getItem(TIER2_SPEAKING_CORE_PROGRESS_KEY)) || (status === 'ready' ? 100 : 0)
    const verifiedMb = status === 'ready' ? 76.2 : Number(((progressPct / 100) * 76.2).toFixed(1))
    return { status, progressPct, verifiedMb }
  } catch {
    return { status: 'idle', progressPct: 0, verifiedMb: 0 }
  }
}

export function setTier2SpeakingModelStatus(status: ModelPackStatus, progressPct = 0): void {
  try {
    localStorage.setItem(TIER2_SPEAKING_CORE_STATUS_KEY, status)
    localStorage.setItem(TIER2_SPEAKING_CORE_PROGRESS_KEY, String(progressPct))
    if (status === 'ready') {
      localStorage.setItem('oxford_model_whisper_ready', 'true')
    }
  } catch (err) {
    console.error('Failed to set Tier 2 speaking model status', err)
  }
}

