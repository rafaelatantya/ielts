import React from 'react'

export const ListeningPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Listening Room
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          4-Section Audio Simulator with Opus multi-section player and strict word limit validation.
        </p>
      </div>
      <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
        <div className="font-serif text-lg font-semibold text-primary">
          Select Listening Test
        </div>
        <p className="font-sans text-xs text-secondary leading-relaxed">
          Realistic audio timing with pre-listening preview countdown and UK/US spelling normalization.
        </p>
      </div>
    </div>
  )
}
