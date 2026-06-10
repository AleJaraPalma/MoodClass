'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Settings, ChevronDown, UserCircle, LogOut } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface HeaderPerfilProps {
  nombre: string
}

export default function HeaderPerfil({ nombre }: HeaderPerfilProps) {
  const router = useRouter()
  const supabase = createClient()

  return (
    <div className="flex items-center gap-4">
      <button title="Notificaciones" className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors relative">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
      </button>
      <button title="Configuración" className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors">
        <Settings className="h-5 w-5" />
      </button>
      <div className="h-8 w-px bg-slate-100" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 text-sm font-semibold text-slate-700 outline-none">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm uppercase">
              {nombre.charAt(0)}
            </div>
            <span className="hidden sm:inline-block max-w-[150px] truncate">{nombre}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <UserCircle className="h-4 w-4 text-slate-400" /> Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
