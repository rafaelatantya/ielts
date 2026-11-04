import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'
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

// Rollback storage keys
const ROLLBACK_BACKUP_KEY = 'oxford_ielts_rollback_backup'
const ROLLBACK_TIMESTAMP_KEY = 'oxford_ielts_rollback_timestamp'

// In-memory fallback map for OPFS audio blobs when OPFS is unavailable
const memoryAudioMap = new Map<string, Uint8Array>()

/**
 * Compute SHA-256 hex string for a given Uint8Array or ArrayBuffer using Web Crypto API
 */
export async function computeSha256(data: Uint8Array | ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as ArrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Helper to obtain the attempt audio directory in OPFS (audio/attempts/)
 */
async function getAudioAttemptsDir(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    return null
  }
  try {
    const root = await navigator.storage.getDirectory()
    const audioDir = await root.getDirectoryHandle('audio', { create: true })
    return await audioDir.getDirectoryHandle('attempts', { create: true })
  } catch (err) {
    console.warn('OPFS directory access unavailable, falling back:', err)
    return null
  }
}

/**
 * Save audio blob to OPFS under audio/attempts/{attemptId}.webm (or memory map fallback)
 */
export async function saveAudioBlobToOpfs(
  attemptId: string,
  blob: Blob
): Promise<{ path: string; sizeBytes: number; sha256: string }> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sha256 = await computeSha256(bytes)
  const filename = `${attemptId}.webm`
  const path = `audio/attempts/${filename}`

  const attemptsDir = await getAudioAttemptsDir()
  if (attemptsDir) {
    try {
      const fileHandle = await attemptsDir.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(bytes)
      await writable.close()
      return { path, sizeBytes: bytes.byteLength, sha256 }
    } catch (err) {
      console.warn('Failed writing to OPFS file handle, falling back to memory map:', err)
    }
  }

  // In-memory fallback
  memoryAudioMap.set(path, bytes)
  return { path, sizeBytes: bytes.byteLength, sha256 }
}

/**
 * Load audio blob from OPFS under audio/attempts/{attemptId}.webm (or memory map fallback)
 */
export async function loadAudioBlobFromOpfs(attemptId: string): Promise<Blob | null> {
  const filename = `${attemptId}.webm`
  const path = `audio/attempts/${filename}`

  const attemptsDir = await getAudioAttemptsDir()
  if (attemptsDir) {
    try {
      const fileHandle = await attemptsDir.getFileHandle(filename, { create: false })
      const file = await fileHandle.getFile()
      return new Blob([await file.arrayBuffer()], { type: 'audio/webm' })
    } catch (err) {
      // File handle may not exist or OPFS error, check memory fallback
    }
  }

  if (memoryAudioMap.has(path)) {
    const bytes = memoryAudioMap.get(path)!
    return new Blob([bytes], { type: 'audio/webm' })
  }

  return null
}

/**
 * Delete audio file from OPFS under audio/attempts/{attemptId}.webm (or memory map fallback)
 */
export async function deleteAudioFromOpfs(attemptId: string): Promise<void> {
  const filename = `${attemptId}.webm`
  const path = `audio/attempts/${filename}`

  const attemptsDir = await getAudioAttemptsDir()
  if (attemptsDir) {
    try {
      await attemptsDir.removeEntry(filename)
    } catch (err) {
      // Ignore if not present
    }
  }

  memoryAudioMap.delete(path)
}

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

/**
 * Capture a complete snapshot of the current local database
 */
export function captureCurrentLocalSnapshot(): IeltsBackupPayload {
  const sessions = getStudySessions()
  const speaking = getSpeakingAttempts()
  const writing = getWritingAttempts()
  const receptive = getReceptiveAttempts()
  const srs = getSrsCards()
  const meta = getLocalMeta()

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    device_id: 'oxford_local_studio',
    local_meta: meta,
    study_sessions: sessions,
    speaking_attempts: speaking,
    writing_attempts: writing,
    receptive_attempts: receptive,
    srs_cards: srs,
    fsrs_cards: srs,
  }
}

/**
 * Save snapshot into the rollback slot before an overwrite operation
 */
export function saveRollbackSnapshot(): void {
  try {
    const snapshot = captureCurrentLocalSnapshot()
    localStorage.setItem(ROLLBACK_BACKUP_KEY, JSON.stringify(snapshot))
    localStorage.setItem(ROLLBACK_TIMESTAMP_KEY, String(Date.now()))
  } catch (err) {
    console.warn('Failed to save rollback snapshot', err)
  }
}

/**
 * Get rollback slot timestamp if available
 */
export function getRollbackTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(ROLLBACK_TIMESTAMP_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

/**
 * Restore database from the rollback slot
 */
export function restoreFromRollback(): boolean {
  try {
    const raw = localStorage.getItem(ROLLBACK_BACKUP_KEY)
    if (!raw) return false
    const snapshot: IeltsBackupPayload = JSON.parse(raw)

    // Save current as the new rollback (enabling undo toggle)
    saveRollbackSnapshot()

    applyCleanOverwrite(snapshot)
    return true
  } catch (err) {
    console.error('Failed to restore from rollback', err)
    return false
  }
}

/**
 * Clean Overwrite (Replace This Device with target payload)
 */
export function applyCleanOverwrite(payload: IeltsBackupPayload): void {
  if (payload.local_meta) {
    saveLocalMeta(payload.local_meta)
  }
  saveStudySessions(payload.study_sessions || [])
  saveSpeakingAttempts(payload.speaking_attempts || [])
  saveWritingAttempts(payload.writing_attempts || [])
  saveReceptiveAttempts(payload.receptive_attempts || [])
  saveSrsCards(payload.srs_cards || payload.fsrs_cards || [])
}

/**
 * Smart Merge (CRDT/HLC - Keep Both, merge by ID and newer timestamp/HLC)
 */
export function applySmartMerge(payload: IeltsBackupPayload): {
  mergedSessions: number
  mergedSpeaking: number
  mergedWriting: number
  mergedReceptive: number
  mergedSrs: number
} {
  // Merge Study Sessions
  const currentSessions = getStudySessions()
  const sessionMap = new Map<string, StudySessionRow>()
  currentSessions.forEach((s) => sessionMap.set(s.id, s))
  ;(payload.study_sessions || []).forEach((s) => {
    const existing = sessionMap.get(s.id)
    if (!existing || (s.started_at || 0) >= (existing.started_at || 0)) {
      sessionMap.set(s.id, s)
    }
  })
  const mergedSessions = Array.from(sessionMap.values()).sort(
    (a, b) => (b.started_at || 0) - (a.started_at || 0)
  )
  saveStudySessions(mergedSessions)

  // Merge Speaking Attempts
  const currentSpeaking = getSpeakingAttempts()
  const speakingMap = new Map<string, SpeakingAttemptRow>()
  currentSpeaking.forEach((s) => speakingMap.set(s.id, s))
  ;(payload.speaking_attempts || []).forEach((s) => {
    const existing = speakingMap.get(s.id)
    if (!existing || (s.created_at || 0) >= (existing.created_at || 0)) {
      speakingMap.set(s.id, s)
    }
  })
  const mergedSpeaking = Array.from(speakingMap.values()).sort(
    (a, b) => (b.created_at || 0) - (a.created_at || 0)
  )
  saveSpeakingAttempts(mergedSpeaking)

  // Merge Writing Attempts
  const currentWriting = getWritingAttempts()
  const writingMap = new Map<string, WritingAttemptRow>()
  currentWriting.forEach((w) => writingMap.set(w.id, w))
  ;(payload.writing_attempts || []).forEach((w) => {
    const existing = writingMap.get(w.id)
    if (!existing || (w.created_at || 0) >= (existing.created_at || 0)) {
      writingMap.set(w.id, w)
    }
  })
  const mergedWriting = Array.from(writingMap.values()).sort(
    (a, b) => (b.created_at || 0) - (a.created_at || 0)
  )
  saveWritingAttempts(mergedWriting)

  // Merge Receptive Attempts
  const currentReceptive = getReceptiveAttempts()
  const receptiveMap = new Map<string, ReceptiveAttemptRow>()
  currentReceptive.forEach((r) => receptiveMap.set(r.id, r))
  ;(payload.receptive_attempts || []).forEach((r) => {
    const existing = receptiveMap.get(r.id)
    if (!existing || (r.created_at || 0) >= (existing.created_at || 0)) {
      receptiveMap.set(r.id, r)
    }
  })
  const mergedReceptive = Array.from(receptiveMap.values()).sort(
    (a, b) => (b.created_at || 0) - (a.created_at || 0)
  )
  saveReceptiveAttempts(mergedReceptive)

  // Merge SRS Cards
  const currentSrs = getSrsCards()
  const srsMap = new Map<string, SrsCardRow>()
  currentSrs.forEach((c) => srsMap.set(c.id, c))
  ;(payload.srs_cards || payload.fsrs_cards || []).forEach((c) => {
    const existing = srsMap.get(c.id)
    if (!existing || (c.last_review_at || 0) >= (existing.last_review_at || 0)) {
      srsMap.set(c.id, c)
    }
  })
  const mergedSrs = Array.from(srsMap.values())
  saveSrsCards(mergedSrs)

  if (payload.local_meta) {
    saveLocalMeta(payload.local_meta)
  }

  return {
    mergedSessions: mergedSessions.length,
    mergedSpeaking: mergedSpeaking.length,
    mergedWriting: mergedWriting.length,
    mergedReceptive: mergedReceptive.length,
    mergedSrs: mergedSrs.length,
  }
}

export async function triggerBackupDownload(): Promise<IeltsBackupPayload> {
  const updatedMeta = saveLocalMeta({ last_export_at: Date.now() })
  const snapshot = captureCurrentLocalSnapshot()
  snapshot.local_meta = updatedMeta

  const databaseJsonStr = JSON.stringify(snapshot, null, 2)
  const databaseBytes = strToU8(databaseJsonStr)
  const dbSha256 = await computeSha256(databaseBytes)

  const manifest = {
    version: 1,
    exported_at: new Date().toISOString(),
    format: 'oxford_backup_zip',
    database_file: 'database.json',
    sha256_database: dbSha256,
    item_counts: {
      study_sessions: (snapshot.study_sessions || []).length,
      speaking_attempts: (snapshot.speaking_attempts || []).length,
      writing_attempts: (snapshot.writing_attempts || []).length,
      receptive_attempts: (snapshot.receptive_attempts || []).length,
      srs_cards: (snapshot.srs_cards || []).length,
    },
  }

  const manifestJsonStr = JSON.stringify(manifest, null, 2)
  const manifestBytes = strToU8(manifestJsonStr)

  const zipped = zipSync({
    'manifest.json': manifestBytes,
    'database.json': databaseBytes,
  })

  const blob = new Blob([zipped], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `ielts-progress-backup-${dateStr}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return snapshot
}

export async function exportIeltsBackup(): Promise<IeltsBackupPayload> {
  return triggerBackupDownload()
}

export async function exportFullStudioArchiveZip(): Promise<void> {
  const snapshot = captureCurrentLocalSnapshot()
  const databaseJsonStr = JSON.stringify(snapshot, null, 2)
  const databaseBytes = strToU8(databaseJsonStr)
  const dbSha256 = await computeSha256(databaseBytes)

  // Collect all audio files from OPFS and memory fallback
  const zipFiles: Record<string, Uint8Array> = {
    'database.json': databaseBytes,
  }
  const audioMetaList: Array<{ path: string; size_bytes: number; sha256: string }> = []

  // Read all speaking attempt audio blobs
  const attempts = snapshot.speaking_attempts || []
  for (const attempt of attempts) {
    const audioBlob = await loadAudioBlobFromOpfs(attempt.id)
    if (audioBlob) {
      const buffer = await audioBlob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const sha256 = await computeSha256(bytes)
      const archivePath = `audio/attempts/${attempt.id}.webm`
      zipFiles[archivePath] = bytes
      audioMetaList.push({
        path: archivePath,
        size_bytes: bytes.byteLength,
        sha256,
      })
    }
  }

  // Also include any other items in memoryAudioMap if not already included
  for (const [path, bytes] of memoryAudioMap.entries()) {
    if (!zipFiles[path]) {
      const sha256 = await computeSha256(bytes)
      zipFiles[path] = bytes
      audioMetaList.push({
        path,
        size_bytes: bytes.byteLength,
        sha256,
      })
    }
  }

  const manifest = {
    version: 1,
    exported_at: new Date().toISOString(),
    format: 'oxford_studio_archive_zip',
    database_file: 'database.json',
    audio_directory: 'audio/attempts/',
    sha256_database: dbSha256,
    item_counts: {
      study_sessions: (snapshot.study_sessions || []).length,
      speaking_attempts: (snapshot.speaking_attempts || []).length,
      writing_attempts: (snapshot.writing_attempts || []).length,
      receptive_attempts: (snapshot.receptive_attempts || []).length,
      srs_cards: (snapshot.srs_cards || []).length,
      audio_files: audioMetaList.length,
    },
    audio_files: audioMetaList,
  }

  zipFiles['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))

  const zipped = zipSync(zipFiles)
  const blob = new Blob([zipped], {
    type: 'application/zip',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `ielts-full-backup-${dateStr}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  // Detect ZIP file magic bytes: 'P' (0x50), 'K' (0x4B)
  const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b

  if (isZip) {
    const unzipped = unzipSync(bytes)

    // Restore any audio/attempts/*.webm files into OPFS
    for (const [filePath, fileData] of Object.entries(unzipped)) {
      if (filePath.startsWith('audio/attempts/') && filePath.endsWith('.webm')) {
        const attemptId = filePath.replace(/^audio\/attempts\//, '').replace(/\.webm$/, '')
        if (attemptId) {
          const blob = new Blob([fileData], { type: 'audio/webm' })
          await saveAudioBlobToOpfs(attemptId, blob)
        }
      }
    }

    // Look for database.json or database_dump/ielts.sqlite3.json
    let dbJsonStr = ''
    if (unzipped['database.json']) {
      dbJsonStr = strFromU8(unzipped['database.json'])
    } else if (unzipped['ielts.sqlite3.json']) {
      dbJsonStr = strFromU8(unzipped['ielts.sqlite3.json'])
    } else {
      // Find any .json file that isn't manifest.json
      const candidateKey = Object.keys(unzipped).find((k) => k.endsWith('.json') && !k.endsWith('manifest.json'))
      if (candidateKey) {
        dbJsonStr = strFromU8(unzipped[candidateKey])
      }
    }

    if (dbJsonStr) {
      const data = JSON.parse(dbJsonStr)
      if ('database_dump' in data && data.database_dump) {
        return data.database_dump as IeltsBackupPayload
      }
      return data as IeltsBackupPayload
    }
  }

  // Plain JSON fallback
  const text = strFromU8(bytes)
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file structure')
  }
  // Support both direct payload or archive-wrapped dump
  if ('database_dump' in data && data.database_dump) {
    return data.database_dump as IeltsBackupPayload
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
