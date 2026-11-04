import React, { useEffect, useState } from 'react'

export interface ArchivalLoupeScribbleProps {
  className?: string
  /** Message to display under the scribble during scoring transition */
  message?: string
}

/**
 * ArchivalLoupeScribble:
 * Implements DESIGN.md Section 5.9 & screen/04-speaking-simulator.md / screen/05-speaking-diagnostic.md.
 * Hand-drawn archival loupe / magnifying glass sweeping across a page of manuscript lines.
 * Inside the circular lens (#FAF7F1), handwriting aligns into crisp diagnostics.
 * Stepped 15 FPS flipbook animation with strict 3-color palette:
 *   - #E2D9CA (Oatmeal Illustration Well)
 *   - #181512 (Felt-Tip Scribble Ink)
 *   - #FAF7F1 (Chalky Ivory Lens Fill)
 */
export const ArchivalLoupeScribble: React.FC<ArchivalLoupeScribbleProps> = ({
  className = '',
  message = 'Archival Scoring Engine analyzing acoustic & phonetic features...',
}) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 120)
    }, 66.7)
    return () => clearInterval(interval)
  }, [])

  const boilSeed = Math.floor(frame / 2) % 60
  // Loupe center sweeps horizontally across the manuscript page: X from 42 to 58
  const sweepProgress = Math.sin((frame / 120) * Math.PI * 2)
  const loupeX = 50 + sweepProgress * 12
  const loupeY = 46 + Math.cos((frame / 120) * Math.PI * 2) * 4

  return (
    <div
      id="archival-loupe-scribble"
      className={`relative inline-flex flex-col items-center justify-center overflow-hidden rounded-md shrink-0 select-none ${className}`}
      style={{
        backgroundColor: '#E2D9CA',
        padding: '24px',
      }}
    >
      <div style={{ width: '120px', height: '120px' }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="loupe-ink-boil" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.05"
                numOctaves={3}
                result="noise"
                seed={boilSeed}
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={1.8}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            <clipPath id="loupe-lens-clip">
              <circle cx={loupeX} cy={loupeY} r={17} />
            </clipPath>
          </defs>

          {/* Oatmeal canvas background */}
          <rect width="100" height="100" fill="#E2D9CA" />

          {/* Manuscript page background */}
          <rect
            x="18"
            y="18"
            width="64"
            height="64"
            fill="#FAF7F1"
            stroke="#181512"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Manuscript lines (outside lens) */}
          <g stroke="#181512" strokeWidth="1.5" strokeLinecap="round" opacity="0.35">
            <line x1="26" y1="30" x2="74" y2="30" />
            <line x1="26" y1="42" x2="74" y2="42" />
            <line x1="26" y1="54" x2="74" y2="54" />
            <line x1="26" y1="66" x2="62" y2="66" />
          </g>

          {/* Manuscript aligned calligraphy (revealed inside loupe lens clip) */}
          <g clipPath="url(#loupe-lens-clip)">
            <circle cx={loupeX} cy={loupeY} r={17} fill="#FAF7F1" />
            <g stroke="#9A3412" strokeWidth="2.2" strokeLinecap="round">
              <line x1="20" y1="30" x2="80" y2="30" />
              <line x1="20" y1="42" x2="80" y2="42" />
              <line x1="20" y1="54" x2="80" y2="54" />
              <line x1="20" y1="66" x2="80" y2="66" />
            </g>
          </g>

          {/* The Loupe Brass Ring and Handle */}
          <g filter="url(#loupe-ink-boil)">
            {/* Lens Rim */}
            <circle
              cx={loupeX}
              cy={loupeY}
              r={17}
              fill="none"
              stroke="#181512"
              strokeWidth="3.2"
            />
            {/* Handle angled downwards to the right */}
            <line
              x1={loupeX + 12}
              y1={loupeY + 12}
              x2={loupeX + 28}
              y2={loupeY + 28}
              stroke="#181512"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      {message && (
        <p className="font-serif text-xs font-semibold text-primary mt-3 text-center tracking-wide">
          {message}
        </p>
      )}
    </div>
  )
}
