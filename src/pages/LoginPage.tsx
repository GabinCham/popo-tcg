import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) {
          setMessage('Compte créé. Confirme l’e-mail si Supabase le demande, puis reconnecte-toi.')
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Connexion impossible.'
      setError(
        raw === 'Email not confirmed'
          ? 'E-mail non confirmé. Confirme le mail, ou désactive la confirmation e-mail dans Supabase.'
          : raw,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">Collection personnelle</p>
        <h1>PopoTCG</h1>
        <p className="lede">
          Tes cartes SEC One Piece, booster par booster. Un compte, une collection.
        </p>
        <form onSubmit={onSubmit}>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="form-ok">{message}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? 'Patiente…' : mode === 'login' ? 'Entrer' : 'Créer le compte'}
          </button>
        </form>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
            setMessage(null)
          }}
        >
          {mode === 'login' ? 'Pas encore de compte ? Crée-le' : 'Déjà un compte ? Connecte-toi'}
        </button>
      </div>
    </div>
  )
}
