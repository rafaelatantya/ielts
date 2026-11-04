import React, { useEffect, useState } from 'react'

export interface CondenserMicScribbleProps {
  className?: string
  /** Live audio dBFS level (e.g. -60 to 0). When > -40 dBFS, cursive soundwaves boil at ~9-15 fps */
  liveDbfs?: number
}

/**
 * CondenserMicScribble:
 * Implements DESIGN.md Section 5.9 & Screen 03 Section 3 (`mic-scribble-icon`).
 * Hand-drawn studio condenser microphone on a warm oatmeal pill background (#E2D9CA),
 * with felt-tip ink (#181512) and chalky ivory beam highlight (#FAF7F1).
 * When liveDbfs > -40 dBFS, the radiating cursive soundwave loops boil/animate actively.
 */
export const CondenserMicScribble: React.FC<CondenserMicScribbleProps> = ({
  className = '',
  liveDbfs = -60,
}) => {
  const [frame, setFrame] = useState(0)
  const isSpeaking = liveDbfs > -40

  useEffect(() => {
    // Stepped 15 FPS: 1000ms / 15 ≈ 66.7ms
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 60)
    }, 66.7)
    return () => clearInterval(interval)
  }, [])

  // Line boil seed changes every 2 frames -> 7.5 FPS boil rate
  const boilSeed = Math.floor(frame / 2) % 50

  // Soundwave animation offset
  const wavePulse = isSpeaking ? (frame % 3) * 1.5 : 0
  const waveOpacity = isSpeaking ? 0.95 : 0.45

  return (
    <div
      id="mic-scribble-icon"
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-md shrink-0 select-none ${className}`}
      style={{
        width: '48px',
        height: '48px',
        backgroundColor: '#E2D9CA',
      }}
      title="Studio Condenser Microphone"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mic-ink-boil" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.06"
              numOctaves={3}
              result="noise"
              seed={boilSeed}
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={isSpeaking ? 2.5 : 1.2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* Oatmeal canvas background */}
        <rect width="100" height="100" fill="#E2D9CA" />

        {/* Chalky Beam acoustic glow polygon (#FAF7F1) */}
        <polygon
          points="50,42 88,18 88,78 50,56"
          fill="#FAF7F1"
          opacity={isSpeaking ? 0.9 : 0.4}
        />

        <g filter="url(#mic-ink-boil)">
          {/* Studio Condenser Mic Body */}
          {/* Cylindrical capsule top */}
          <path
            d="M 38 34 C 38 24, 62 24, 62 34 L 62 52 C 62 60, 38 60, 38 52 Z"
            fill="#FAF7F1"
            stroke="#181512"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Grille mesh horizontal score lines */}
          <line x1="41" y1="31" x2="59" y2="31" stroke="#181512" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="40" y1="38" x2="60" y2="38" stroke="#181512" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="41" y1="45" x2="59" y2="45" stroke="#181512" strokeWidth="2.2" strokeLinecap="round" />

          {/* Shockmount U-cradle frame */}
          <path
            d="M 30 46 C 30 68, 70 68, 70 46"
            fill="none"
            stroke="#181512"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Mic Stand Spine & Base */}
          <line x1="50" y1="64" x2="50" y2="82" stroke="#181512" strokeWidth="3.6" strokeLinecap="round" />
          <path
            d="M 32 84 C 44 80, 56 80, 68 84"
            fill="none"
            stroke="#181512"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Radiating Cursive Soundwave Loops ("u/w" garland curves) on right */}
          <g
            stroke="#181512"
            fill="none"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={waveOpacity}
          >
            {/* Wave arc 1 */}
            <path
              d={`M 74 ${38 - wavePulse} C 78 ${44 + wavePulse}, 78 ${50 - wavePulse}, 74 ${56 + wavePulse}`}
            />
            {/* Wave arc 2 */}
            <path
              d={`M 82 ${32 + wavePulse} C 88 ${42 - wavePulse}, 88 ${52 + wavePulse}, 82 ${62 - wavePulse}`}
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
