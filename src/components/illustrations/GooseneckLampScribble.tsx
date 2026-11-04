import React, { useEffect, useState } from 'react';

export interface GooseneckLampScribbleProps {
  className?: string;
}

/**
 * GooseneckLampScribble:
 * Implements DESIGN.md Section 5.9 (Claude felt-tip marker editorial style).
 * Stepped 15 FPS (66.7ms setInterval, zero CSS transitions) flipbook animation.
 * Strict 3-color palette:
 *   - #E2D9CA (Oatmeal Illustration Well background & fills)
 *   - #181512 (Felt-Tip Scribble Ink)
 *   - #FAF7F1 (Chalky Beam Light cone)
 */
export const GooseneckLampScribble: React.FC<GooseneckLampScribbleProps> = ({ className = '' }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    // Stepped 15 FPS: 1000ms / 15 ≈ 66.7ms
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 160);
    }, 66.7);
    return () => clearInterval(interval);
  }, []);

  // Line boil turbulence seed changes every 2 frames -> 7.5 FPS boil rate inside 15 FPS loop
  const boilSeed = Math.floor(frame / 2) % 100;

  // Phase 1: Frames 0-18 - Stepped sketch-in of base, stem, shade, and manuscript page
  const baseDashOffset = Math.max(0, (1 - Math.min(1, frame / 5)) * 600);
  const stemDashOffset = Math.max(0, (1 - Math.min(1, Math.max(0, (frame - 4) / 6))) * 600);
  const shadeDashOffset = Math.max(0, (1 - Math.min(1, Math.max(0, (frame - 9) / 5))) * 800);
  const pageDashOffset = Math.max(0, (1 - Math.min(1, Math.max(0, (frame - 13) / 5))) * 1200);

  // Phase 2: Frames 19-24 - Warm 2-frame bulb flicker-on
  let lightOpacity = 0;
  if (frame >= 19 && frame <= 24) {
    if (frame === 20) lightOpacity = 0.45;
    else if (frame === 21) lightOpacity = 0;
    else if (frame === 22) lightOpacity = 0.95;
    else if (frame === 23) lightOpacity = 0.65;
    else if (frame >= 24) lightOpacity = 0.92;
  } else if (frame > 24) {
    lightOpacity = 0.92;
  }

  // Phase 3 & 4: Frames 25-160 - Expressive choreography & cursive writing
  // Deliberate scanning across Row 1 (Y=300), Row 2 (Y=364), Row 3 (Y=436)
  let lampTilt = 0;
  let stemFlexX = 0;
  let stemFlexY = 0;
  let sweepX = 640;

  let row1Dash = 400;
  let row2Dash = 400;
  let row3Dash = 400;

  if (frame < 25) {
    sweepX = 630;
    stemFlexX = 0;
    stemFlexY = 0;
    lampTilt = 0;
    row1Dash = 400;
    row2Dash = 400;
    row3Dash = 400;
  } else if (frame <= 65) {
    // Scanning Row 1 (sweep 25-55, deliberate pause 55-65)
    const p = Math.min(1, (frame - 25) / 30);
    sweepX = 630 + p * 130;
    stemFlexX = p * 6;
    stemFlexY = -p * 2;
    lampTilt = -2 + p * 4;
    row1Dash = Math.max(0, 400 * (1 - p));
  } else if (frame <= 105) {
    // Scanning Row 2 (sweep 65-95, deliberate pause 95-105)
    row1Dash = 0;
    const p = Math.min(1, (frame - 65) / 30);
    sweepX = 630 + p * 130;
    stemFlexX = 6 + p * 5;
    stemFlexY = -2 + p * 5;
    lampTilt = 2 + p * 5;
    row2Dash = Math.max(0, 400 * (1 - p));
  } else if (frame <= 148) {
    // Scanning Row 3 (sweep 105-138, deliberate pause 138-148)
    row1Dash = 0;
    row2Dash = 0;
    const p = Math.min(1, (frame - 105) / 30);
    sweepX = 630 + p * 130;
    stemFlexX = 11 - p * 4;
    stemFlexY = 3 + p * 7;
    lampTilt = 7 + p * 5;
    row3Dash = Math.max(0, 400 * (1 - p));
  } else {
    // Reset glance back to start
    row1Dash = 0;
    row2Dash = 0;
    row3Dash = 0;
    const p = (frame - 148) / 12;
    sweepX = 760 - p * 130;
    stemFlexX = 7 * (1 - p);
    stemFlexY = 10 * (1 - p);
    lampTilt = 12 * (1 - p);
  }

  // Lampshade rim coordinates
  const rim1X = 408 + stemFlexX;
  const rim1Y = 280 + stemFlexY;
  const rim2X = 560 + stemFlexX;
  const rim2Y = 194 + stemFlexY;

  // #FAF7F1 light cone sweeps from rim (408,280)-(560,194) down to baseline Y=505
  const coneLeftBottomX = Math.max(580, sweepX - 70);
  const coneRightBottomX = Math.min(840, sweepX + 80);
  const lightConePolygon = `${rim1X},${rim1Y} ${rim2X},${rim2Y} ${coneRightBottomX},505 ${coneLeftBottomX},505`;

  // 3 tiny hand-drawn floating specks inside light cone
  const speck1X = 530 + Math.sin(frame * 0.08) * 20 + (sweepX - 640) * 0.2;
  const speck1Y = 250 + ((frame * 0.8) % 220);
  const speck2X = 600 + Math.cos(frame * 0.06) * 25 + (sweepX - 640) * 0.3;
  const speck2Y = 270 + (((frame * 0.6) + 70) % 200);
  const speck3X = 650 + Math.sin(frame * 0.09 + 1.2) * 20 + (sweepX - 640) * 0.35;
  const speck3Y = 280 + (((frame * 0.7) + 140) % 210);

  return (
    <div
      id="onb-scribble-hero"
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: '#E2D9CA', height: '210px' }}
    >
      <svg
        viewBox="0 0 1000 640"
        className="h-full w-auto max-w-full select-none"
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Stepped 7.5 FPS Line Boil Filter (scale=2.2) */}
          <filter id="hand-drawn-boil" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045"
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

          {/* Dynamic Light Reveal Clip Path */}
          <clipPath id="light-reveal-clip">
            <polygon points={lightConePolygon} />
          </clipPath>
        </defs>

        {/* Strict 3-color Palette Canvas: Oatmeal Background */}
        <rect width="1000" height="640" fill="#E2D9CA" />

        {/* Stepped Line Boil Filter Group */}
        <g filter="url(#hand-drawn-boil)">
          {/* Light Cone Polygon (Chalky Beam #FAF7F1 sweeping to baseline Y=505) */}
          {lightOpacity > 0 && (
            <polygon
              points={lightConePolygon}
              fill="#FAF7F1"
              opacity={lightOpacity}
            />
          )}

          {/* 3 tiny hand-drawn floating specks inside light cone */}
          {lightOpacity > 0.5 && (
            <g fill="#181512" opacity={0.35}>
              <circle cx={speck1X} cy={speck1Y} r="3" />
              <circle cx={speck2X} cy={speck2Y} r="3.5" />
              <circle cx={speck3X} cy={speck3Y} r="2.8" />
            </g>
          )}

          {/* 3 Rows of Cursive Garland Scribbles (Y=300, 364, 436, strokeWidth="13.5") */}
          {/* Light Reveal: Actively write themselves out stroke-by-stroke inside clipPath (zero ghost text outside) */}
          <g
            clipPath="url(#light-reveal-clip)"
            stroke="#181512"
            strokeWidth="13.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Row 1 cursive garland scribble (Y=300) */}
            <path
              d="M 632 300 C 646 288, 656 312, 670 300 C 684 288, 694 312, 708 300 C 722 288, 732 312, 746 300 C 754 294, 762 304, 768 300"
              strokeDasharray="400"
              strokeDashoffset={row1Dash}
            />
            {/* Row 2 cursive garland scribble (Y=364) */}
            <path
              d="M 632 364 C 646 352, 656 376, 670 364 C 684 352, 694 376, 708 364 C 722 352, 732 376, 746 364 C 754 358, 762 368, 768 364"
              strokeDasharray="400"
              strokeDashoffset={row2Dash}
            />
            {/* Row 3 cursive garland scribble (Y=436) */}
            <path
              d="M 632 436 C 646 424, 656 448, 670 436 C 684 424, 694 448, 708 436 C 722 424, 732 448, 746 436 C 754 430, 762 440, 768 436"
              strokeDasharray="400"
              strokeDashoffset={row3Dash}
            />
          </g>

          {/* Manuscript Page Frame (X:606..784, Y:248..505, strokeWidth="14") sits cleanly on top of light beam */}
          <g
            stroke="#181512"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon
              points="606,248 784,248 784,505 606,505"
              strokeDasharray="1200"
              strokeDashoffset={pageDashOffset}
            />
          </g>

          {/* Hollow Dome Base: (X:224..406, Y:440..505, strokeWidth="14", fill="#E2D9CA") */}
          <path
            d="M 224 505 L 406 505 C 408 462, 378 440, 315 440 C 252 440, 222 462, 224 505 Z"
            fill="#E2D9CA"
            stroke="#181512"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="600"
            strokeDashoffset={baseDashOffset}
          />

          {/* Single C-curve Gooseneck Stem: (302,440 to 398,178 flexed by stemFlexX/Y, strokeWidth="17") */}
          <path
            d={`M 302 440 C ${292 + stemFlexX * 0.7} ${310 + stemFlexY * 0.5}, ${305 + stemFlexX} ${190 + stemFlexY}, ${398 + stemFlexX} ${178 + stemFlexY}`}
            fill="none"
            stroke="#181512"
            strokeWidth="17"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="600"
            strokeDashoffset={stemDashOffset}
          />

          {/* Compound Bell Shade (Tilted/rotated by lampTilt, strokeWidth="14", fill="#E2D9CA") */}
          <g
            transform={`translate(${stemFlexX}, ${stemFlexY}) rotate(${lampTilt} 470 200)`}
            strokeDasharray="800"
            strokeDashoffset={shadeDashOffset}
          >
            <path
              d="M 382 182 C 368 148, 392 110, 426 112 C 452 114, 466 138, 462 162 C 502 154, 542 168, 560 194 L 406 282 C 390 250, 396 212, 418 192 C 400 196, 388 192, 382 182 Z"
              fill="#E2D9CA"
              stroke="#181512"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
