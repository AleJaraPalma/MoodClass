'use client'

import { Zap, Target, Heart, Brain, Shield, Sprout, Sparkles } from 'lucide-react'

interface DimensionIconProps {
  iconName: string
  className?: string
  size?: number
}

export default function DimensionIcon({ iconName, className, size = 20 }: DimensionIconProps) {
  const props = { className, size }
  switch (iconName) {
    case 'Zap':
    case '⚡':
      return <Zap {...props} />
    case 'Target':
    case '🎯':
      return <Target {...props} />
    case 'Heart':
    case '💙':
      return <Heart {...props} />
    case 'Brain':
    case '🧠':
      return <Brain {...props} />
    case 'Shield':
    case '🛡️':
      return <Shield {...props} />
    case 'Sprout':
    case '🌱':
      return <Sprout {...props} />
    case 'Sparkles':
    case '🔮':
      return <Sparkles {...props} />
    default:
      return null
  }
}
