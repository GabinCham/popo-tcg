import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { LoginPage } from './pages/LoginPage'
import { BinderPage } from './pages/BinderPage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <div className="boot">
        <p>Chargement…</p>
      </div>
    )
  }

  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('preview')
  ) {
    return <BinderPage email="preview@local" userId="preview" />
  }

  if (!session) {
    return <LoginPage />
  }

  return <BinderPage email={session.user.email ?? ''} userId={session.user.id} />
}
