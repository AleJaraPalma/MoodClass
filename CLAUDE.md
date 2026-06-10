# MoodClass — Contexto para Claude Code

## Qué es este proyecto
MoodClass es una plataforma de inteligencia socioemocional para el aula universitaria. Permite a docentes medir el estado emocional de sus estudiantes al inicio y final de cada clase mediante check-ins con gemas visuales. Lee /docs/concepto.md para el concepto completo.

## Stack
Next.js 14 App Router · Supabase (PostgreSQL + Auth) · Tailwind · TypeScript · shadcn/ui · Recharts · Vercel

## Producción
- URL: https://moodclass.incubalab.cl
- Repo: github.com/AleJaraPalma/MoodClass
- Deploy: automático al hacer push a main

## Base de datos (tablas clave)
- `usuarios` — id, email, nombre, rol (docente|estudiante)
- `secciones` — clases precargadas por semestre, con dia_semana, hora_inicio, hora_fin, docente_id
- `sesiones` — instancia de una clase, tiene estado_clase y mood_activo_id
- `moods` — check-ins dentro de una sesión (tipo: entrada|adicional|salida)
- `mood_checkins` — respuestas de cada estudiante: energia, foco, animo, claridad, confianza, motivacion, memoria, campo_abierto
- `inscripciones` — relación estudiante ↔ sección
- `asistencia` — presente/atraso por sesión

## Reglas importantes
1. Los estudiantes NO se auto-registran — el admin los carga via script seed
2. Los docentes NO crean clases — las clases se generan automáticamente al cargar una sección, el docente solo las inicia
3. Cookies de auth sin parámetro `domain`, con sameSite: 'lax' — funciona en cualquier dominio
4. El QR usa `process.env.NEXT_PUBLIC_SITE_URL` como base de URL
5. Existe helper `getOrCreatePerfil` en server.ts para evitar bucles de redirección

## Colores y diseño
- Fondo: #F8F9FF · Gradiente principal: #4F46E5 → #06B6D4 · Acento: #6366F1
- Gemas: Energía #F59E0B · Foco #3B82F6 · Ánimo #EC4899 · Claridad #10B981 · Confianza #8B5CF6 · Motivación #84CC16 · Memoria #6366F1
- Iconos: Lucide React (nunca emojis en la UI)

## Cómo trabajar
- Haz solo el cambio pedido — sin screenshots, sin verificaciones visuales innecesarias
- Después de cada cambio: `git add . && git commit -m "mensaje" && git push`
- Vercel despliega automáticamente en ~2 minutos

## Credenciales de prueba
- Docente: michelle.villarroel02@inacapmail.cl
- Estudiante: constanza.alvarez37@inacapmail.cl
- Password estudiantes sin cambiar: MoodClass2026

## Pendiente
- QR da 404 en celular (funciona en desktop)
- Nombres alumnos aparecen "Desconocido" en dashboard live (falta JOIN con tabla usuarios)
- LUMI visual SVG
- Hábitats SVG animados
- Bot WhatsApp
- Sistema de alertas completo
