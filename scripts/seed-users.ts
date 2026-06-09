/**
 * MoodClass — scripts/seed-users.ts
 *
 * Crea todos los usuarios del curso en Supabase Auth usando la Admin API.
 * Requiere SUPABASE_SERVICE_ROLE_KEY (nunca la anon key).
 *
 * ─── USO ───────────────────────────────────────────────────────────────────
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-users.ts
 *
 * ─── QUÉ HACE ──────────────────────────────────────────────────────────────
 *   1. Crea cada usuario en auth.users con email_confirm:true y
 *      password_change_required:true (se pide cambio al primer login)
 *   2. Upsert del perfil en public.usuarios con nombre y rol correctos
 *   3. Si el usuario ya existe, obtiene su UUID y actualiza el perfil
 *   4. Imprime resumen y bloque listo para copiar en seed-data.ts
 * ───────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────
// ENV CHECK
// ──────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'REEMPLAZAR_CON_TU_SERVICE_ROLE_KEY') {
  console.error('\n❌ Variables de entorno faltantes o sin configurar:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ NO DEFINIDA')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY && SERVICE_ROLE_KEY !== 'REEMPLAZAR_CON_TU_SERVICE_ROLE_KEY' ? '✓' : '✗ NO DEFINIDA / SIN REEMPLAZAR')
  console.error('\n💡 Obtén la Service Role Key en:')
  console.error('   Supabase Dashboard → Project Settings → API → service_role (secret)')
  console.error('\n💡 Ejecución:')
  console.error('   npx dotenv -e .env.local -- npx tsx scripts/seed-users.ts\n')
  process.exit(1)
}

// ──────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = 'MoodClass2026'

type UserDef = {
  nombre: string
  email: string
  rol: 'docente' | 'estudiante'
}

const USUARIOS: UserDef[] = [
  // ── DOCENTE ───────────────────────────────────────────────────────────
  {
    nombre: 'Michelle Paz Villarroel Alarcon',
    email: 'michelle.villarroel02@inacapmail.cl',
    rol: 'docente',
  },
  // ── ESTUDIANTES ───────────────────────────────────────────────────────
  {
    nombre: 'Constanza Estrella Álvarez Rojas',
    email: 'constanza.alvarez37@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Jovan Aliro Jeremy Barra Villarroel',
    email: 'jovan.barra@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Manuel Felipe Berríos Álvarez',
    email: 'manuel.berrios09@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Johana Massiel Bravo Muñoz',
    email: 'johana.bravo03@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Justin Josue Carrasco Guajardo',
    email: 'justin.carrasco@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Gustavo Alejandro Cristi Luco',
    email: 'gustavo.cristi@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Matías Ignacio Gamboa Bravo',
    email: 'matias.gamboa05@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Ronald Franco Hudson González',
    email: 'ronald.hudson@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Pablo Fabián Ibacache',
    email: 'pablo.ibacache03@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Nora Del Pilar Jeldres Arévalo',
    email: 'nora.jeldres@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Julián Ignacio Lancellotti Muñoz',
    email: 'julian.lancellotti@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Tatiana Monserrat Matus Navarrete',
    email: 'tatiana.matus@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Jim Alonso Melo Vidal',
    email: 'jim.melo@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Isaac Esteban Navarro Gonzalez',
    email: 'isaac.navarro04@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Alexis Daniel Ojeda Molina',
    email: 'alexis.ojeda06@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Carolina Del Carmen Orellana Cayupi',
    email: 'carolina.orellana20@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Dannae Anaís Parra Álvarez',
    email: 'dannae.parra@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Valentina Antonia Salinas Parada',
    email: 'valentina.salinas14@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Alexandra Sihomara Sepúlveda Belmar',
    email: 'alexandra.sepulveda06@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Israel Jacob Tapia Díaz',
    email: 'israel.tapia05@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Hector Ubillus Rivadeneyra',
    email: 'hector.ubillus@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Williams Alfredo Vera Álvarez',
    email: 'williams.vera@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Nicole Andrea Villablanca Osses',
    email: 'nicole.villablanca03@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Nicolás Alfredo Viveros Reyes',
    email: 'nicolas.viveros04@inacapmail.cl',
    rol: 'estudiante',
  },
  {
    nombre: 'Giovanni Alexis Zapata Quezada',
    email: 'giovanni.zapata@inacapmail.cl',
    rol: 'estudiante',
  },
]

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────

type SB = ReturnType<typeof createClient>

async function createOrGetAuthUser(
  supabase: SB,
  user: UserDef
): Promise<{ id: string; created: boolean }> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,             // sin necesidad de verificar email
    user_metadata: {
      nombre: user.nombre,
      rol: user.rol,
      // Flag para prompt de cambio de contraseña al primer login
      password_change_required: true,
    },
  })

  if (!error && data.user) {
    return { id: data.user.id, created: true }
  }

  // Ya existe — buscar por email
  if (
    error?.message?.toLowerCase().includes('already') ||
    error?.message?.toLowerCase().includes('exists') ||
    error?.message?.toLowerCase().includes('registered')
  ) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) throw new Error(`Error listando usuarios: ${listErr.message}`)

    const existing = list.users.find((u) => u.email === user.email)
    if (!existing) throw new Error(`Usuario ${user.email} reportado como existente pero no encontrado en la lista`)

    return { id: existing.id, created: false }
  }

  throw new Error(`Error creando ${user.email}: ${error?.message ?? 'error desconocido'}`)
}

async function upsertPerfil(supabase: SB, id: string, user: UserDef): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .upsert(
      { id, email: user.email, nombre: user.nombre, rol: user.rol },
      { onConflict: 'id' }
    )

  if (error) throw new Error(`Error upserting perfil ${user.email}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('\n👤  MoodClass — Seed de Usuarios')
  console.log(`    URL: ${SUPABASE_URL}`)
  console.log(`    Contraseña temporal: ${DEFAULT_PASSWORD}`)
  console.log(`    Total a procesar: ${USUARIOS.length} usuarios`)
  console.log('─'.repeat(65))

  const resultados: Array<UserDef & { id: string; nuevo: boolean }> = []
  let creados = 0
  let existentes = 0
  let errores = 0

  for (const usuario of USUARIOS) {
    try {
      const { id, created } = await createOrGetAuthUser(supabase, usuario)
      await upsertPerfil(supabase, id, usuario)

      const icon = created ? '✅' : '⚠️ '
      const rolLabel = usuario.rol === 'docente' ? '[DOCENTE]' : '[ESTUDIANTE]'
      console.log(`  ${icon} ${rolLabel.padEnd(12)} ${usuario.nombre.padEnd(38)} ${id}`)

      if (created) creados++; else existentes++
      resultados.push({ ...usuario, id, nuevo: created })

      // Pequeña pausa para no saturar la API
      await new Promise((r) => setTimeout(r, 150))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ❌ ERROR ${usuario.email}: ${msg}`)
      errores++
    }
  }

  // ── RESUMEN ──────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65))
  console.log(`✨  Seed completado`)
  console.log(`    Creados:   ${creados}`)
  console.log(`    Previos:   ${existentes}`)
  console.log(`    Errores:   ${errores}`)

  // ── BLOQUE PARA seed-data.ts ─────────────────────────────────────────
  const docente = resultados.find((u) => u.rol === 'docente')
  const estudiantes = resultados.filter((u) => u.rol === 'estudiante')

  if (resultados.length > 0) {
    console.log('\n' + '─'.repeat(65))
    console.log('📋  Copia estos valores en scripts/seed-data.ts:\n')

    if (docente) {
      console.log(`const DOCENTE_ID = '${docente.id}'`)
      console.log(`// ${docente.nombre} — ${docente.email}\n`)
    }

    console.log('const ESTUDIANTES = [')
    for (const e of estudiantes) {
      console.log(`  { nombre: '${e.nombre}', email: '${e.email}', id: '${e.id}' },`)
    }
    console.log(']')
  }

  console.log('\n💡  Al primer login, el sistema mostrará un aviso para cambiar la contraseña.')
  console.log(`    Contraseña temporal: ${DEFAULT_PASSWORD}\n`)
}

main().catch((err) => {
  console.error('\n❌ Error fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
