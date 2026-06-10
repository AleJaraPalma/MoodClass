'use client'

import GemSelector from './GemSelector'
import type { DimensionConfig } from '@/lib/types'
import DimensionIcon from './DimensionIcon'

interface DimensionCardProps {
  dimension: DimensionConfig
  value: number
  onChange: (value: number) => void
  question: string
  index: number
}

export default function DimensionCard({
  dimension,
  value,
  onChange,
  question,
  index,
}: DimensionCardProps) {
  const currentLabel = value > 0 ? dimension.levels[value - 1] : null

  return (
    <div
      className="card p-6 anim-fade-up"
      style={{
        animationDelay: `${index * 0.08}s`,
        borderColor: value > 0 ? `${dimension.color}35` : 'var(--border)',
        background: value > 0 ? `linear-gradient(180deg, var(--bg-white), ${dimension.color}08)` : 'var(--bg-white)',
        opacity: 0, /* will be set to 1 by anim-fade-up animation */
        animationFillMode: 'forwards',
      }}
    >
      <div className="flex items-center gap-3.5 mb-4">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${dimension.color}12`, color: dimension.color }}>
          <DimensionIcon iconName={dimension.icon} className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-base" style={{ color: dimension.color }}>
              {dimension.label}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium leading-none">
              {dimension.description}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {question}
          </p>
        </div>
      </div>

      <GemSelector
        value={value}
        onChange={onChange}
        color={dimension.color}
        glowColor={dimension.glowColor}
        size={50}
      />

      {/* Scale labels */}
      <div className="flex justify-between items-center mt-3 px-1 text-[11px] font-medium tracking-wide">
        <span className="text-slate-400 text-lg font-bold leading-none">−</span>
        <span className="font-bold uppercase tracking-wider text-[10px] transition-all duration-300 px-2.5 py-0.5 rounded-full"
          style={{
            color: currentLabel ? dimension.color : 'var(--text-muted)',
            backgroundColor: currentLabel ? `${dimension.color}12` : 'var(--bg-subtle)'
          }}>
          {currentLabel || 'Ilumina las gemas'}
        </span>
        <span className="text-slate-400 text-lg font-bold leading-none">+</span>
      </div>
    </div>
  )
}
