'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, BarChart, Users, Calendar, TrendingUp, HelpCircle } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const isInicio = pathname.startsWith('/dashboard/docente')
  const isReportes = pathname.startsWith('/dashboard/reportes')

  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 px-1 py-2 rounded-xl hover:bg-indigo-950/50 hover:text-indigo-400 transition-colors ${
      active ? 'text-white' : 'text-slate-400'
    }`

  const labelClass = 'text-[8px] font-bold uppercase leading-none text-center'

  return (
    <aside className="w-[84px] bg-[#1A1A2E] flex flex-col items-center py-6 justify-between shrink-0 sticky top-0 h-screen z-40">
      <div className="flex flex-col gap-6 items-center w-full">
        <div className="text-indigo-400 mb-2">
          <Sparkles className="h-6 w-6" />
        </div>
        <Link href="/dashboard/docente" title="Inicio" className={itemClass(isInicio)}>
          <BarChart className="h-5 w-5" />
          <span className={labelClass}>Inicio</span>
        </Link>
        <button title="Estudiantes" className={itemClass(false)}>
          <Users className="h-5 w-5" />
          <span className={labelClass}>Estudiantes</span>
        </button>
        <button title="Calendario" className={itemClass(false)}>
          <Calendar className="h-5 w-5" />
          <span className={labelClass}>Calendario</span>
        </button>
        <Link href="/dashboard/reportes" title="Reportes" className={itemClass(isReportes)}>
          <TrendingUp className="h-5 w-5" />
          <span className={labelClass}>Reportes</span>
        </Link>
      </div>
      <div className="flex flex-col gap-6 items-center w-full">
        <button title="Ayuda" className={itemClass(false)}>
          <HelpCircle className="h-5 w-5" />
          <span className={labelClass}>Ayuda</span>
        </button>
      </div>
    </aside>
  )
}
