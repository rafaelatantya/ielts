import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ExamTrack, BandScore } from '../../types'
import { MicStudioBar } from '../audio/MicStudioBar'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Study Command Center',
  '/speaking': 'Speaking Lab',
  '/writing': 'Writing Lab',
  '/reading': 'Reading Room',
  '/listening': 'Listening Room',
  '/review': 'FSRS Spaced Repetition Deck',
  '/features': 'AI Features & Offline Models',
  '/account': 'Sovereign Data & Cloud Sync',
  '/onboarding': 'Onboarding & Local Setup',
}

export const TopBar: React.FC = () => {
  const location = useLocation()
  const { meta, updateMeta, focusMode, toggleFocusMode } = useApp()

  const [isTargetPopoverOpen, setIsTargetPopoverOpen] = useState(false)
  const [isMicModalOpen, setIsMicModalOpen] = useState(false)

  const targetPopoverRef = useRef<HTMLDivElement>(null)
  const micModalRef = useRef<HTMLDivElement>(null)

  // Current title based on route
  const currentTitle = ROUTE_TITLES[location.pathname] || 'Study Studio'

  // Format track name: "Academic" or "General"
  const trackLabel =
    meta.exam_track === 'general' ? 'General' : 'Academic'
  const targetBandStr = (meta.target_band || 7.5).toFixed(1)

  const activeMicText = meta.preferred_mic_label
    ? `Mic: ${meta.preferred_mic_label}`
    : 'Select Microphone'

  const isSpeakingRoute =
    location.pathname.startsWith('/speaking') ||
    location.pathname === '/onboarding'

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        targetPopoverRef.current &&
        !targetPopoverRef.current.contains(e.target as Node)
      ) {
        setIsTargetPopoverOpen(false)
      }
      if (
        micModalRef.current &&
        !micModalRef.current.contains(e.target as Node)
      ) {
        setIsMicModalOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const bands: BandScore[] = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]

  return (
    <header id="app-topbar" className="h-[56px] sticky top-0 z-10 bg-neutral/95 backdrop-blur-sm border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Screen Title */}
      <h2
        id="topbar-screen-title"
        className="font-serif text-[18px] font-semibold text-primary truncate"
      >
        {currentTitle}
      </h2>

      {/* Right Utility Cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Target Band Pill */}
        <div className="relative" ref={targetPopoverRef}>
          <button
            id="topbar-target-pill"
            type="button"
            onClick={() => setIsTargetPopoverOpen((prev) => !prev)}
            className="px-2.5 py-1 rounded-sm bg-surface-elevated text-primary border border-border-subtle font-mono text-[12px] font-medium hover:border-border-strong transition-colors cursor-pointer tabular-nums flex items-center gap-1"
          >
            <span>Target: Band {targetBandStr} ({trackLabel})</span>
          </button>

          {/* Compact Target Settings Popover */}
          {isTargetPopoverOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-card rounded-md border border-border-strong shadow-modal p-3 z-30 space-y-3 animate-fade-slide">
              <div className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Exam Track
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['academic', 'general'] as ExamTrack[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateMeta({ exam_track: t })}
                    className={`py-1 px-2 rounded-xs text-xs font-semibold capitalize ${
                      meta.exam_track === t
                        ? 'bg-accent-navy text-surface-card'
                        : 'bg-surface-elevated text-primary border border-border-subtle'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="text-xs font-semibold text-secondary uppercase tracking-wider pt-1 border-t border-border-subtle">
                Target Band Score
              </div>
              <div className="grid grid-cols-4 gap-1">
                {bands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => updateMeta({ target_band: b })}
                    className={`py-1 rounded-xs font-mono text-xs font-semibold tabular-nums ${
                      meta.target_band === b
                        ? 'bg-accent-navy text-surface-card'
                        : 'bg-surface-elevated text-primary border border-border-subtle'
                    }`}
                  >
                    {b.toFixed(1)}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <Link
                  to="/onboarding"
                  onClick={() => setIsTargetPopoverOpen(false)}
                  className="block text-xs font-sans font-semibold text-accent-navy underline hover:text-primary"
                >
                  {'Open Onboarding & Hardware Setup ->'}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Studio Microphone Quick-Switch Pill (Speaking routes or always) */}
        {isSpeakingRoute && (
          <div className="relative" ref={micModalRef}>
            <button
              id="topbar-mic-pill"
              type="button"
              onClick={() => setIsMicModalOpen((prev) => !prev)}
              className="max-w-[180px] sm:max-w-[240px] truncate px-2.5 py-1 rounded-sm bg-surface-card text-primary border border-border-strong font-sans text-[12px] font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              {activeMicText}
            </button>

            {/* Mic Modal / Popover */}
            {isMicModalOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface-card rounded-md border border-border-strong shadow-modal p-3 z-30 space-y-2 animate-fade-slide">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                  Studio Microphone Quick-Switch
                </div>
                <MicStudioBar
                  showFullControls={true}
                  onMicSelected={() => {
                    // keep open to allow 3s loopback testing
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Exam Focus Mode Toggle */}
        <button
          id="topbar-focus-toggle"
          type="button"
          onClick={toggleFocusMode}
          className="px-2.5 py-1 rounded-sm text-secondary hover:text-primary hover:bg-surface-elevated transition-colors text-[12px] font-sans font-semibold cursor-pointer"
        >
          {focusMode ? 'Exit Focus' : 'Focus Mode'}
        </button>
      </div>
    </header>
  )
}
