import React from 'react'

export const ReadingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Reading Room
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          3-Passage Split Annotator with resizable literary serif pane and official question types.
        </p>
      </div>
      <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
        <div className="font-serif text-lg font-semibold text-primary">
          Select Reading Passage
        </div>
        <p className="font-sans text-xs text-secondary leading-relaxed">
          60-minute full exam practice with 3-color highlighter, margin notes, and instant evidence span verification.
        </p>
      </div>
    </div>
  )
}
