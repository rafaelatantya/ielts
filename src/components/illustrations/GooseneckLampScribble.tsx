import React, { useState, useEffect, useCallback } from 'react'

interface GooseneckLampScribbleProps {
  className?: string
}

export const GooseneckLampScribble: React.FC<GooseneckLampScribbleProps> = ({
  className = '',
}) => {
  const [seed, setSeed] = useState<number>(1)
  const [phase, setPhase] = useState<'init' | 'drawn' | 'swept'>('init')
  const [sweepToggle, setSweepToggle] = useState<boolean>(false)

  const triggerAnimation = useCallback(() => {
    setPhase('init')
    setTimeout(() => setPhase('drawn'), 60)
    setTimeout(() => setPhase('swept'), 620)
  }, [])

  useEffect(() => {
    triggerAnimation()
  }, [triggerAnimation])

  // Continuous gentle sweep + 9 FPS stepped line boil (110ms)
  useEffect(() => {
    const boilInterval = setInterval(() => {
      setSeed((prev) => (prev % 3) + 1)
    }, 110)
    const sweepInterval = setInterval(() => {
      setSweepToggle((prev) => !prev)
    }, 2600)
    return () => {
      clearInterval(boilInterval)
      clearInterval(sweepInterval)
    }
  }, [])

  // Exact polygon vertices matching the Claude desk lamp scribble reference:
  // Top-Left (shade lower lip): (408, 280)
  // Top-Right (shade upper lip): (560, 194)
  // Bottom-Right (baseline Y=505, poking slightly past document right edge X=784): 798 or 762
  // Bottom-Left (baseline Y=505): 488 or 474
  const beamPoints =
    phase === 'init'
      ? '408,280 560,194 510,505 488,505'
      : sweepToggle
      ? '408,280 560,194 762,505 474,505'
      : '408,280 560,194 798,505 488,505'

  return (
    <div
      id="onb-scribble-hero"
      onClick={triggerAnimation}
      className={`relative w-full overflow-hidden rounded-md cursor-pointer select-none border border-border-subtle ${className}`}
      style={{ backgroundColor: '#E2D9CA', height: '210px' }}
      title="Click to replay lamp illumination sweep"
    >
      <svg
        viewBox="0 0 1000 640"
        className="w-full h-full object-contain"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Felt-tip marker organic wobble filter */}
          <filter id="claude-ink-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.022"
              numOctaves={3}
              seed={seed}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={3.2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* ClipPath bound to the exact light cone polygon */}
          <clipPath id="light-reveal-clip">
            <polygon
              id="light-cone-geometry"
              points={beamPoints}
              className="transition-all duration-1000 ease-in-out"
            />
          </clipPath>
        </defs>

        {/* LAYER 0: Warm Oatmeal Parchment Canvas (#E2D9CA) */}
        <rect width="1000" height="640" fill="#E2D9CA" />

        {/* LAYER 1: Chalky Warm Ivory Light Cone (#FAF7F1) */}
        <polygon
          points={beamPoints}
          fill="#FAF7F1"
          className="transition-all duration-1000 ease-in-out"
          style={{
            opacity: phase === 'init' ? 0 : 1,
          }}
        />

        {/* LAYER 2: Cursive Garland Wave Scribbles — Strictly Clipped to the Light Beam */}
        <g clipPath="url(#light-reveal-clip)" filter="url(#claude-ink-wobble)">
          {/* Row 1 (Top — first loop revealed near left margin before diagonal beam cuts off) */}
          <path
            d="M 636 300 C 638 332, 656 332, 664 298 C 666 332, 686 332, 694 298 C 696 332, 716 332, 724 298 C 726 332, 746 332, 754 298"
            stroke="#181512"
            strokeWidth="13.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Row 2 (Middle — 2.5 loops revealed inside beam) */}
          <path
            d="M 642 364 C 644 398, 664 398, 672 362 C 674 398, 694 398, 702 362 C 704 398, 724 398, 732 362 C 734 398, 754 398, 762 362"
            stroke="#181512"
            strokeWidth="13.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Row 3 (Bottom — 3.5 loops revealed inside beam) */}
          <path
            d="M 646 436 C 648 470, 668 470, 676 434 C 678 470, 698 470, 706 434 C 708 470, 728 470, 736 434 C 738 470, 758 470, 766 434"
            stroke="#181512"
            strokeWidth="13.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* LAYER 3: Unclipped Manuscript Page Frame (Sits ON TOP of light beam) */}
        <path
          d="M 608 248 C 665 247, 725 249, 784 248 C 783 335, 785 420, 782 505 C 725 504, 665 506, 606 505 C 607 420, 606 335, 608 248 Z"
          stroke="#181512"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#claude-ink-wobble)"
          style={{
            strokeDasharray: 900,
            strokeDashoffset: phase === 'init' ? 900 : 0,
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />

        {/* LAYER 4: Gooseneck Desk Lamp Assembly (Left) */}
        <g filter="url(#claude-ink-wobble)">
          {/* C-Curve Gooseneck Stem */}
          <path
            d="M 302 440 C 292 310, 305 190, 398 178"
            stroke="#181512"
            strokeWidth="17"
            strokeLinecap="round"
            style={{
              strokeDasharray: 450,
              strokeDashoffset: phase === 'init' ? 450 : 0,
              transition: 'stroke-dashoffset 550ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />

          {/* Hollow Dome Lamp Base (Resting flush on baseline Y = 505) */}
          <path
            d="M 224 505 L 406 505 C 408 462, 378 440, 315 440 C 252 440, 222 462, 224 505 Z"
            fill="#E2D9CA"
            stroke="#181512"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 550,
              strokeDashoffset: phase === 'init' ? 550 : 0,
              transition: 'stroke-dashoffset 550ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />

          {/* Compound Bell Lampshade (Pivots gently with the light cone) */}
          <g
            className="transition-transform duration-1000 ease-in-out"
            style={{
              transformOrigin: '398px 178px',
              transform: sweepToggle ? 'rotate(2.5deg)' : 'rotate(0deg)',
            }}
          >
            <path
              d="M 382 182 C 368 148, 392 110, 426 112 C 452 114, 466 138, 462 162 C 502 154, 542 168, 560 194 L 406 282 C 390 250, 396 212, 418 192 C 400 196, 388 192, 382 182 Z"
              fill="#E2D9CA"
              stroke="#181512"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 650,
                strokeDashoffset: phase === 'init' ? 650 : 0,
                transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
