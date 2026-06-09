# 🔮 MoodClass

**Plataforma de Inteligencia Socioemocional para el Aula**

MoodClass es un sistema de check-in emocional en tiempo real que permite a los docentes entender el estado socioemocional de sus estudiantes al inicio y al final de cada clase, usando 7 dimensiones medidas con una interfaz de gemas/diamantes interactiva.

---

## 🚀 Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Base de Datos + Auth**: Supabase
- **Estilos**: Tailwind CSS + CSS personalizado
- **Lenguaje**: TypeScript
- **QR**: `qrcode` npm package

---

## 📐 Arquitectura

```
app/
├── page.tsx                    # Landing page
├── login/page.tsx              # Login
├── register/page.tsx           # Registro (elige rol)
├── dashboard/
│   ├── page.tsx                # Router de rol
│   ├── docente/                # Dashboard docente
│   └── estudiante/             # Dashboard estudiante
├── asignatura/[id]/            # Detalle asignatura (docente)
├── checkin/[sesionId]/         # Pantalla check-in (mobile)
└── live/[sesionId]/            # Vista live (docente)

components/
├── Navbar.tsx                  # Navbar compartido
├── GemSelector.tsx             # Selector de gemas SVG
└── DimensionCard.tsx           # Card de dimensión

lib/
├── supabase/
│   ├── server.ts               # Cliente servidor
│   └── client.ts               # Cliente browser
├── types.ts                    # Tipos + config de 7 dimensiones
└── utils.ts                    # Utilidades

supabase/
└── schema.sql                  # Schema completo de la BD
```

---

## ⚡ Setup Rápido

### 1. Clonar e instalar

```bash
git clone <repo>
cd MoodClass
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. En el panel del proyecto, ve a **Settings → API**
4. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar variables de entorno

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Ejecutar el schema SQL

1. En Supabase, ve a **SQL Editor**
2. Pega el contenido de `supabase/schema.sql`
3. Haz clic en **Run**

### 5. Correr el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 🎓 Flujo de Uso

### Docente

1. Se registra eligiendo rol **Docente**
2. Crea una **asignatura** con nombre y código único
3. Crea una **sesión** (tipo de actividad + dificultad)
4. El sistema genera un **QR** automáticamente
5. Proyecta el QR en clase → `/live/[sesionId]` para ver en tiempo real
6. Cierra el check-in de entrada → activa ticket de salida
7. Cierra la sesión al finalizar

### Estudiante

1. Se registra eligiendo rol **Estudiante** (con carrera y sede)
2. Se une a asignaturas con el **código** del docente
3. Escanea el QR de la sesión → llega a `/checkin/[sesionId]`
4. Responde **7 dimensiones emocionales** con gemas interactivas
5. Ve resumen visual de su estado emocional
6. Al final de clase: completa el **ticket de salida** y ve comparación entrada vs salida

---

## 💎 Las 7 Dimensiones

| Dimensión | Color | Pregunta |
|-----------|-------|---------|
| ⚡ Energía | Ámbar | ¿Cómo sientes tu energía ahora? |
| 🎯 Foco | Azul eléctrico | ¿Qué tan presente te sientes? |
| 💙 Ánimo | Rosa/Magenta | ¿Cómo está tu estado emocional? |
| 🧠 Claridad | Verde esmeralda | ¿Qué tan clara sientes tu mente? |
| 🛡️ Confianza | Violeta | ¿Qué tan seguro/a te sientes? |
| 🌱 Motivación | Verde lima | ¿Qué tan motivado/a llegas? |
| 🔮 Memoria | Índigo | ¿Qué tan disponible tu memoria? |

---

## 🎨 Diseño

- **Fondo**: `#0D0D1A` (azul marino oscuro)
- **Superficie**: `#1A1A2E`
- **Acento principal**: `#6C63FF` (púrpura)
- **Fuentes**: Space Grotesk (títulos) + Inter (cuerpo)
- **Gemas SVG** con forma de diamante y efectos de glow animados
- Diseño **mobile-first** en pantallas de check-in
- **Glassmorphism** en cards y modales

---

## 📊 Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Registro con selección de rol |
| `/dashboard` | Router de rol → redirige |
| `/dashboard/docente` | Dashboard del docente |
| `/dashboard/estudiante` | Dashboard del estudiante |
| `/asignatura/[id]` | Detalle de asignatura |
| `/checkin/[sesionId]` | Check-in del estudiante (mobile) |
| `/live/[sesionId]` | Vista live del docente |

---

## 🔒 Seguridad

- Row Level Security (RLS) activada en todas las tablas
- Los docentes solo pueden ver/editar sus propias asignaturas y sesiones
- Los estudiantes solo pueden ver sus propios check-ins y asignaturas inscritas
- Middleware de Next.js protege todas las rutas autenticadas

---

## 📦 Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run start    # Servidor producción
```
