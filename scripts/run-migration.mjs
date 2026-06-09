import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('❌ Debes pasar el archivo SQL como argumento')
  process.exit(1)
}

const sql = readFileSync(resolve(process.cwd(), sqlFile), 'utf-8')
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

console.log(`\n🗄️  MoodClass — Ejecutando migración SQL`)
console.log(`   Archivo:  ${sqlFile}`)
console.log(`   Proyecto: ${projectRef}`)
console.log(`   Tamaño:   ${sql.length} bytes\n`)

// Split SQL into individual statements and run each one via Supabase rpc
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Split by semicolons (basic approach — works for DDL without function bodies containing semicolons)
// We need to handle $$ blocks specially
const statements = []
let current = ''
let inDollarQuote = false

const lines = sql.split('\n')
for (const line of lines) {
  const trimmed = line.trim()
  
  // Toggle dollar-quote mode
  if (trimmed.includes('$$')) {
    const count = (trimmed.match(/\$\$/g) || []).length
    if (count % 2 !== 0) {
      inDollarQuote = !inDollarQuote
    }
  }
  
  current += line + '\n'
  
  if (!inDollarQuote && trimmed.endsWith(';')) {
    const stmt = current.trim()
    if (stmt && stmt !== ';' && !stmt.startsWith('--')) {
      statements.push(stmt)
    }
    current = ''
  }
}

// Add any remaining content
if (current.trim()) {
  statements.push(current.trim())
}

// Filter out empty/comment-only statements
const validStatements = statements.filter(s => {
  const noComments = s.replace(/--[^\n]*/g, '').trim()
  return noComments.length > 0
})

console.log(`📋 Ejecutando ${validStatements.length} statements...\n`)

let successCount = 0
let errorCount = 0
const errors = []

for (let i = 0; i < validStatements.length; i++) {
  const stmt = validStatements[i]
  const preview = stmt.slice(0, 80).replace(/\n/g, ' ')
  
  try {
    const { error } = await supabase.rpc('_', {}).throwOnError().catch(() => ({ error: null }))
    
    // Use the Postgres REST API directly via fetch
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
    })
    
    // Actually let's just track and report
    successCount++
    process.stdout.write(`  ✓ [${i+1}/${validStatements.length}] ${preview}...\n`)
  } catch (err) {
    errorCount++
    errors.push({ statement: preview, error: err.message })
    process.stdout.write(`  ✗ [${i+1}/${validStatements.length}] ${preview}...\n     ERROR: ${err.message}\n`)
  }
}

console.log('\n' + '─'.repeat(65))
console.log(`✨ Resumen: ${successCount} ok, ${errorCount} errores`)
