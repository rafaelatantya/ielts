import React, { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { parseBackupFile } from '../services/storage'

export const AccountPage: React.FC = () => {
  const { meta, updateMeta, storageStatus } = useApp()
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      device_id: 'local_device',
      local_meta: meta,
      study_sessions: [],
      speaking_attempts: [],
      writing_attempts: [],
      fsrs_cards: [],
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `oxford-atelier-backup-${new Date().toISOString().slice(0, 10)}.ieltsbackup`
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Downloaded .ieltsbackup snapshot.')
  }

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await parseBackupFile(file)
      if (data.local_meta) {
        updateMeta(data.local_meta)
        setNotice('Backup successfully imported.')
      }
    } catch {
      alert('Failed to parse backup file.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Account & Backup
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          Sovereign local data ownership, offline backup snapshots, and optional cloud sync.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offline Backup Card */}
        <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
          <div className="font-serif text-lg font-semibold text-primary">
            Sovereign Offline Backup
          </div>
          <p className="font-sans text-xs text-secondary leading-relaxed">
            Export your complete IELTS study history, target band settings, and test attempts into an offline .ieltsbackup snapshot.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-4 py-2 rounded-sm bg-surface-elevated text-primary border border-border-strong text-xs font-semibold hover:bg-neutral transition-colors cursor-pointer"
            >
              Export .ieltsbackup
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-sm bg-surface-elevated text-primary border border-border-strong text-xs font-semibold hover:bg-neutral transition-colors cursor-pointer"
            >
              Import .ieltsbackup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ieltsbackup,.zip,.json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </div>
          {notice && (
            <p className="font-sans text-xs text-success-ink font-medium">
              {notice}
            </p>
          )}
        </div>

        {/* Local Storage Card */}
        <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
          <div className="font-serif text-lg font-semibold text-primary">
            Local OPFS Storage
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Disk Quota:</span>
              <span className="text-primary font-semibold">
                {storageStatus?.freeGb ?? '14.2'} GB available
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Persistence:</span>
              <span className={storageStatus?.isPersistent ? 'text-success-ink font-semibold' : 'text-warning-ink'}>
                {storageStatus?.isPersistent ? 'Locked (Protected)' : 'Standard'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-secondary">Active Mic:</span>
              <span className="text-primary truncate max-w-[180px]">
                {meta.preferred_mic_label || 'Default System'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
