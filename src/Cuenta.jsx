import { useState } from 'react'
import { supabase } from './supabase'
import PasswordInput from './PasswordInput'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// Largo mínimo + al menos una letra y un número
function passwordIssue(p) {
  if (p.length < 8) return 'Mínimo 8 caracteres.'
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return 'Usa al menos una letra y un número.'
  return ''
}

export default function Cuenta({ user, onClose }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const edit = (setter) => (e) => {
    setter(e.target.value)
    setOk(false)
    setError('')
  }

  async function changePassword(e) {
    e.preventDefault()
    const issue = passwordIssue(nueva)
    if (issue) return setError(issue)
    if (nueva !== confirmar) return setError('Las contraseñas nuevas no coinciden.')
    if (nueva === actual) return setError('La nueva contraseña debe ser distinta a la actual.')

    setSaving(true)
    setError('')
    // Verifica la contraseña actual antes de cambiarla (evita cambios desde una sesión olvidada abierta)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: actual })
    if (authError) {
      setSaving(false)
      return setError('La contraseña actual no es correcta.')
    }
    const { error } = await supabase.auth.updateUser({ password: nueva })
    setSaving(false)
    if (error) return setError(error.message)
    setActual('')
    setNueva('')
    setConfirmar('')
    setOk(true)
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Mi cuenta</h1>
        <button className="ghost" onClick={onClose}>← Volver</button>
      </header>

      <div className="form">
        <section className="card">
          <h3>Datos del usuario</h3>
          <dl className="datos">
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Rol</dt>
            <dd><span className="badge">ADMIN</span></dd>
            <dt>Cuenta creada</dt>
            <dd>{fmtDate(user.created_at)}</dd>
            <dt>Último acceso</dt>
            <dd>{fmtDate(user.last_sign_in_at)}</dd>
            <dt>ID</dt>
            <dd><code className="small">{user.id}</code></dd>
          </dl>
        </section>

        <form className="card" onSubmit={changePassword}>
          <h3>Contraseña</h3>
          <p className="muted small">
            Por seguridad tu contraseña no se puede ver: Supabase solo guarda una versión cifrada. Si la olvidaste,
            cámbiala aquí (o desde Supabase → Authentication → Users si no puedes entrar).
          </p>
          <label>
            Contraseña actual
            <PasswordInput value={actual} onChange={edit(setActual)} autoComplete="current-password" required />
          </label>
          <label>
            Nueva contraseña
            <PasswordInput value={nueva} onChange={edit(setNueva)} autoComplete="new-password" required />
            {nueva && passwordIssue(nueva) && <span className="muted small">{passwordIssue(nueva)}</span>}
          </label>
          <label>
            Confirmar nueva contraseña
            <PasswordInput value={confirmar} onChange={edit(setConfirmar)} autoComplete="new-password" required />
            {confirmar && confirmar !== nueva && <span className="muted small">No coincide.</span>}
          </label>
          {error && <p className="error">{error}</p>}
          {ok && <p className="small">Contraseña actualizada ✓</p>}
          <div className="row">
            <button disabled={saving}>{saving ? 'Guardando…' : 'Cambiar contraseña'}</button>
          </div>
        </form>

        <section className="card">
          <h3>Sesión</h3>
          <div className="row">
            <button className="ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
            <button className="ghost danger" onClick={() => supabase.auth.signOut({ scope: 'global' })}>
              Cerrar sesión en todos los dispositivos
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
