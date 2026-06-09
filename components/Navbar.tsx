'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Usuario } from '@/lib/types'
import { Sparkles } from 'lucide-react'

interface NavbarProps {
  usuario: Usuario
}

export default function Navbar({ usuario }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="navbar py-3.5">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Sparkles className="h-5 w-5 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-xl font-extrabold tracking-tight text-white font-sora">
            Mood<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Class</span>
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-500/20"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-white/90 leading-none">{usuario.nombre}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 leading-none">
                {usuario.rol === 'docente' ? 'Docente' : 'Estudiante'}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all duration-200"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
