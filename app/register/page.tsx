import { redirect } from 'next/navigation'

/**
 * /register está deshabilitado.
 * Los usuarios se crean vía script de seed con la Admin API.
 * Cualquier acceso a /register redirige a /login.
 */
export default function RegisterPage() {
  redirect('/login')
}
