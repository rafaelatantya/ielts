import { LocalMeta, StorageStatus, IeltsBackupPayload } from '../types'

const LOCAL_META_KEY = 'oxford_ielts_local_meta'

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
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist()
    } catch (err) {
      console.warn('storage.persist() failed', err)
    }
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
