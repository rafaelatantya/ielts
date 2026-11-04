import React, { useState } from 'react'

export interface ChartDataSeries {
  label: string
  color: string
  values: number[]
}

export interface Task1ChartSpec {
  title: string
  xAxisLabels: string[]
  yAxisLabel: string
  series: ChartDataSeries[]
  keyTrends: string[]
}

interface Task1ChartSvgProps {
  data: Task1ChartSpec
  chartType?: 'line' | 'bar' | 'pie' | 'table'
}

export const Task1ChartSvg: React.FC<Task1ChartSvgProps> = ({ data, chartType = 'line' }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    seriesLabel: string
    xLabel: string
    val: number
    x: number
    y: number
  } | null>(null)

  const { title, xAxisLabels, yAxisLabel, series } = data

  // Dimensions
  const width = 580
  const height = 280
  const padLeft = 55
  const padRight = 30
  const padTop = 35
  const padBottom = 45

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // Find max value for scaling
  const allValues = series.flatMap((s) => s.values)
  const maxVal = Math.max(...allValues, 10)
  const yMaxRounded = Math.ceil((maxVal * 1.15) / 10) * 10

  const getYCoord = (val: number) => {
    return padTop + chartH - (val / yMaxRounded) * chartH
  }

  const getXCoord = (index: number) => {
    if (xAxisLabels.length <= 1) return padLeft + chartW / 2
    return padLeft + (index / (xAxisLabels.length - 1)) * chartW
  }

  const isBar = chartType === 'bar'

  // Bar chart computations
  const groupCount = xAxisLabels.length
  const seriesCount = series.length
  const groupWidth = chartW / groupCount
  const barWidth = Math.min(28, (groupWidth * 0.7) / seriesCount)
  const groupSpacing = groupWidth - barWidth * seriesCount

  return (
    <div className="bg-[#FAF7F1] border border-[#E5DEC9] p-4 rounded-md shadow-inner space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E5DEC9] pb-2">
        <h4 className="font-serif text-sm font-semibold text-[#1C1917] tracking-tight">
          {title}
        </h4>
        <span className="font-mono text-[10px] text-secondary">
          Units: {yAxisLabel}
        </span>
      </div>

      <div className="relative overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[300px]"
          aria-label={title}
          role="img"
        >
          {/* Y Axis Grid lines & Ticks */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const val = Math.round(yMaxRounded * ratio)
            const y = padTop + chartH - ratio * chartH
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2D9CA"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? 'none' : '3,3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  fill="#78716C"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            )
          })}

          {/* X Axis line */}
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="#1C1917"
            strokeWidth="1.2"
          />

          {/* Render Line Graph */}
          {!isBar &&
            series.map((s, sIdx) => {
              const points = s.values.map((val, idx) => `${getXCoord(idx)},${getYCoord(val)}`).join(' ')

              return (
                <g key={sIdx}>
                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />

                  {/* Data Points */}
                  {s.values.map((val, idx) => {
                    const cx = getXCoord(idx)
                    const cy = getYCoord(val)
                    const isHovered =
                      hoveredPoint?.seriesLabel === s.label && hoveredPoint?.xLabel === xAxisLabels[idx]

                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#FFFFFF"
                        stroke={s.color}
                        strokeWidth={isHovered ? 2.5 : 2}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            seriesLabel: s.label,
                            xLabel: xAxisLabels[idx],
                            val,
                            x: cx,
                            y: cy,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )
                  })}
                </g>
              )
            })}

          {/* Render Bar Chart */}
          {isBar &&
            xAxisLabels.map((xLabel, gIdx) => {
              const groupLeft = padLeft + gIdx * groupWidth + groupSpacing / 2

              return (
                <g key={gIdx}>
                  {series.map((s, sIdx) => {
                    const val = s.values[gIdx] || 0
                    const barH = (val / yMaxRounded) * chartH
                    const x = groupLeft + sIdx * barWidth
                    const y = padTop + chartH - barH
                    const isHovered =
                      hoveredPoint?.seriesLabel === s.label && hoveredPoint?.xLabel === xLabel

                    return (
                      <rect
                        key={sIdx}
                        x={x}
                        y={y}
                        width={barWidth - 4}
                        height={Math.max(0, barH)}
                        fill={s.color}
                        opacity={isHovered ? 1.0 : 0.88}
                        rx="2"
                        className="cursor-pointer transition-opacity duration-150"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            seriesLabel: s.label,
                            xLabel,
                            val,
                            x: x + barWidth / 2,
                            y,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )
                  })}
                </g>
              )
            })}

          {/* X Axis Labels */}
          {xAxisLabels.map((label, idx) => {
            const x = isBar
              ? padLeft + idx * groupWidth + groupWidth / 2
              : getXCoord(idx)
            return (
              <text
                key={idx}
                x={x}
                y={padTop + chartH + 20}
                fill="#44403C"
                fontSize="11"
                fontFamily="Source Serif 4, Georgia, serif"
                textAnchor="middle"
              >
                {label}
              </text>
            )
          })}

          {/* Hover Tooltip Popup */}
          {hoveredPoint && (
            <g transform={`translate(${Math.min(width - 120, Math.max(padLeft, hoveredPoint.x - 50))}, ${Math.max(padTop - 25, hoveredPoint.y - 35)})`}>
              <rect
                width="100"
                height="28"
                rx="4"
                fill="#1C1917"
                opacity="0.92"
              />
              <text
                x="50"
                y="14"
                fill="#FFFFFF"
                fontSize="10"
                fontFamily="Plus Jakarta Sans, sans-serif"
                textAnchor="middle"
                fontWeight="500"
              >
                {hoveredPoint.seriesLabel}
              </text>
              <text
                x="50"
                y="24"
                fill="#FAF7F1"
                fontSize="9"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {hoveredPoint.xLabel}: {hoveredPoint.val}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Series Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-1 font-sans text-xs">
        {series.map((s, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-xs inline-block"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-serif text-[12px] text-[#1C1917]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
