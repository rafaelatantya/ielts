import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export const DashboardPage: React.FC = () => {
  const { meta } = useApp()
  const trackName = meta.exam_track === 'general' ? 'General Training' : 'Academic'
  const targetBand = (meta.target_band || 7.5).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary tracking-tight">
            Study Command Center
          </h1>
          <p className="font-sans text-xs text-secondary mt-1">
            Target: Band {targetBand} &bull; IELTS {trackName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/onboarding"
            className="px-3 py-1.5 rounded-sm bg-surface-elevated text-primary border border-border-subtle text-xs font-semibold hover:border-border-strong transition-colors"
          >
            Revisit Onboarding
          </Link>
          <Link
            to="/speaking"
            className="px-4 py-1.5 rounded-sm bg-tertiary text-surface-card text-xs font-semibold hover:bg-primary transition-colors"
          >
            Start Practice
          </Link>
        </div>
      </div>

      {/* Row 1: Band Hero & Skill Breakdown Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Band Hero */}
        <div className="lg:col-span-5 bg-surface-card rounded-md border border-border-subtle p-6 shadow-paper space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Estimated Overall Band
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-5xl font-semibold text-primary">
              --
            </span>
            <span className="px-2 py-0.5 rounded-xs bg-surface-elevated text-secondary font-mono text-xs border border-border-subtle">
              Target: {targetBand}
            </span>
          </div>
          <p className="font-sans text-xs text-secondary leading-relaxed">
            No diagnostic drills completed yet. Complete a 3-minute Speaking or Writing drill to calibrate your initial band score.
          </p>
        </div>

        {/* 4-Pillar Skills Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-3">
          {[
            { name: 'Speaking', to: '/speaking', desc: 'Part 1/2/3 Simulator' },
            { name: 'Writing', to: '/writing', desc: 'Task 1 & Task 2 Lab' },
            { name: 'Reading', to: '/reading', desc: '3-Passage Split Annotator' },
            { name: 'Listening', to: '/listening', desc: '4-Section Audio Simulator' },
          ].map((skill) => (
            <Link
              key={skill.name}
              to={skill.to}
              className="p-4 bg-surface-card rounded-md border border-border-subtle hover:border-border-strong transition-all shadow-paper block group"
            >
              <div className="font-serif text-base font-semibold text-primary group-hover:text-accent-navy transition-colors">
                {skill.name}
              </div>
              <div className="font-mono text-xs text-secondary mt-1">
                Band: --
              </div>
              <div className="font-sans text-[11px] text-secondary mt-2">
                {skill.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          to="/review"
          className="p-4 bg-surface-elevated rounded-md border border-border-subtle hover:border-border-strong transition-colors"
        >
          <div className="font-serif text-sm font-semibold text-primary">
            FSRS Review Deck
          </div>
          <div className="font-sans text-xs text-secondary mt-1">
            0 cards due today. Completed drills auto-generate error cards.
          </div>
        </Link>
        <Link
          to="/features"
          className="p-4 bg-surface-elevated rounded-md border border-border-subtle hover:border-border-strong transition-colors"
        >
          <div className="font-serif text-sm font-semibold text-primary">
            AI Models & Packs
          </div>
          <div className="font-sans text-xs text-secondary mt-1">
            0 MB network practice active. Whisper & scoring models are 100% opt-in.
          </div>
        </Link>
        <Link
          to="/account"
          className="p-4 bg-surface-elevated rounded-md border border-border-subtle hover:border-border-strong transition-colors"
        >
          <div className="font-serif text-sm font-semibold text-primary">
            Account & Backup
          </div>
          <div className="font-sans text-xs text-secondary mt-1">
            Export .ieltsbackup snapshots and view local storage health.
          </div>
        </Link>
      </div>
    </div>
  )
}
