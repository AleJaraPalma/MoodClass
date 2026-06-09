import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'MoodClass – Inteligencia Socioemocional para el Aula',
  description:
    'Plataforma de check-in emocional en tiempo real para docentes y estudiantes. Mide energía, foco, ánimo, claridad, confianza, motivación y memoria.',
  keywords: ['educación', 'socioemocional', 'bienestar', 'aula', 'docentes', 'estudiantes'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="gradient-bg min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A2E',
              color: '#F0F0FF',
              border: '1px solid rgba(108,99,255,0.3)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#F0F0FF' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#F0F0FF' },
            },
          }}
        />
      </body>
    </html>
  )
}
