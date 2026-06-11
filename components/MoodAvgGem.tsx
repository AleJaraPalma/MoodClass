'use client'

import { GemDisplay } from './GemSelector'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpColorStops(value: number, stops: [number, [number, number, number]][]): [number, number, number] {
  if (value <= stops[0][0]) return stops[0][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i]
    const [v1, c1] = stops[i + 1]
    if (value <= v1) {
      const t = (value - v0) / (v1 - v0)
      return [
        Math.round(lerp(c0[0], c1[0], t)),
        Math.round(lerp(c0[1], c1[1], t)),
        Math.round(lerp(c0[2], c1[2], t)),
      ]
    }
  }
  return stops[stops.length - 1][1]
}

// Magenta-rojizo (1) → ámbar dorado (3) → verde-azul brillante (5)
const COLOR_STOPS: [number, [number, number, number]][] = [
  [1,   [236, 72, 153]],  // #EC4899
  [3,   [245, 158, 11]],  // #F59E0B
  [4.5, [16, 185, 129]],  // #10B981
  [5,   [6, 182, 212]],   // #06B6D4
]

const BAR_GRADIENT = `linear-gradient(90deg, #EC4899 0%, #F59E0B 50%, #10B981 80%, #06B6D4 100%)`

interface MoodAvgGemProps {
  avg: number | null
  size?: number
}

export default function MoodAvgGem({ avg, size = 60 }: MoodAvgGemProps) {
  const hasData = avg !== null
  const v = hasData ? Math.max(1, Math.min(5, avg)) : 3
  const pct = ((v - 1) / 4) * 100

  const [r, g, b] = lerpColorStops(v, COLOR_STOPS)
  const color = `rgb(${r}, ${g}, ${b})`
  const glowOpacity = hasData ? 0.35 + (pct / 100) * 0.5 : 0
  const glowColor = `rgba(${r}, ${g}, ${b}, ${glowOpacity})`

  return (
    <div className="w-full pt-16 pb-1 px-2">
      {/* Gema flotante + número */}
      <div
        className="absolute top-0 flex flex-col items-center"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
      >
        <div className="text-2xl font-extrabold font-sora leading-none mb-1 whitespace-nowrap" style={{ color: hasData ? color : '#94A3B8' }}>
          {hasData ? avg!.toFixed(1) : '—'}
        </div>
        <GemDisplay color={hasData ? color : '#CBD5E1'} glowColor={glowColor} lit={hasData} size={size} />
      </div>

      {/* Barra termómetro */}
      <div className="h-3 rounded-full" style={{ background: BAR_GRADIENT, opacity: hasData ? 1 : 0.25 }} />

      {/* Ticks */}
      <div className="relative h-4 mt-1.5">
        {[1, 2, 3, 4, 5].map(tick => (
          <div
            key={tick}
            className="absolute flex flex-col items-center"
            style={{ left: `${((tick - 1) / 4) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-px h-1.5 bg-slate-300" />
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">{tick}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
