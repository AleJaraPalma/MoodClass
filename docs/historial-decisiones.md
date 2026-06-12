# MoodClass — Historial de Decisiones

## Decisiones de Producto

### El registro público no existe
Los estudiantes y docentes NO se auto-registran. El admin (Alejandro) carga una sábana de datos (Excel/script) y el sistema crea las cuentas automáticamente. El estudiante solo inicia sesión. Razón: un estudiante sin sección asignada no tiene sentido en el sistema.

### Clases precargadas, no creadas
El docente NO crea clases — las clases se generan automáticamente para todo el semestre al cargar una sección. El docente solo las INICIA cuando llega el día. El sistema valida que la fecha programada coincida con la fecha actual (±30 minutos de tolerancia).

### Moods múltiples por clase
Una clase tiene: Mood de Entrada (automático al iniciar) → Moods Adicionales opcionales (para actividades específicas) → Ticket de Salida. Cada mood genera su propio QR. Se decidió NO tener más de estos tres momentos para no sobrecargar al estudiante.

### Tipos de actividad
Exactamente estos, con mayúscula inicial: Clase / Laboratorio / Evaluación Diagnóstica / Evaluación Sumativa / Otra Actividad. Para moods adicionales: Presentación / Trabajo grupal / Evaluación sumativa / Interrogación / Debate / Salida a terreno / Otra actividad.

### Sin nivel de dificultad
Se eliminó el campo de dificultad de las sesiones — no tenía sentido pedagógico en este contexto.

### Preguntas emocionales, no técnicas
Las preguntas del check-in son emocionales y en primera persona. Ejemplo: NO "¿Qué tan concentrado estás?" SINO "¿Qué tan presente y concentrado/a te sientes ahora mismo?" con extremos descriptivos (1=Mi mente está en otro lado, 5=Completamente presente).

### Campo abierto opcional
En check-in: "¿Hay algo que quieras que tu profe sepa antes de comenzar?" — el docente puede ver esto.
En ticket de salida: "¿Quieres contarnos algo sobre cómo viviste esta clase?" — más privado.
Ambos son OPCIONALES — si son obligatorios todos escriben "bien" y no sirven.

### Disclaimer de privacidad honesto
"Esto es un espacio seguro. Responde con honestidad — mientras más genuino seas, más útil será para ti. Tus respuestas alimentan tu LUMI, transforman tu hábitat y generan los reportes que te ayudan a crecer a ti y a quienes te rodean."
No se promete privacidad total porque el docente puede ver el campo abierto del check-in.

## Decisiones de Diseño

### Diseño claro, no oscuro
Se empezó con fondo oscuro (#1A1A2E) pero se migró a fondo claro (#F8F9FF) con gradientes azul-cyan. Más profesional, más cercano a SaaS educativo premium.

### Lucide React para iconos
Se eliminaron todos los emojis de la UI y se reemplazaron con iconos de Lucide React. Los emojis se veían infantiles e improfesionales.

### Gemas SVG orgánicas
Las gemas del check-in son cristales SVG de forma irregular orgánica (no diamantes perfectos). 5 gemas en fila, se iluminan de izquierda a derecha. Al nivel 5 pulsan suavemente con glow de color. Cada dimensión tiene color propio.

### Sin WhatsApp para el check-in en aula
El check-in se hace via QR + webapp (no WhatsApp) porque crea un ritual colectivo en el aula. WhatsApp es para el seguimiento posterior del bot compañero fuera de clase.

## Decisiones Técnicas

### Supabase sobre otras opciones
Se eligió Supabase por: PostgreSQL real, Auth integrado, RLS, tiempo real, API automática, plan gratuito suficiente para MVP. No requiere configurar servidores.

### Next.js App Router
Se usa App Router (no Pages Router) para aprovechar Server Components y mejor manejo de auth con cookies.

### Cookies sin dominio fijo
Las cookies de Supabase Auth se configuran sin parámetro `domain` y con `sameSite: 'lax'` para funcionar en cualquier dominio (localhost, vercel.app, moodclass.incubalab.cl).

### Callback de auth en /auth/callback
Existe una route handler en /app/auth/callback/route.ts que maneja el intercambio de código PKCE de Supabase y redirige a /dashboard.

### getOrCreatePerfil helper
Si un usuario existe en auth.users pero no en public.usuarios (puede pasar si fallan triggers), el sistema crea el perfil automáticamente en caliente para evitar bucles de redirección.

### Script de seed con service_role_key
Para cargar cursos y estudiantes masivamente se usa un script TypeScript que corre con `npx tsx` y usa la service_role_key de Supabase (que puede bypassear RLS y crear usuarios en auth.users). NUNCA exponer la service_role_key en el frontend.

### Recharts para gráficos
Se usa Recharts (ya incluido con shadcn) para los gráficos del dashboard de reportes. No se usa D3.js — innecesariamente complejo para este caso.

## Decisiones de Negocio

### Modelo de pricing
Por sede/institución (precio fijo mensual), NO por estudiante. Para una sede de 3.500 estudiantes: ~CLP 400.000-600.000/mes (~USD 430-650). Costo de infraestructura: ~USD 65/mes.

### Piloto en INACAP
Primer cliente objetivo: la sede donde trabaja Alejandro. Con ese caso de éxito documentado, expandir a otras sedes (INACAP tiene 26 en Chile).

### MoodClass genera datos e hipótesis, nunca veredictos
Principio rector del sistema. Protege a docentes de uso punitivo de los datos. La decisión siempre la toma una persona.

## Problemas Resueltos

### Bucle infinito de redirecciones en producción
Causa: si el perfil no existía en public.usuarios, /dashboard redirigía a /register, que redirigía a /login, bucle. Solución: helper getOrCreatePerfil que crea el perfil automáticamente si no existe.

### Auth session missing en dominio personalizado
Causa: cookies de sesión configuradas con dominio fijo de Vercel, no funcionaban en moodclass.incubalab.cl. Solución: eliminar parámetro `domain` de las cookies, usar sameSite: 'lax'.

### CNAME conflicto con registros existentes
El subdominio moodclass.incubalab.cl tenía registros A y TXT que conflictuaban con el CNAME de Vercel. Solución: eliminar esos registros y también eliminar el subdominio desde cPanel para que LiteSpeed dejara de interceptar.

### QR apuntaba a localhost en producción
El código que generaba los QR usaba window.location.origin que en el build de Vercel resolvía a localhost. Solución: usar process.env.NEXT_PUBLIC_SITE_URL como base de la URL del QR.

### Reporte de IA inmutable
El reporte de IA se genera UNA SOLA VEZ por mood, automáticamente al cerrar el mood. Queda guardado en la BD (columnas `reporte_ia` y `reporte_ia_generado_at` en la tabla `moods`) y nunca se regenera — el mood cerrado es inmutable y no recibirá más respuestas. No existen botones "Generar" ni "Regenerar". Al cerrar un mood en /live/[sesionId] aparece un botón "Ver reporte del mood" que navega a /dashboard/reportes con la cascada curso→clase→mood pre-seleccionada.

### Etiqueta del modelo de IA oculta
En la UI nunca se expone el nombre del modelo de IA (ej. claude-sonnet-4-5). El título es "Análisis de las respuestas".

### Visibilidad de campos abiertos
Las respuestas de texto libre de TODOS los moods (entrada, adicionales, salida) son visibles al docente directo. El estudiante está informado por el disclaimer al responder.

### Zona horaria
Todas las fechas relacionadas con sesiones, calendario y "hoy" se calculan en America/Santiago, no en UTC ni en la zona del navegador. Horas en formato 24h.