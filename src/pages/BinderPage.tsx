import { useEffect, useMemo, useState } from 'react'
import catalog from '../data/catalog.json'
import { supabase } from '../lib/supabase'
import type { Catalog, SecCard } from '../types'

const data = catalog as Catalog

type BinderPageProps = {
  email: string
  userId: string
}

const ALL_SEC_KEY = 'popo_show_all_sec'

function isBaseSec(card: SecCard) {
  return !card.parallel && !card.id.includes('_')
}

export function BinderPage({ email, userId }: BinderPageProps) {
  const [selectedCode, setSelectedCode] = useState(data.boosters[0]?.code ?? '')
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<SecCard | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showAllSec, setShowAllSec] = useState(() => {
    try {
      return localStorage.getItem(ALL_SEC_KEY) === '1'
    } catch {
      return false
    }
  })

  const selected = data.boosters.find((b) => b.code === selectedCode) ?? data.boosters[0]

  const visibleCards = useMemo(
    () => (showAllSec ? data.cards : data.cards.filter(isBaseSec)),
    [showAllSec],
  )

  const cards = useMemo(
    () => visibleCards.filter((c) => c.boosterCode === selected?.code),
    [visibleCards, selected?.code],
  )

  const ownedByBooster = useMemo(() => {
    const map = new Map<string, { got: number; total: number }>()
    for (const card of visibleCards) {
      const current = map.get(card.boosterCode) ?? { got: 0, total: 0 }
      current.total += 1
      if (owned.has(card.id)) current.got += 1
      map.set(card.boosterCode, current)
    }
    return map
  }, [owned, visibleCards])

  const totalOwned = visibleCards.filter((card) => owned.has(card.id)).length
  const totalCards = visibleCards.length

  const storageKey = `popo_owned_sec:${userId}`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const localRaw = localStorage.getItem(storageKey)
      const localIds: string[] = localRaw ? JSON.parse(localRaw) : []

      const { data: rows, error } = await supabase
        .from('popo_owned_sec')
        .select('card_id')
        .eq('user_id', userId)
      if (cancelled) return
      if (error) {
        setOwned(new Set(localIds))
        setLoadError(
          'Collection enregistrée en local pour l’instant. Exécute supabase/migrations/0001_popo_owned_sec.sql dans l’éditeur SQL, puis recharge.',
        )
        return
      }
      const remote = new Set((rows ?? []).map((row) => row.card_id as string))
      for (const id of localIds) remote.add(id)
      const missing = localIds.filter((id) => !(rows ?? []).some((row) => row.card_id === id))
      if (missing.length) {
        await supabase.from('popo_owned_sec').insert(
          missing.map((card_id) => ({ user_id: userId, card_id })),
        )
      }
      setOwned(remote)
      localStorage.setItem(storageKey, JSON.stringify([...remote]))
    })()
    return () => {
      cancelled = true
    }
  }, [userId, storageKey])

  async function toggleOwned(card: SecCard) {
    const has = owned.has(card.id)
    setSaving(true)
    setLoadError(null)
    const next = new Set(owned)
    if (has) next.delete(card.id)
    else next.add(card.id)
    setOwned(next)
    localStorage.setItem(storageKey, JSON.stringify([...next]))

    try {
      if (has) {
        const { error } = await supabase
          .from('popo_owned_sec')
          .delete()
          .eq('user_id', userId)
          .eq('card_id', card.id)
        if (error && !error.message.includes('schema cache') && error.code !== 'PGRST205' && error.code !== '42P01') {
          throw error
        }
      } else {
        const { error } = await supabase.from('popo_owned_sec').insert({
          user_id: userId,
          card_id: card.id,
        })
        if (error && !error.message.includes('schema cache') && error.code !== 'PGRST205' && error.code !== '42P01') {
          throw error
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Impossible d’enregistrer.')
    } finally {
      setSaving(false)
    }
  }

  function toggleShowAllSec() {
    const next = !showAllSec
    setShowAllSec(next)
    localStorage.setItem(ALL_SEC_KEY, next ? '1' : '0')
    if (!next && active && !isBaseSec(active)) setActive(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PopoTCG</p>
          <h1>Cartes SEC</h1>
        </div>
        <div className="topbar-meta">
          <p className="score">
            {totalOwned}/{totalCards}
          </p>
          <p className="muted email">{email}</p>
          <button
            type="button"
            className={showAllSec ? 'ghost compact toggle-all on' : 'ghost compact toggle-all'}
            onClick={toggleShowAllSec}
          >
            Toutes les SEC
          </button>
          <button type="button" className="ghost compact" onClick={() => supabase.auth.signOut()}>
            Sortir
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="banner">
          {loadError}
          <button type="button" className="ghost compact" onClick={() => setLoadError(null)}>
            OK
          </button>
        </p>
      ) : null}

      <div className="layout">
        <aside className="booster-list">
          <h2>Boosters</h2>
          <ul>
            {data.boosters.map((booster) => {
              const stats = ownedByBooster.get(booster.code) ?? { got: 0, total: 0 }
              const activeBooster = booster.code === selected?.code
              const fill =
                stats.total > 0 && stats.got === stats.total
                  ? 'complete'
                  : stats.got >= 1
                    ? 'partial'
                    : ''
              return (
                <li key={booster.code}>
                  <button
                    type="button"
                    className={['booster-btn', activeBooster ? 'on' : '', fill].filter(Boolean).join(' ')}
                    onClick={(event) => {
                      setSelectedCode(booster.code)
                      event.currentTarget.scrollIntoView({
                        inline: 'center',
                        block: 'nearest',
                        behavior: 'smooth',
                      })
                    }}
                  >
                    <span className="code">{booster.code}</span>
                    <span className="booster-name">{booster.name.replace(/^Booster · |^Extra booster · |^Premium booster · /, '')}</span>
                    <span className={fill === 'complete' ? 'count done' : 'count'}>
                      {stats.got}/{stats.total}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="card-pane">
          <header className="pane-head">
            <div>
              <p className="eyebrow">{selected?.code}</p>
              <h2>{selected?.name}</h2>
            </div>
            <p className="muted">
              {(ownedByBooster.get(selected?.code ?? '')?.got ?? 0)} / {cards.length} SEC
            </p>
          </header>

          {cards.length === 0 ? (
            <p className="empty">Aucune SEC listée pour ce booster.</p>
          ) : (
            <ul className="card-grid">
              {cards.map((card) => {
                const has = owned.has(card.id)
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      className={has ? 'card-tile owned' : 'card-tile'}
                      onClick={() => setActive(card)}
                    >
                      <img src={card.imageUrl} alt={card.name} loading="lazy" referrerPolicy="no-referrer" />
                      <span className="card-meta">
                        <strong>{card.name}</strong>
                        <em>
                          {card.id}
                          {card.parallel ? ' · parallèle' : ''}
                        </em>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-title"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={active.imageUrl} alt={active.name} referrerPolicy="no-referrer" />
            <div className="modal-copy">
              <p className="eyebrow">{active.boosterCode}</p>
              <h3 id="card-title">{active.name}</h3>
              <p className="muted">
                {active.id}
                {active.parallel ? ' · parallèle' : ''}
              </p>
              <button type="button" disabled={saving} onClick={() => toggleOwned(active)}>
                {owned.has(active.id) ? 'Je ne l’ai plus' : 'Je l’ai'}
              </button>
              <button type="button" className="ghost" onClick={() => setActive(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
