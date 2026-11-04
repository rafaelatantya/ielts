import React from 'react'

export const FeaturesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          AI Features & Offline Model Manager
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          Zero auto-download control center. All models are 100% opt-in and stored in OPFS disk.
        </p>
      </div>
      <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
        <div className="font-serif text-lg font-semibold text-primary">
          0 MB Lite Practice Mode Active
        </div>
        <p className="font-sans text-xs text-secondary leading-relaxed">
          You can complete all IELTS practice modules without downloading any AI models. Offline voice recordings are safely stored and can be retroactively scored anytime.
        </p>
      </div>
    </div>
  )
}
