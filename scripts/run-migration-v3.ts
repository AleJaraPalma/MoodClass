/**
 * MoodClass – scripts/run-migration-v3.ts
 * Ejecuta migration-v3.sql dividido en statements, usando
 * supabase-js con service_role key para bypass RLS.
 *
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/run-migration-v3.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

// Supabase project reference (for direct DB API calls)
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

const sqlPath = resolve(process.cwd(), 'supabase/migration-v3.sql')
const sql = readFileSync(sqlPath, 'utf-8')

console.log(`\n🗄️  MoodClass — Migration v3`)
console.log(`   Proyecto: ${projectRef}`)
console.log(`   Archivo:  supabase/migration-v3.sql`)

// ── Parse SQL into individual statements ─────────────────────────────────
// Handles $$ dollar-quote blocks correctly
function splitStatements(sql: string): string[] {
  const result: string[] = []
  let current = ''
  let dollarDepth = 0

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const rest = sql.slice(i)

    // Detect $$ toggles
    if (rest.startsWith('$$')) {
      dollarDepth = dollarDepth === 0 ? 1 : 0
      current += '$$'
      i += 1  // skip next $
      continue
    }

    // Skip single-line comments (outside dollar quotes)
    if (dollarDepth === 0 && char === '-' && sql[i+1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      current += '\n'
      continue
    }

    current += char

    // Statement boundary: semicolon outside dollar quotes
    if (dollarDepth === 0 && char === ';') {
      const stmt = current.trim()
      if (stmt.length > 1) {
        result.push(stmt)
      }
      current = ''
    }
  }

  if (current.trim()) {
    result.push(current.trim())
  }

  return result.filter(s => s.replace(/[\s;]/g, '').length > 0)
}

const statements = splitStatements(sql)
console.log(`   Statements: ${statements.length}\n`)

// ── Execute each statement via Supabase Management API ─────────────────────
// We use the pg-meta endpoint which is available at api.supabase.com
async function executeStatement(stmt: string, idx: number): Promise<boolean> {
  const preview = stmt.replace(/\n/g, ' ').replace(/\s+/g, ' ').slice(0, 70)
  
  // Use the Supabase database REST endpoint via service key
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: stmt }),
    }
  )

  if (response.ok) {
    console.log(`  ✅ [${idx}] ${preview}`)
    return true
  } else {
    const err = await response.text()
    // If it's an "already exists" type error, treat as OK
    if (err.includes('already exists') || err.includes('duplicate')) {
      console.log(`  ⚠️  [${idx}] (ya existe) ${preview}`)
      return true
    }
    console.error(`  ❌ [${idx}] ${preview}`)
    console.error(`     Error: ${err.slice(0, 200)}`)
    return false
  }
}

// Execute all statements
async function main() {
  let success = 0
  let failed = 0

  for (let i = 0; i < statements.length; i++) {
    const ok = await executeStatement(statements[i], i + 1)
    if (ok) success++
    else failed++
  }

  console.log('\n' + '─'.repeat(65))
  console.log(`✨ Completado: ${success} OK, ${failed} con error`)

  if (failed > 0) {
    console.log('\n💡 Para los statements con error, ejecuta el SQL manualmente en:')
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\n❌ Error fatal:', err.message)
  process.exit(1)
})
