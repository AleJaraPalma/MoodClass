'use client'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpStops(value: number, stops: [number, number][]): number {
  if (value <= stops[0][0]) return stops[0][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, s0] = stops[i]
    const [v1, s1] = stops[i + 1]
    if (value <= v1) {
      const t = (value - v0) / (v1 - v0)
      return lerp(s0, s1, t)
    }
  }
  return stops[stops.length - 1][1]
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

// Magenta-rojizo apagado → rosa-ámbar → ámbar dorado → verde-lima → verde-azul brillante
const COLOR_STOPS: [number, [number, number, number]][] = [
  [1,   [190, 24, 93]],
  [2,   [240, 138, 139]],
  [3,   [245, 158, 11]],
  [4,   [132, 204, 22]],
  [4.5, [45, 212, 191]],
  [5,   [6, 182, 212]],
]

const GLOW_STOPS: [number, number][] = [
  [1, 0.12], [2, 0.25], [3, 0.45], [4, 0.65], [4.5, 0.85], [5, 0.95],
]

// Negativo = boca curva hacia arriba (triste), positivo = sonrisa
const MOUTH_STOPS: [number, number][] = [
  [1, -7], [2, -3.5], [3, 0], [4, 4], [4.5, 7], [5, 7.5],
]

export function getMoodPhrase(avg: number | null): string {
  if (avg === null) return 'Esperando respuestas'
  if (avg < 1.5) return 'Reportar. Algo no anda bien'
  if (avg < 2.5) return 'Conversar. El ánimo está bajo'
  if (avg < 3.5) return 'Observar. Curso en punto medio'
  if (avg < 4.5) return 'Fluye. Hay buena disposición'
  return 'Brilla. El curso está on fire!'
}

interface MoodAvgGemProps {
  avg: number | null
  size?: number
}

export default function MoodAvgGem({ avg, size = 90 }: MoodAvgGemProps) {
  const v = avg === null ? null : Math.max(1, Math.min(5, avg))

  const [r, g, b] = v === null ? [148, 163, 184] : lerpColorStops(v, COLOR_STOPS)
  const color = `rgb(${r}, ${g}, ${b})`
  const glowOpacity = v === null ? 0 : lerpStops(v, GLOW_STOPS)
  const glowColor = `rgba(${r}, ${g}, ${b}, ${glowOpacity})`
  const mouthOffset = v === null ? 0 : lerpStops(v, MOUTH_STOPS)
  const pulse = v !== null && v >= 4.5
  const fillOpacity = v === null ? 0.35 : 1

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        '--gem-glow': glowColor,
        animation: pulse ? 'gemPulse 2.5s ease-in-out infinite' : undefined,
        filter: !pulse ? `drop-shadow(0 0 ${10 + glowOpacity * 18}px ${glowColor})` : undefined,
      } as React.CSSProperties}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="moodgem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="55%" stopColor={color} stopOpacity={fillOpacity * 0.75} />
            <stop offset="100%" stopColor="#000000" stopOpacity={fillOpacity * 0.35} />
          </linearGradient>
          <linearGradient id="moodgem-shine" x1="0%" y1="0%" x2="60%" y2="60%">
            <stop offset="0%" stopColor="white" stopOpacity={v === null ? 0.15 : 0.45} />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Cristal irregular */}
        <polygon points="50,4 88,34 72,96 28,96 12,34" fill="url(#moodgem-grad)" stroke={color} strokeOpacity={fillOpacity * 0.6} strokeWidth="1" />
        <polygon points="50,4 88,34 50,46 12,34" fill={color} fillOpacity={fillOpacity * 0.18} />
        <polygon points="12,34 50,46 28,96" fill={color} fillOpacity={fillOpacity * 0.12} />
        <polygon points="88,34 72,96 50,46" fill={color} fillOpacity={fillOpacity * 0.28} />
        <polygon points="50,4 62,18 50,26 38,18" fill="url(#moodgem-shine)" />

        {/* Cara */}
        <circle cx="38" cy="48" r="3.5" fill="rgba(15,23,42,0.55)" />
        <circle cx="62" cy="48" r="3.5" fill="rgba(15,23,42,0.55)" />
        <path
          d={`M 38 64 Q 50 ${64 + mouthOffset} 62 64`}
          stroke="rgba(15,23,42,0.55)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
