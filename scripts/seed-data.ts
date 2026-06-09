/**
 * MoodClass — Seed Data Script
 * 
 * Propósito: Carga datos de prueba para la sección "Formación Ciudadana"
 * 
 * USO (ejecutar con ts-node o tsx en el directorio raíz del proyecto):
 *   npx tsx scripts/seed-data.ts
 * 
 * PRECONDICIÓN: El docente y los estudiantes deben existir en auth.users y
 * en la tabla public.usuarios. Reemplaza los UUIDs de ejemplo con los reales.
 * 
 * IMPORTANTE: Este script usa la SERVICE ROLE KEY de Supabase para bypass RLS.
 * No exponer en producción.
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================
// CONFIGURACIÓN — Ajustar antes de ejecutar
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key (NO la anon key)

// UUID del docente (debe existir en auth.users y public.usuarios)
const DOCENTE_ID = '1c4d103d-e05e-4e7d-b573-6d899776be02'

// UUIDs de los estudiantes (deben existir en auth.users y public.usuarios con rol='estudiante')
// Formato: { nombre, email, id }
const ESTUDIANTES = [
  { nombre: 'Constanza Estrella Álvarez Rojas', email: 'constanza.alvarez37@inacapmail.cl', id: 'f8b1d7e3-bd01-4db0-8158-adb9c5251e61' },
  { nombre: 'Jovan Aliro Jeremy Barra Villarroel', email: 'jovan.barra@inacapmail.cl', id: 'd7f012ab-bf64-4fb6-95fa-f2d18b8b9c2a' },
  { nombre: 'Manuel Felipe Berríos Álvarez', email: 'manuel.berrios09@inacapmail.cl', id: '2207b200-85a9-4d02-85bd-8909f83d6f6b' },
  { nombre: 'Johana Massiel Bravo Muñoz', email: 'johana.bravo03@inacapmail.cl', id: 'fdf83699-d161-4172-bf4a-79b06c4a3db2' },
  { nombre: 'Justin Josue Carrasco Guajardo', email: 'justin.carrasco@inacapmail.cl', id: '5176769c-0a7c-464e-903f-d4242bb457f6' },
  { nombre: 'Gustavo Alejandro Cristi Luco', email: 'gustavo.cristi@inacapmail.cl', id: '45b4cb22-cbb2-4e7b-972d-7008fb153151' },
  { nombre: 'Matías Ignacio Gamboa Bravo', email: 'matias.gamboa05@inacapmail.cl', id: 'cf2ac41c-5822-4920-a815-e66d34c3c5f2' },
  { nombre: 'Ronald Franco Hudson González', email: 'ronald.hudson@inacapmail.cl', id: 'afdcdc09-20f9-473d-b4b0-f6d4afd477e5' },
  { nombre: 'Pablo Fabián Ibacache', email: 'pablo.ibacache03@inacapmail.cl', id: 'a30d0f55-8d78-4127-9cb5-abd4469a897e' },
  { nombre: 'Nora Del Pilar Jeldres Arévalo', email: 'nora.jeldres@inacapmail.cl', id: 'ba3b94dd-deeb-4496-8ec2-c2a3453a84b3' },
  { nombre: 'Julián Ignacio Lancellotti Muñoz', email: 'julian.lancellotti@inacapmail.cl', id: '5c569015-040c-4f94-97d7-539a3f030073' },
  { nombre: 'Tatiana Monserrat Matus Navarrete', email: 'tatiana.matus@inacapmail.cl', id: 'f82c31ac-4dae-4701-b445-22a93d8ba4aa' },
  { nombre: 'Jim Alonso Melo Vidal', email: 'jim.melo@inacapmail.cl', id: '7590b611-2008-4827-a496-2313994f02a6' },
  { nombre: 'Isaac Esteban Navarro Gonzalez', email: 'isaac.navarro04@inacapmail.cl', id: '8e6751ed-e405-461c-9a09-526c3c5c88b3' },
  { nombre: 'Alexis Daniel Ojeda Molina', email: 'alexis.ojeda06@inacapmail.cl', id: '6e78a4c6-11ce-4455-9949-234c421f758d' },
  { nombre: 'Carolina Del Carmen Orellana Cayupi', email: 'carolina.orellana20@inacapmail.cl', id: '624c6645-20dc-44c4-9267-62e01eb24aab' },
  { nombre: 'Dannae Anaís Parra Álvarez', email: 'dannae.parra@inacapmail.cl', id: 'b86af196-bdfb-4733-9a17-69fa393210a6' },
  { nombre: 'Valentina Antonia Salinas Parada', email: 'valentina.salinas14@inacapmail.cl', id: '23fad36a-e9ba-443c-904e-025307473208' },
  { nombre: 'Alexandra Sihomara Sepúlveda Belmar', email: 'alexandra.sepulveda06@inacapmail.cl', id: '4a399972-dfc2-4e92-bc71-68f89ee475f6' },
  { nombre: 'Israel Jacob Tapia Díaz', email: 'israel.tapia05@inacapmail.cl', id: 'e2b1d093-4557-42c3-abe5-8419221f393d' },
  { nombre: 'Hector Ubillus Rivadeneyra', email: 'hector.ubillus@inacapmail.cl', id: '8ec0d221-4890-4e43-9d69-7880b535fc08' },
  { nombre: 'Williams Alfredo Vera Álvarez', email: 'williams.vera@inacapmail.cl', id: 'b98a3255-a0a4-4456-93f4-0af466faf021' },
  { nombre: 'Nicole Andrea Villablanca Osses', email: 'nicole.villablanca03@inacapmail.cl', id: 'e9f4fcf2-f314-4ac7-8c7a-2a2b684ebc4a' },
  { nombre: 'Nicolás Alfredo Viveros Reyes', email: 'nicolas.viveros04@inacapmail.cl', id: 'f17ed9f4-1690-4c1d-a15c-a72b3c9b2ca1' },
  { nombre: 'Giovanni Alexis Zapata Quezada', email: 'giovanni.zapata@inacapmail.cl', id: 'b6e4bc80-ca77-4ac6-b182-7d0aca0b2c52' },
]

// ============================================================
// DATOS DE LA SECCIÓN
// ============================================================

const SECCION_DATA = {
  codigo_asignatura: 'FCIU101',
  nombre_asignatura: 'Formación Ciudadana',
  subseccion: 'A',
  sala: 'Sala 203 — Edificio B',
  dia_semana: 'miercoles' as const,
  hora_inicio: '10:30:00',
  hora_fin: '12:00:00',
  docente_id: DOCENTE_ID,
  fecha_inicio_semestre: '2025-03-10',
  fecha_fin_semestre: '2025-07-11',
}

const ASIGNATURA_DATA = {
  nombre: 'Formación Ciudadana',
  codigo: 'FCIU101',
  descripcion: 'Asignatura transversal de formación ciudadana y participación democrática',
  docente_id: DOCENTE_ID,
}

// ============================================================
// EJECUCIÓN
// ============================================================

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('🌱 Iniciando seed de MoodClass...\n')

  // 1. Crear asignatura
  console.log('📚 Creando asignatura...')
  const { data: asig, error: asigError } = await supabase
    .from('asignaturas')
    .upsert(ASIGNATURA_DATA, { onConflict: 'codigo' })
    .select()
    .single()

  if (asigError) throw new Error(`Error creando asignatura: ${asigError.message}`)
  console.log(`   ✅ Asignatura creada: ${asig.nombre} (${asig.codigo}) — ID: ${asig.id}`)

  // 2. Crear sección
  console.log('\n🏫 Creando sección...')
  const { data: seccion, error: seccionError } = await supabase
    .from('secciones')
    .insert({ ...SECCION_DATA })
    .select()
    .single()

  if (seccionError) throw new Error(`Error creando sección: ${seccionError.message}`)
  console.log(`   ✅ Sección creada: ${seccion.codigo_asignatura} ${seccion.subseccion} — ID: ${seccion.id}`)

  // 3. Generar sesiones programadas del semestre
  console.log('\n📅 Generando sesiones del semestre...')
  const { data: sesionesCount, error: genError } = await supabase
    .rpc('generate_sesiones_semestre', {
      p_seccion_id: seccion.id,
      p_asignatura_id: asig.id,
    })

  if (genError) throw new Error(`Error generando sesiones: ${genError.message}`)
  console.log(`   ✅ ${sesionesCount} sesiones programadas generadas`)

  // 4. Inscribir estudiantes
  console.log('\n👥 Inscribiendo estudiantes...')
  const inscripciones = ESTUDIANTES.map(e => ({
    estudiante_id: e.id,
    asignatura_id: asig.id,
  }))

  const { error: inscError } = await supabase
    .from('inscripciones')
    .upsert(inscripciones, { onConflict: 'estudiante_id,asignatura_id' })

  if (inscError) throw new Error(`Error inscribiendo estudiantes: ${inscError.message}`)
  console.log(`   ✅ ${ESTUDIANTES.length} estudiantes inscritos`)

  console.log('\n✨ Seed completado exitosamente!')
  console.log('\nResumen:')
  console.log(`  • Asignatura ID: ${asig.id}`)
  console.log(`  • Sección ID: ${seccion.id}`)
  console.log(`  • Sesiones generadas: ${sesionesCount}`)
  console.log(`  • Estudiantes inscritos: ${ESTUDIANTES.length}`)
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
