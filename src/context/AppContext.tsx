import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { LocalMeta, StorageStatus, LeaderStatus } from '../types'
import { getLocalMeta, saveLocalMeta, getStorageEstimate, lockPersistentStorage } from '../services/storage'

interface AppContextValue {
  meta: LocalMeta
  updateMeta: (updates: Partial<LocalMeta>) => void
  storageStatus: StorageStatus | null
  refreshStorageStatus: () => Promise<void>
  requestPersist: () => Promise<boolean>
  leaderStatus: LeaderStatus
  focusMode: boolean
  toggleFocusMode: () => void
  dueCount: number
  setDueCount: (count: number) => void
  isDownloadPaused: boolean
  setIsDownloadPaused: (paused: boolean) => void
  screenTitle: string
  setScreenTitle: (title: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMeta] = useState<LocalMeta>(() => getLocalMeta())
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const [leaderStatus, setLeaderStatus] = useState<LeaderStatus>('leader')
  const [focusMode, setFocusMode] = useState<boolean>(false)
  const [dueCount, setDueCount] = useState<number>(0)
  const [isDownloadPaused, setIsDownloadPaused] = useState<boolean>(false)
  const [screenTitle, setScreenTitle] = useState<string>('Onboarding')

  const refreshStorageStatus = useCallback(async () => {
    const status = await getStorageEstimate()
    setStorageStatus(status)
  }, [])

  useEffect(() => {
    refreshStorageStatus()
  }, [refreshStorageStatus])

  // Web Locks API leader election
  useEffect(() => {
    let isMounted = true
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      navigator.locks
        .request('ielts_opfs_leader', { mode: 'exclusive' }, () => {
          if (isMounted) {
            setLeaderStatus('leader')
          }
          return new Promise<void>(() => {
            // Keep lock active for tab lifecycle
          })
        })
        .catch(() => {
          if (isMounted) {
            setLeaderStatus('follower')
          }
        })
    }
    return () => {
      isMounted = false
    }
  }, [])

  const updateMeta = useCallback((updates: Partial<LocalMeta>) => {
    const updated = saveLocalMeta(updates)
    setMeta(updated)
  }, [])

  const requestPersist = useCallback(async () => {
    const granted = await lockPersistentStorage()
    await refreshStorageStatus()
    return granted
  }, [refreshStorageStatus])

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev)
  }, [])

  return (
    <AppContext.Provider
      value={{
        meta,
        updateMeta,
        storageStatus,
        refreshStorageStatus,
        requestPersist,
        leaderStatus,
        focusMode,
        toggleFocusMode,
        dueCount,
        setDueCount,
        isDownloadPaused,
        setIsDownloadPaused,
        screenTitle,
        setScreenTitle,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return ctx
}
