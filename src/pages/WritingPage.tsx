import React from 'react'

export const WritingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Writing Lab
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          Academic Task 1 (Charts, Diagrams & Maps) and Task 2 Discursive Essay with split-editor.
        </p>
      </div>
      <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
        <div className="font-serif text-lg font-semibold text-primary">
          Select Writing Task
        </div>
        <p className="font-sans text-xs text-secondary leading-relaxed">
          Full split-screen simulator with auto-save to OPFS every 1,500ms, monotonic wall-clock deadline, and 4-criterion rubric diagnostics.
        </p>
      </div>
    </div>
  )
}
