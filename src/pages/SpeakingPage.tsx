import React from 'react'
import { MicStudioBar } from '../components/audio/MicStudioBar'

export const SpeakingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Speaking Lab
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          Part 1 Timed Interview, Part 2 Cue Card Monologue, and Part 3 Two-Way Discussion.
        </p>
      </div>

      {/* Studio Microphone Selector Bar */}
      <div className="bg-surface-card p-5 rounded-md border border-border-subtle shadow-paper space-y-3">
        <div className="font-serif text-base font-semibold text-primary">
          Studio Microphone & Input Calibration
        </div>
        <p className="font-sans text-xs text-secondary leading-relaxed">
          Verify your hardware input, test the 3-second loopback, and monitor background room noise before launching an exam simulator.
        </p>
        <MicStudioBar showFullControls={true} />
      </div>

      {/* Mode Selector Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface-elevated rounded-md border border-border-subtle">
          <div className="font-serif text-sm font-semibold text-primary">
            Part 1: Timed Interview
          </div>
          <div className="font-sans text-xs text-secondary mt-1">
            4-5 minutes &bull; Familiar everyday topics and rapid responses.
          </div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-md border border-border-subtle">
          <div className="font-serif text-sm font-semibold text-primary">
            Part 2: Cue Card & Prep
          </div>
          <div className="font-sans text-xs text-secondary mt-1">
            1-min prep notepad &bull; 2-min uninterrupted monologue.
          </div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-md border border-border-subtle">
          <div className="font-serif text-sm font-semibold text-primary">
            Part 3: Discussion
          </div>
          <div className="font-sans text-xs text-secondary mt-1">
            4-5 minutes &bull; Deep abstract reasoning and speculative language.
          </div>
        </div>
      </div>
    </div>
  )
}
