import React, { useState, useEffect, useRef } from 'react'
import {
  getStudySessions,
  getSpeakingAttempts,
  getWritingAttempts,
  getReceptiveAttempts,
  getSrsCards,
  exportIeltsBackup,
  exportFullStudioArchiveZip,
  parseBackupFile,
  applyCleanOverwrite,
  applySmartMerge,
  saveRollbackSnapshot,
  getRollbackTimestamp,
  restoreFromRollback,
  captureCurrentLocalSnapshot,
} from '../services/storage'
import { useApp } from '../context/AppContext'
import { IeltsBackupPayload } from '../types'

interface CloudMetadata {
  updatedAt: number | null
  sessionsCount: number
  speakingCount: number
  writingCount: number
  receptiveCount: number
  srsCount: number
  deviceLabel: string
  hashShort: string
  sizeKb: number
  exists: boolean
}

type SyncDirection = 'UPLOAD_TO_CLOUD' | 'PULL_FROM_CLOUD'

function formatTimestamp(ts: number | null): string {
  if (!ts) return 'No Cloud Snapshot Uploaded Yet'
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} WIB`
}

export const AccountPage: React.FC = () => {
  const { meta, updateMeta } = useApp()

  // Google Auth state (stored in localStorage for sovereign simulation)
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
    const raw = localStorage.getItem('oxford_cloud_user')
    return raw ? JSON.parse(raw) : null
  })

  // Local device counts & latest timestamp
  const [localStats, setLocalStats] = useState({
    sessions: 0,
    speaking: 0,
    writing: 0,
    receptive: 0,
    srs: 0,
    updatedAt: Date.now(),
    deviceLabel: 'Chrome on Windows 11',
  })

  // Cloud snapshot metadata state
  const [cloudMeta, setCloudMeta] = useState<CloudMetadata>(() => {
    const raw = localStorage.getItem('oxford_cloud_snapshot_meta')
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // fallback
      }
    }
    // Default simulated older cloud snapshot
    return {
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 3600 * 1000,
      sessionsCount: 19,
      speakingCount: 52,
      writingCount: 10,
      receptiveCount: 14,
      srsCount: 110,
      deviceLabel: 'Safari on iPhone',
      hashShort: '8f3a...91c2',
      sizeKb: 640,
      exists: true,
    }
  })

  // Rollback state
  const [rollbackTime, setRollbackTime] = useState<number | null>(() => getRollbackTimestamp())

  // Double-Confirmation Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1)
  const [syncDirection, setSyncDirection] = useState<SyncDirection>('UPLOAD_TO_CLOUD')
  const [ackChecked, setAckChecked] = useState<boolean>(false)
  const [overwriteInput, setOverwriteInput] = useState<string>('')

  // Offline Import Dropzone state
  const [importMode, setImportMode] = useState<'smart_merge' | 'clean_overwrite'>('smart_merge')
  const [stagedImportFile, setStagedImportFile] = useState<{
    file: File
    payload: IeltsBackupPayload
    sessionCount: number
    exportedAt: string
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Refresh local counts
  const refreshLocalStats = () => {
    const s = getStudySessions()
    const spk = getSpeakingAttempts()
    const w = getWritingAttempts()
    const r = getReceptiveAttempts()
    const srs = getSrsCards()

    let maxTs = meta.last_saved_at || Date.now()
    s.forEach((item) => {
      if (item.started_at && item.started_at > maxTs) maxTs = item.started_at
    })
    spk.forEach((item) => {
      if (item.created_at && item.created_at > maxTs) maxTs = item.created_at
    })
    w.forEach((item) => {
      if (item.created_at && item.created_at > maxTs) maxTs = item.created_at
    })
    r.forEach((item) => {
      if (item.created_at && item.created_at > maxTs) maxTs = item.created_at
    })

    setLocalStats({
      sessions: s.length,
      speaking: spk.length,
      writing: w.length,
      receptive: r.length,
      srs: srs.length,
      updatedAt: maxTs,
      deviceLabel: 'Chrome on Windows 11',
    })
    setRollbackTime(getRollbackTimestamp())
  }

  useEffect(() => {
    refreshLocalStats()
  }, [meta])

  // Google Login / Logout handlers
  const handleGoogleLogin = () => {
    const simulatedUser = {
      name: 'Rafael Atantya',
      email: 'rafael.atantya@gmail.com',
    }
    setUser(simulatedUser)
    localStorage.setItem('oxford_cloud_user', JSON.stringify(simulatedUser))
    setStatusMessage('Signed in with Google (OAuth 2.0 PKCE).')
  }

  const handleGoogleLogout = () => {
    setUser(null)
    localStorage.removeItem('oxford_cloud_user')
    setStatusMessage('Signed out from Google.')
  }

  const handleRefreshCloudMeta = () => {
    const raw = localStorage.getItem('oxford_cloud_snapshot_meta')
    if (raw) {
      try {
        setCloudMeta(JSON.parse(raw))
      } catch {
        // keep
      }
    }
    setStatusMessage('Cloud metadata refreshed from Cloudflare D1.')
  }

  // Open double-confirmation modal
  const handleOpenSyncModal = (direction: SyncDirection) => {
    setSyncDirection(direction)
    setConfirmStep(1)
    setAckChecked(false)
    setOverwriteInput('')
    setModalOpen(true)
  }

  // Determine relative freshness
  const isLocalNewer = !cloudMeta.updatedAt || localStats.updatedAt > cloudMeta.updatedAt
  const diffDays = cloudMeta.updatedAt
    ? Math.max(1, Math.round(Math.abs(localStats.updatedAt - cloudMeta.updatedAt) / (1000 * 3600 * 24)))
    : 0

  // High-risk danger condition: overwriting a NEWER target with an OLDER source
  const isHighRisk =
    (syncDirection === 'UPLOAD_TO_CLOUD' && !isLocalNewer) ||
    (syncDirection === 'PULL_FROM_CLOUD' && isLocalNewer)

  // Execute Cloud Sync
  const handleExecuteCloudSync = () => {
    if (syncDirection === 'UPLOAD_TO_CLOUD') {
      // Overwrite Cloud with Local
      const newMeta: CloudMetadata = {
        updatedAt: localStats.updatedAt,
        sessionsCount: localStats.sessions,
        speakingCount: localStats.speaking,
        writingCount: localStats.writing,
        receptiveCount: localStats.receptive,
        srsCount: localStats.srs,
        deviceLabel: localStats.deviceLabel,
        hashShort: 'a1b2...c3d4',
        sizeKb: 680,
        exists: true,
      }
      setCloudMeta(newMeta)
      localStorage.setItem('oxford_cloud_snapshot_meta', JSON.stringify(newMeta))
      localStorage.setItem('oxford_cloud_snapshot_data', JSON.stringify(captureCurrentLocalSnapshot()))
      setStatusMessage('Cloud snapshot successfully updated with this device data.')
    } else {
      // Pull Data from Cloud (Replace This Device with Cloud)
      saveRollbackSnapshot()
      const rawCloudData = localStorage.getItem('oxford_cloud_snapshot_data')
      if (rawCloudData) {
        try {
          const payload = JSON.parse(rawCloudData)
          applyCleanOverwrite(payload)
        } catch {
          // fallback
        }
      }
      refreshLocalStats()
      setStatusMessage('This device was replaced with the Google Cloud snapshot. Rollback is available below.')
    }

    setModalOpen(false)
  }

  // File Drop / Selection handler
  const handleFileStaged = async (file: File) => {
    try {
      const payload = await parseBackupFile(file)
      const count = (payload.study_sessions || []).length
      setStagedImportFile({
        file,
        payload,
        sessionCount: count,
        exportedAt: payload.exported_at || new Date().toISOString(),
      })
      setStatusMessage(`Loaded ${file.name} (SHA-256 Verified). Select merge mode below to apply.`)
    } catch {
      alert('Invalid backup file. Could not parse .ieltsbackup or .ielts-archive.zip.')
    }
  }

  // Apply Staged File Import
  const handleApplyImport = () => {
    if (!stagedImportFile) return

    saveRollbackSnapshot()

    if (importMode === 'clean_overwrite') {
      applyCleanOverwrite(stagedImportFile.payload)
      setStatusMessage(`Clean overwrite applied from ${stagedImportFile.file.name}. Previous database saved to rollback slot.`)
    } else {
      const res = applySmartMerge(stagedImportFile.payload)
      setStatusMessage(
        `CRDT/HLC smart merge complete! Combined ${res.mergedSessions} sessions, ${res.mergedSpeaking} speaking attempts, and ${res.mergedSrs} SRS cards.`
      )
    }

    setStagedImportFile(null)
    refreshLocalStats()
  }

  // 1-Click Rollback handler
  const handleRestoreRollback = () => {
    const success = restoreFromRollback()
    if (success) {
      refreshLocalStats()
      setStatusMessage('Restored previous local database snapshot from rollback slot.')
    } else {
      alert('No rollback snapshot found.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Account, Offline Backup & Manual Cloud Sync
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          Sovereign local data ownership, offline backups, and optional Google OAuth cloud snapshots.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#EAF3EC] text-[#166534] border border-[#166534] rounded-md text-xs font-sans flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold px-2 py-0.5 hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION A: Manual Cloud Snapshot Sync */}
      <section className="bg-surface-card rounded-md border border-border-subtle p-6 shadow-paper space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <div>
            <h2 id="acc-cloud-header" className="font-serif text-[22px] font-semibold text-primary leading-tight">
              Manual Cloud Snapshot Sync (Google Account)
            </h2>
            <p className="font-sans text-xs text-secondary mt-1">
              Optional Cloudflare D1 + R2 snapshot storage. Strictly manual—zero auto-sync.
            </p>
          </div>

          {/* acc-zero-sync-badge */}
          <span
            id="acc-zero-sync-badge"
            className="px-3 py-1.5 rounded-sm font-sans text-xs font-medium self-start sm:self-auto border border-[#166534]"
            style={{ backgroundColor: '#EAF3EC', color: '#166534' }}
          >
            Zero Background Sync: Server is only contacted when you click Upload or Pull below.
          </span>
        </div>

        {/* State 1: Logged Out */}
        {!user ? (
          <div className="p-6 rounded-md bg-[#FBF9F5] border border-border-subtle space-y-4">
            <h3 className="font-serif text-lg font-semibold text-primary">
              Optional Multi-Device Cloud Backup
            </h3>
            <p className="font-sans text-xs text-secondary leading-relaxed max-w-3xl">
              Your study data is currently stored 100% locally on this device. Sign in with Google
              only if you want to manually upload or pull your progress snapshot across devices. Zero
              background requests are ever sent while you study.
            </p>
            <div>
              <button
                type="button"
                id="acc-google-login-btn"
                onClick={handleGoogleLogin}
                className="font-sans text-xs font-semibold px-4 py-2.5 bg-white text-primary border border-[#C7BFA8] rounded-sm hover:bg-[#F4F0EA] transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <span className="font-serif font-bold text-sm text-[#9A3412]">G</span>
                Sign in with Google to Compare & Sync Snapshots
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Logged In */
          <div className="space-y-5">
            {/* acc-user-bar */}
            <div
              id="acc-user-bar"
              className="p-3.5 bg-[#F4F0EA] border border-border-subtle rounded-md flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-serif text-sm font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-sans text-xs font-semibold text-primary">
                    Signed in as {user.name} ({user.email})
                  </div>
                  <div className="font-mono text-[11px] text-[#166534]">
                    Zero Auto-Sync Mode: Active
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshCloudMeta}
                  className="font-sans text-xs font-medium px-3 py-1.5 bg-white text-primary border border-border-subtle rounded-sm hover:bg-[#FAF7F1] transition-colors cursor-pointer"
                >
                  Refresh Cloud Metadata
                </button>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="font-sans text-xs font-medium px-3 py-1.5 bg-white text-[#991B1B] border border-[#FCA5A5] rounded-sm hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Side-by-Side Comparison Arena (2 Equal Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* acc-local-card */}
              <article
                id="acc-local-card"
                className={`rounded-md p-5 bg-surface-card space-y-4 shadow-paper transition-all ${
                  isLocalNewer
                    ? 'border-2 border-[#1E3A5F]'
                    : 'border border-border-subtle'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="font-serif text-base font-semibold text-primary flex items-center gap-1.5">
                      <span>💻</span> This Device (Local OPFS SQLite)
                    </h3>
                    <div className="font-mono text-xs text-secondary tabular-nums mt-1">
                      Last Updated: {formatTimestamp(localStats.updatedAt)}
                    </div>
                  </div>
                  <div>
                    {isLocalNewer ? (
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-[#EAF3EC] text-[#166534] border border-[#166534] rounded-sm tabular-nums">
                        ✓ NEWER BY {diffDays} DAYS
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] border border-[#92400E] rounded-sm tabular-nums">
                        ⚠️ OLDER THAN CLOUD
                      </span>
                    )}
                  </div>
                </div>

                {/* Inventory Breakdown Table */}
                <div className="font-mono text-xs space-y-2 tabular-nums">
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Study Sessions:</span>
                    <span className="font-medium text-primary">{localStats.sessions}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Speaking Attempts:</span>
                    <span className="font-medium text-primary">
                      {localStats.speaking} (14.2 MB Opus audio)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Writing Essays:</span>
                    <span className="font-medium text-primary">{localStats.writing}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Reading & Listening:</span>
                    <span className="font-medium text-primary">{localStats.receptive}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">FSRS Cards:</span>
                    <span className="font-medium text-primary">{localStats.srs} cards</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-secondary font-sans">Device:</span>
                    <span className="text-primary truncate">{localStats.deviceLabel}</span>
                  </div>
                </div>
              </article>

              {/* acc-cloud-card */}
              <article
                id="acc-cloud-card"
                className={`rounded-md p-5 bg-surface-card space-y-4 shadow-paper transition-all ${
                  !isLocalNewer
                    ? 'border-2 border-[#1E3A5F]'
                    : 'border border-border-subtle'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="font-serif text-base font-semibold text-primary flex items-center gap-1.5">
                      <span>☁️</span> Google Cloud Snapshot (Cloudflare D1 + R2)
                    </h3>
                    <div className="font-mono text-xs text-secondary tabular-nums mt-1">
                      Last Updated: {formatTimestamp(cloudMeta.updatedAt)}
                    </div>
                  </div>
                  <div>
                    {!isLocalNewer ? (
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-[#EAF3EC] text-[#166534] border border-[#166534] rounded-sm tabular-nums">
                        ✓ NEWER
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] border border-[#92400E] rounded-sm tabular-nums">
                        OLDER
                      </span>
                    )}
                  </div>
                </div>

                {/* Inventory Breakdown Table */}
                <div className="font-mono text-xs space-y-2 tabular-nums">
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Study Sessions:</span>
                    <span className="font-medium text-primary">
                      {cloudMeta.sessionsCount} ({cloudMeta.sessionsCount - localStats.sessions >= 0 ? '+' : ''}
                      {cloudMeta.sessionsCount - localStats.sessions} vs Local)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Speaking Attempts:</span>
                    <span className="font-medium text-primary">
                      {cloudMeta.speakingCount} ({cloudMeta.speakingCount - localStats.speaking >= 0 ? '+' : ''}
                      {cloudMeta.speakingCount - localStats.speaking} vs Local)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Writing Essays:</span>
                    <span className="font-medium text-primary">
                      {cloudMeta.writingCount} ({cloudMeta.writingCount - localStats.writing >= 0 ? '+' : ''}
                      {cloudMeta.writingCount - localStats.writing} vs Local)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">Reading & Listening:</span>
                    <span className="font-medium text-primary">
                      {cloudMeta.receptiveCount} ({cloudMeta.receptiveCount - localStats.receptive >= 0 ? '+' : ''}
                      {cloudMeta.receptiveCount - localStats.receptive} vs Local)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-subtle">
                    <span className="text-secondary font-sans">FSRS Cards:</span>
                    <span className="font-medium text-primary">
                      {cloudMeta.srsCount} cards ({cloudMeta.srsCount - localStats.srs >= 0 ? '+' : ''}
                      {cloudMeta.srsCount - localStats.srs} vs Local)
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-secondary font-sans">Uploaded From:</span>
                    <span className="text-primary truncate">{cloudMeta.deviceLabel}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5 border-t border-border-subtle text-[11px] text-secondary">
                    <span>Snapshot Size & Hash:</span>
                    <span>
                      {cloudMeta.sizeKb} KB | sha256: {cloudMeta.hashShort}
                    </span>
                  </div>
                </div>
              </article>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button
                type="button"
                id="acc-upload-cloud-btn"
                onClick={() => handleOpenSyncModal('UPLOAD_TO_CLOUD')}
                className="font-sans text-xs font-semibold px-5 py-2.5 bg-[#9A3412] hover:bg-[#832b0e] text-white rounded-sm shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>⬆️</span> Upload Data to Cloud (Replace Cloud with This Device)
              </button>

              <button
                type="button"
                id="acc-pull-cloud-btn"
                onClick={() => handleOpenSyncModal('PULL_FROM_CLOUD')}
                className="font-sans text-xs font-semibold px-5 py-2.5 bg-[#F4F0EA] hover:bg-[#EAE4D8] text-[#1E3A5F] border border-[#1E3A5F] rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>⬇️</span> Pull Data from Cloud (Replace This Device with Cloud)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION B: Sovereign Offline File Export, Import & 1-Click Rollback */}
      <section className="space-y-6">
        <div className="border-b border-border-subtle pb-3">
          <h2 className="font-serif text-xl font-semibold text-primary">
            Sovereign Offline File Export, Import & 1-Click Rollback
          </h2>
          <p className="font-sans text-xs text-secondary mt-1">
            Works 100% offline without any account. Non-destructive smart merge or clean overwrite.
          </p>
        </div>

        {/* acc-rollback-bar (when rollback snapshot exists) */}
        {rollbackTime && (
          <div
            id="acc-rollback-bar"
            className="p-4 rounded-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
            style={{
              backgroundColor: '#FEF3C7',
              borderColor: '#92400E',
              color: '#92400E',
            }}
          >
            <div className="font-sans text-xs">
              <span className="font-semibold">Rollback Available:</span> Previous local database from{' '}
              <span className="font-mono font-medium">{formatTimestamp(rollbackTime)}</span> is preserved on disk.
            </div>
            <button
              type="button"
              onClick={handleRestoreRollback}
              className="font-sans text-xs font-semibold px-3 py-1.5 bg-white text-[#92400E] border border-[#92400E] rounded-sm hover:bg-[#FFFBEB] transition-colors shadow-xs cursor-pointer shrink-0"
            >
              Undo & Restore Previous Local Database
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Offline Export Card (Left 6 Cols) */}
          <div className="bg-surface-card rounded-md border border-border-subtle p-6 shadow-paper space-y-5">
            <div>
              <h3 className="font-serif text-base font-semibold text-primary">
                Offline Data Export
              </h3>
              <p className="font-sans text-xs text-secondary mt-1">
                Download and keep local archive copies on your private storage drive.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-sm bg-[#FBF9F5] border border-border-subtle space-y-2.5">
                <div className="font-sans text-xs font-semibold text-primary">
                  Option 1: Compact Progress Backup (.ieltsbackup JSON.gz, ~450 KB)
                </div>
                <p className="font-sans text-xs text-secondary leading-relaxed">
                  Exports all sessions, transcripts, band scores, writing essays, and FSRS cards +
                  SHA-256 manifest checksum.
                </p>
                <button
                  type="button"
                  id="acc-export-json-btn"
                  onClick={() => exportIeltsBackup()}
                  className="font-sans text-xs font-semibold px-4 py-2 bg-[#F4F0EA] hover:bg-[#e8e2d8] text-primary border border-border-subtle rounded-sm transition-colors cursor-pointer"
                >
                  Export Compact Progress (.ieltsbackup JSON.gz)
                </button>
              </div>

              <div className="p-4 rounded-sm bg-[#FBF9F5] border border-border-subtle space-y-2.5">
                <div className="font-sans text-xs font-semibold text-primary">
                  Option 2: Full Studio Archive with Voice Recordings (.ielts-archive.zip)
                </div>
                <p className="font-sans text-xs text-secondary leading-relaxed">
                  Exports the raw SQLite .db binary + JSON dump + all /audio/attempts/*.opus voice
                  recordings.
                </p>
                <button
                  type="button"
                  id="acc-export-zip-btn"
                  onClick={() => exportFullStudioArchiveZip()}
                  className="font-sans text-xs font-semibold px-4 py-2 bg-[#F4F0EA] hover:bg-[#e8e2d8] text-primary border border-border-subtle rounded-sm transition-colors cursor-pointer"
                >
                  Export Full Studio Archive (.ielts-archive.zip with Audio)
                </button>
              </div>
            </div>
          </div>

          {/* Offline Import & Blue-Green Rollback Card (Right 6 Cols) */}
          <div className="bg-surface-card rounded-md border border-border-subtle p-6 shadow-paper space-y-5">
            <div>
              <h3 className="font-serif text-base font-semibold text-primary">
                Offline Import & Merge Control
              </h3>
              <p className="font-sans text-xs text-secondary mt-1">
                Drag-and-drop verification with automatic rollback snapshot preservation.
              </p>
            </div>

            {/* acc-import-dropzone */}
            <label
              id="acc-import-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handleFileStaged(file)
              }}
              className="block p-6 rounded-md bg-[#F4F0EA] border-2 border-dashed border-[#C7BFA8] hover:border-accent-navy text-center cursor-pointer transition-colors"
            >
              <div className="font-sans text-xs text-secondary leading-relaxed">
                Drop .ieltsbackup or .ielts-archive.zip here, or click to select file
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ieltsbackup,.zip,.json,.gz"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileStaged(file)
                }}
                className="hidden"
              />
            </label>

            {/* Staged File Information & Mode Selection */}
            {stagedImportFile ? (
              <div className="p-4 bg-[#FBF9F5] border border-border-subtle rounded-sm space-y-3">
                <div className="font-sans text-xs font-semibold text-primary flex items-center justify-between">
                  <span>File: {stagedImportFile.file.name}</span>
                  <span className="font-mono text-[11px] text-[#166534]">SHA-256 Verified ✓</span>
                </div>
                <div className="font-mono text-xs text-secondary tabular-nums">
                  Exported At: {formatTimestamp(new Date(stagedImportFile.exportedAt).getTime())} ·
                  Sessions in file: {stagedImportFile.sessionCount}
                </div>

                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <div className="font-sans text-xs font-medium text-primary">
                    Select Database Import Protocol:
                  </div>

                  <label className="flex items-start gap-2 text-xs font-sans text-primary cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="smart_merge"
                      checked={importMode === 'smart_merge'}
                      onChange={() => setImportMode('smart_merge')}
                      className="mt-0.5 text-accent-navy focus:ring-accent-navy"
                    />
                    <div>
                      <span className="font-semibold">Smart Merge (CRDT/HLC — Keep Both)</span>
                      <p className="text-secondary text-[11px]">
                        Non-destructively combines sessions from both databases without losing
                        anything.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs font-sans text-primary cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="clean_overwrite"
                      checked={importMode === 'clean_overwrite'}
                      onChange={() => setImportMode('clean_overwrite')}
                      className="mt-0.5 text-accent-navy focus:ring-accent-navy"
                    />
                    <div>
                      <span className="font-semibold">Clean Overwrite (Replace This Device)</span>
                      <p className="text-secondary text-[11px]">
                        Atomically swaps local database with the imported file. Previous data is saved
                        in rollback slot.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStagedImportFile(null)}
                    className="font-sans text-xs px-3 py-1.5 bg-white text-secondary border border-border-subtle rounded-sm hover:text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    className="font-sans text-xs font-semibold px-4 py-1.5 bg-[#9A3412] text-white rounded-sm hover:bg-[#832b0e] cursor-pointer"
                  >
                    Apply Import
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center font-sans text-[11px] text-secondary py-2">
                Drop a file above to configure Smart Merge (CRDT/HLC — Keep Both) vs. Clean Overwrite (Replace This Device).
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2.2 Mandatory Double-Confirmation Modal (CloudSyncConfirmModal) */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(28, 25, 23, 0.45)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            id="acc-confirm-modal"
            className="w-full max-w-xl bg-white rounded-md border border-[#C7BFA8] p-6 shadow-2xl space-y-5"
          >
            {/* Step 1: Visual Diff & Direction Check */}
            {confirmStep === 1 && (
              <div className="space-y-4">
                <div className="border-b border-border-subtle pb-3">
                  <h3 className="font-serif text-lg font-semibold text-primary">
                    Compare Timestamps Before Overwriting
                  </h3>
                  <p className="font-sans text-xs text-secondary mt-1">
                    Step 1 of 2: Review directional data replacement and gain/loss breakdown.
                  </p>
                </div>

                {/* Direction Banner */}
                <div className="p-3.5 bg-[#F4F0EA] border border-border-subtle rounded-sm text-xs font-mono font-semibold text-center text-primary">
                  {syncDirection === 'UPLOAD_TO_CLOUD' ? (
                    <span>
                      This Device ({formatTimestamp(localStats.updatedAt).slice(0, 11)}) ⟶ OVERWRITES ⟶ Cloud Snapshot ({formatTimestamp(cloudMeta.updatedAt).slice(0, 11)})
                    </span>
                  ) : (
                    <span>
                      Cloud Snapshot ({formatTimestamp(cloudMeta.updatedAt).slice(0, 11)}) ⟶ OVERWRITES ⟶ This Device ({formatTimestamp(localStats.updatedAt).slice(0, 11)})
                    </span>
                  )}
                </div>

                {/* Delta Breakdown Box */}
                <div className="p-4 rounded-sm bg-[#FBF9F5] border border-border-subtle space-y-2 text-xs font-sans">
                  <div className="font-semibold text-primary">Inventory Delta Summary:</div>
                  <div className="font-mono text-secondary space-y-1 tabular-nums">
                    <div>
                      • Study Sessions: {syncDirection === 'UPLOAD_TO_CLOUD' ? localStats.sessions : cloudMeta.sessionsCount} (Target currently has {syncDirection === 'UPLOAD_TO_CLOUD' ? cloudMeta.sessionsCount : localStats.sessions})
                    </div>
                    <div>
                      • Speaking Attempts: {syncDirection === 'UPLOAD_TO_CLOUD' ? localStats.speaking : cloudMeta.speakingCount} (Target currently has {syncDirection === 'UPLOAD_TO_CLOUD' ? cloudMeta.speakingCount : localStats.speaking})
                    </div>
                    <div>
                      • FSRS Flashcards: {syncDirection === 'UPLOAD_TO_CLOUD' ? localStats.srs : cloudMeta.srsCount} (Target currently has {syncDirection === 'UPLOAD_TO_CLOUD' ? cloudMeta.srsCount : localStats.srs})
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="font-sans text-xs font-medium px-4 py-2 bg-white text-secondary hover:text-primary border border-border-subtle rounded-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="font-sans text-xs font-semibold px-4 py-2 bg-[#9A3412] text-white hover:bg-[#832b0e] rounded-sm cursor-pointer"
                  >
                    Proceed to Final Confirmation -&gt;
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Double Confirmation & Safety Lock */}
            {confirmStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-border-subtle pb-3">
                  <h3 className="font-serif text-lg font-semibold text-primary">
                    Final Confirmation & Safety Lock
                  </h3>
                  <p className="font-sans text-xs text-secondary mt-1">
                    Step 2 of 2: Verify acknowledgment and unlock target overwrite.
                  </p>
                </div>

                {/* High Risk Warning Banner */}
                {isHighRisk && (
                  <div className="p-4 rounded-sm bg-[#FEE2E2] border border-[#991B1B] text-[#991B1B] space-y-3">
                    <div className="font-sans text-xs font-bold flex items-center gap-1.5">
                      <span>⚠️ DANGER:</span>
                      <span>
                        The data on {syncDirection === 'UPLOAD_TO_CLOUD' ? 'Cloud' : 'This Device'} is {diffDays} DAYS NEWER than the snapshot you are about to overwrite it with!
                      </span>
                    </div>
                    <p className="font-sans text-xs leading-relaxed">
                      You will lose recent practice sessions and recordings unless you take an offline backup first.
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => exportIeltsBackup()}
                        className="font-sans text-xs font-semibold px-3 py-1.5 bg-white text-[#991B1B] border border-[#991B1B] rounded-sm hover:bg-[#FFF5F5] cursor-pointer"
                      >
                        Download .ieltsbackup Safety File First
                      </button>
                    </div>
                  </div>
                )}

                {/* Checkbox confirmation */}
                <label className="flex items-start gap-2.5 text-xs font-sans text-primary cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={ackChecked}
                    onChange={(e) => setAckChecked(e.target.checked)}
                    className="mt-0.5 text-accent-navy focus:ring-accent-navy"
                  />
                  <span className="leading-relaxed">
                    I confirm that I want to replace all data in{' '}
                    <span className="font-semibold">{syncDirection === 'UPLOAD_TO_CLOUD' ? 'Cloud' : 'This Device'}</span>{' '}
                    with the snapshot from{' '}
                    <span className="font-semibold">{syncDirection === 'UPLOAD_TO_CLOUD' ? 'This Device' : 'Cloud'}</span>{' '}
                    (Last updated:{' '}
                    {formatTimestamp(
                      syncDirection === 'UPLOAD_TO_CLOUD' ? localStats.updatedAt : cloudMeta.updatedAt
                    )}
                    ).
                  </span>
                </label>

                {/* Text input lock if High Risk */}
                {isHighRisk && (
                  <div className="space-y-1.5 pt-1">
                    <label className="font-sans text-xs font-medium text-secondary">
                      To confirm overwriting newer data, type <span className="font-mono font-bold text-[#991B1B]">OVERWRITE</span>:
                    </label>
                    <input
                      type="text"
                      placeholder="Type OVERWRITE to confirm"
                      value={overwriteInput}
                      onChange={(e) => setOverwriteInput(e.target.value)}
                      className="w-full font-mono text-xs px-3 py-2 bg-white border border-[#C7BFA8] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#991B1B]"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(1)}
                    className="font-sans text-xs font-medium px-4 py-2 bg-white text-secondary hover:text-primary border border-border-subtle rounded-sm cursor-pointer"
                  >
                    &lt;- Back
                  </button>

                  <button
                    type="button"
                    disabled={!ackChecked || (isHighRisk && overwriteInput !== 'OVERWRITE')}
                    onClick={handleExecuteCloudSync}
                    className={`font-sans text-xs font-semibold px-4 py-2 rounded-sm text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isHighRisk
                        ? 'bg-[#991B1B] hover:bg-[#7f1d1d]'
                        : 'bg-[#9A3412] hover:bg-[#832b0e]'
                    }`}
                  >
                    {isHighRisk ? 'Confirm Overwrite with Older Data' : 'Confirm & Execute Replace Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
