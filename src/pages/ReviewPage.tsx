import React from 'react'
import { useApp } from '../context/AppContext'

export const ReviewPage: React.FC = () => {
  const { dueCount } = useApp()

  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-2xl font-semibold text-primary">
          FSRS Spaced Repetition Deck
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          Auto-generated flashcards from Speaking & Writing mistakes with 4-button ts-fsrs scheduling.
        </p>
      </div>
      <div className="bg-surface-card p-6 rounded-md border border-border-subtle shadow-paper space-y-4">
        <div className="font-serif text-lg font-semibold text-primary">
          {dueCount === 0 ? 'No Cards Due Today' : `${dueCount} Cards Due`}
        </div>
        <p className="font-sans text-xs text-secondary leading-relaxed">
          When you practice Speaking or Writing, pronunciation errors, grammatical cloze corrections, and C1/C2 collocations are automatically added here.
        </p>
      </div>
    </div>
  )
}
