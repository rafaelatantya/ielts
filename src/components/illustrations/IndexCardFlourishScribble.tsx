import React, { useEffect, useState } from 'react'

export interface IndexCardFlourishScribbleProps {
  className?: string
}

/**
 * IndexCardFlourishScribble:
 * Implements DESIGN.md Section 5.9 & Screen 09 Section 3 (`fsrs-empty-state`).
 * Hand-drawn index card stack with a flourishing fountain pen ink loop in Claude editorial style.
 * 15 FPS stepped flipbook boil rate (66.7ms interval).
 * Strict 3-tone illustration palette:
 *   - #E2D9CA (Oatmeal Illustration Well background)
 *   - #181512 (Espresso Felt-Tip Scribble Ink)
 *   - #FAF7F1 (Chalky Beam Light cones & clean paper index sheets)
 */
export const IndexCardFlourishScribble: React.FC<IndexCardFlourishScribbleProps> = ({
  className = '',
}) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    // Stepped 15 FPS: 1000ms / 15 ≈ 66.7ms
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 60)
    }, 66.7)
    return () => clearInterval(interval)
  }, [])

  // Line boil seed changes every 2 frames -> 7.5 FPS boil rate
  const boilSeed = Math.floor(frame / 2) % 50

  // Animated flourish offset along fountain pen loop
  const penBobY = Math.sin((frame / 60) * Math.PI * 2) * 3
  const penBobX = Math.cos((frame / 60) * Math.PI * 2) * 2

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-md select-none ${className}`}
      style={{
        width: '160px',
        height: '110px',
        backgroundColor: '#E2D9CA',
      }}
      title="Index Card Deck Completed"
    >
      <svg
        viewBox="0 0 320 220"
        className="w-full h-full select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="index-card-boil" x="-20%" y="-20%" width="140%" height="140%">
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
              scale={2.2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* Oatmeal canvas background */}
        <rect width="320" height="220" fill="#E2D9CA" />

        {/* Filtered Scribble Elements */}
        <g filter="url(#index-card-boil)">
          {/* Bottom Card (Tilted Stack Layer 1) */}
          <polygon
            points="62,142 238,158 248,84 72,68"
            fill="#FAF7F1"
            stroke="#181512"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Middle Card (Tilted Stack Layer 2) */}
          <polygon
            points="70,148 246,140 240,66 64,74"
            fill="#FAF7F1"
            stroke="#181512"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Top Crisp Paper Index Card (#FAF7F1, upright with ruled red/ink margins) */}
          <polygon
            points="76,152 244,152 244,70 76,70"
            fill="#FAF7F1"
            stroke="#181512"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Top Index Card Ruled Lines */}
          {/* Header divider line */}
          <line
            x1="86"
            y1="90"
            x2="234"
            y2="90"
            stroke="#181512"
            strokeWidth="2.5"
            strokeDasharray="1 0"
            opacity="0.85"
          />
          {/* Body ruling lines */}
          <line
            x1="86"
            y1="108"
            x2="234"
            y2="108"
            stroke="#181512"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
          <line
            x1="86"
            y1="124"
            x2="210"
            y2="124"
            stroke="#181512"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
          <line
            x1="86"
            y1="140"
            x2="175"
            y2="140"
            stroke="#181512"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Checkmark flourish on top card */}
          <path
            d="M 100,100 L 112,112 L 138,82"
            fill="none"
            stroke="#181512"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Looping cursive ribbon / fountain pen flourish ink thread across the cards */}
          <path
            d="M 40,165 C 75,178 120,160 155,175 C 190,190 230,172 275,182"
            fill="none"
            stroke="#181512"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 210,135 C 235,115 265,120 280,140 C 295,160 282,185 255,185 C 228,185 220,158 245,148"
            fill="none"
            stroke="#181512"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Fountain Pen Nib Floating in Flourish */}
          <g transform={`translate(${penBobX}, ${penBobY})`}>
            {/* Nib body */}
            <polygon
              points="270,105 285,130 255,130"
              fill="#181512"
              stroke="#181512"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Nib breather hole & slit */}
            <circle cx="270" cy="120" r="1.5" fill="#FAF7F1" />
            <line x1="270" y1="105" x2="270" y2="120" stroke="#FAF7F1" strokeWidth="1" />
            {/* Ink drop */}
            <circle cx="270" cy="100" r="2" fill="#181512" />
          </g>
        </g>
      </svg>
    </div>
  )
}
