import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

interface SidebarProps {
  collapsed?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const { leaderStatus, dueCount, isDownloadPaused, meta } = useApp()

  // Format saved locally time string HH:mm:ss
  const formatTime = (ts: number) => {
    const d = new Date(ts || Date.now())
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  const savedTimeStr = formatTime(meta.last_saved_at)

  if (collapsed) {
    return null
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3 py-2 rounded-sm text-[13px] font-sans font-semibold tracking-wide transition-colors ${
      isActive
        ? 'bg-accent-navy text-surface-card'
        : 'text-primary hover:bg-surface-card hover:text-primary'
    }`

  return (
    <aside
      id="app-sidebar"
      className="w-[248px] shrink-0 bg-surface-elevated border-r border-border-subtle flex flex-col justify-between h-screen sticky top-0 select-none z-20"
      style={{ transition: 'width 200ms ease, opacity 200ms ease' }}
    >
      {/* Top Brand Masthead & Navigation Items */}
      <div className="flex flex-col p-4 space-y-6">
        {/* Brand Header */}
        <div className="space-y-1">
          <Link
            to="/"
            id="shell-brand-title"
            className="block font-serif text-[20px] font-semibold text-primary hover:text-accent-navy transition-colors tracking-tight leading-none"
          >
            Oxford Atelier
          </Link>
          <div className="flex items-center justify-between pt-0.5">
            <span
              id="shell-brand-sub"
              className="font-sans text-[11px] font-semibold tracking-[0.08em] text-secondary uppercase"
            >
              LOCAL-FIRST IELTS STUDIO
            </span>

          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1" aria-label="Main Navigation">
          <NavLink to="/" end id="nav-item-dashboard" className={navLinkClass}>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/speaking" id="nav-item-speaking" className={navLinkClass}>
            <span>Speaking Lab</span>
          </NavLink>

          <NavLink to="/writing" id="nav-item-writing" className={navLinkClass}>
            <span>Writing Lab</span>
          </NavLink>

          <NavLink to="/reading" id="nav-item-reading" className={navLinkClass}>
            <span>Reading Room</span>
          </NavLink>

          <NavLink to="/listening" id="nav-item-listening" className={navLinkClass}>
            <span>Listening Room</span>
          </NavLink>

          <NavLink to="/review" id="nav-item-review" className={navLinkClass}>
            <span>FSRS Review</span>
            {dueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-xs bg-success-bg text-success-ink font-mono text-[11px] font-semibold tabular-nums">
                {dueCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/features" id="nav-item-features" className={navLinkClass}>
            <span>AI Models & Packs</span>
            {isDownloadPaused && (
              <span
                className="w-2 h-2 rounded-full bg-warning-ink shrink-0 ml-1.5"
                title="Download paused"
              />
            )}
          </NavLink>
        </nav>
      </div>

      {/* Pinned Account & Local Storage Footer */}
      <div className="p-4 border-t border-border-subtle space-y-3 bg-surface-elevated">
        <NavLink to="/account" id="nav-item-account" className={navLinkClass}>
          <span>Account & Backup</span>
        </NavLink>

        <div id="opfs-footer" className="space-y-1 pt-1">
          <div
            id="shell-opfs-status"
            className="font-mono text-[12px] text-secondary flex items-center gap-1.5"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                leaderStatus === 'leader' ? 'bg-success-ink' : 'bg-warning-ink'
              }`}
            />
            <span>
              {leaderStatus === 'leader'
                ? 'Local Storage: Active (Leader)'
                : 'Follower Tab'}
            </span>
          </div>

          <div
            id="shell-last-saved"
            className="block font-mono text-[11px] text-secondary tabular-nums"
          >
            Saved locally: {savedTimeStr}
          </div>
        </div>
      </div>
    </aside>
  )
}
