'use client'

import { useId } from 'react'

interface GemShapeProps {
  color: string
  lit: boolean
  size?: number
}

export function GemShape({ color, lit, size = 48 }: GemShapeProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main gem gradient: vivid for lit, subtle translucent silver-colored for unlit */}
        <linearGradient id={`gem-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={lit ? color : '#FFFFFF'} stopOpacity={lit ? 1 : 0.8} />
          <stop offset="50%" stopColor={lit ? color : '#F1F5F9'} stopOpacity={lit ? 0.8 : 0.6} />
          <stop offset="100%" stopColor={lit ? '#000000' : '#E2E8F0'} stopOpacity={lit ? 0.5 : 0.4} />
        </linearGradient>
        <linearGradient id={`gem-shine-${uid}`} x1="0%" y1="0%" x2="60%" y2="60%">
          <stop offset="0%" stopColor="white" stopOpacity={lit ? 0.6 : 0.15} />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Top facets */}
      <polygon
        points="24,4 40,18 24,24 8,18"
        fill={`url(#gem-grad-${uid})`}
        stroke={lit ? color : '#CBD5E1'}
        strokeWidth="0.75"
        strokeOpacity={lit ? 0.9 : 0.5}
      />
      {/* Left facet */}
      <polygon
        points="8,18 24,24 24,44"
        fill={lit ? color : '#F8FAFC'}
        fillOpacity={lit ? 0.7 : 0.4}
        stroke={lit ? color : '#CBD5E1'}
        strokeWidth="0.75"
        strokeOpacity={lit ? 0.7 : 0.4}
      />
      {/* Right facet */}
      <polygon
        points="40,18 24,44 24,24"
        fill={lit ? color : '#E2E8F0'}
        fillOpacity={lit ? 0.85 : 0.5}
        stroke={lit ? color : '#CBD5E1'}
        strokeWidth="0.75"
        strokeOpacity={lit ? 0.7 : 0.4}
      />
      {/* Top shine highlight */}
      <polygon
        points="24,4 32,14 24,18 16,14"
        fill={`url(#gem-shine-${uid})`}
      />
      {/* Center sparkle */}
      {lit && (
        <circle cx="24" cy="20" r="2.5" fill="white" opacity="0.85" style={{ filter: 'drop-shadow(0 0 2px white)' }} />
      )}
    </svg>
  )
}

interface GemDisplayProps {
  color: string
  glowColor: string
  lit: boolean
  size?: number
}

/** Gema estática (sin botón), con el mismo aura/glow que las gemas del check-in */
export function GemDisplay({ color, glowColor, lit, size = 48 }: GemDisplayProps) {
  return (
    <div
      className={`gem-display ${lit ? 'lit' : ''}`}
      style={{ '--gem-glow': glowColor } as React.CSSProperties}
    >
      <GemShape color={color} lit={lit} size={size} />
    </div>
  )
}

interface GemProps {
  color: string
  glowColor: string
  lit: boolean
  onClick: () => void
  size?: number
}

function Gem({ color, glowColor, lit, onClick, size = 48 }: GemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gem-btn ${lit ? 'lit' : ''} transition-all duration-300 focus:outline-none`}
      style={{
        '--gem-glow': glowColor,
      } as React.CSSProperties}
    >
      <GemShape color={color} lit={lit} size={size} />
    </button>
  )
}

interface GemSelectorProps {
  value: number
  onChange: (value: number) => void
  color: string
  glowColor: string
  size?: number
}

export default function GemSelector({
  value,
  onChange,
  color,
  glowColor,
  size = 48,
}: GemSelectorProps) {
  return (
    <div className="flex items-center gap-2.5 justify-center py-2">
      {[1, 2, 3, 4, 5].map((gem) => (
        <Gem
          key={gem}
          color={color}
          glowColor={glowColor}
          lit={gem <= value}
          onClick={() => onChange(gem)}
          size={size}
        />
      ))}
    </div>
  )
}
