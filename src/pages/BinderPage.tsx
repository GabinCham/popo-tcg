import { useEffect, useMemo, useState } from 'react'
import catalog from '../data/catalog.json'
import { assetUrl } from '../lib/assets'
import { supabase } from '../lib/supabase'
import type { Catalog, SecCard } from '../types'

const data = catalog as Catalog

type BinderPageProps = {
  email: string
  userId: string
}

const ALL_SEC_KEY = 'popo_show_all_sec'

const BOOSTER_ART: Record<string, string> = {
  'OP-01': '/booster/OP01.webp',
  'OP-02': '/booster/OP02.webp',
  'OP-03': '/booster/OP03.webp',
  'OP-04': '/booster/OP04.webp',
  'OP-05': '/booster/OP05.webp',
  'OP-06': '/booster/OP06.webp',
  'OP-07': '/booster/OP07.webp',
  'OP-08': '/booster/OP08.webp',
  'OP-09': '/booster/OP09.webp',
  'OP-10': '/booster/OP10.webp',
  'OP-11': '/booster/OP11.webp',
  'OP-12': '/booster/OP12.webp',
  'OP-13': '/booster/OP13.webp',
  'OP14-EB04': '/booster/OP14.webp',
  'OP15-EB04': '/booster/OP15.webp',
  'OP-16': '/booster/OP16.webp',
  'OP-17': '/booster/OP17.webp',
  'OP-18': '/booster/OP18.webp',
  'EB-01': '/booster/EB01.webp',
  'EB-02': '/booster/EB02.webp',
  'EB-03': '/booster/EB03.webp',
  'EB-05': '/booster/EB05.webp',
  'PRB-01': '/booster/PRB01.webp',
  'PRB-02': '/booster/PRB02.webp',
}

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

  const boosters = data.boosters.map((booster) => ({
    booster,
    stats: ownedByBooster.get(booster.code) ?? { got: 0, total: 0 },
  }))

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
            {boosters.map(({ booster, stats }) => {
              const activeBooster = booster.code === selected?.code
              const boosterArt = BOOSTER_ART[booster.code]
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
                    className={[
                      'booster-btn',
                      boosterArt ? 'with-art' : '',
                      boosterArt && !['OP-07', 'OP-10', 'OP-11'].includes(booster.code) ? 'zoomed-art' : '',
                      activeBooster ? 'on' : '',
                      fill,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={(event) => {
                      setSelectedCode(booster.code)
                      event.currentTarget.scrollIntoView({
                        inline: 'center',
                        block: 'nearest',
                        behavior: 'smooth',
                      })
                    }}
                  >
                    {boosterArt ? <img className="booster-art" src={assetUrl(boosterArt)} alt="" aria-hidden="true" /> : null}
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
                      <img src={assetUrl(card.imageUrl)} alt={card.name} loading="lazy" referrerPolicy="no-referrer" />
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
            <img src={assetUrl(active.imageUrl)} alt={active.name} referrerPolicy="no-referrer" />
            <div className="modal-copy">
              <p className="eyebrow">{active.boosterCode}</p>
              <h3 id="card-title">{active.name}</h3>
              <p className="muted">
                {active.id}
                {active.parallel ? ' · parallèle' : ''}
              </p>
              <button
                type="button"
                className={owned.has(active.id) ? 'ownership-toggle is-owned' : 'ownership-toggle'}
                disabled={saving}
                aria-pressed={owned.has(active.id)}
                onClick={() => toggleOwned(active)}
              >
                <span className="ownership-copy">
                  <strong>{owned.has(active.id) ? 'Dans ma collection' : 'Ajouter à ma collection'}</strong>
                  <small>{owned.has(active.id) ? 'Carte obtenue' : 'Marquer comme obtenue'}</small>
                </span>
                <span className="ownership-switch" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path d="m3.2 8.2 3 3 6.6-6.6" />
                  </svg>
                </span>
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
