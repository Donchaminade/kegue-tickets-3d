import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import QRCode from 'qrcode'
import {
  ArrowLeft, Armchair, Check, ChevronRight, Crown, Download, Eye, Hand, Loader2, Minus, MousePointer2, Orbit, Plus, RotateCw, ShieldCheck, Smartphone, Sparkles, Users,
} from 'lucide-react'
import { BLOCKS, BLOCK_BY_ID, CATS, DEMO_SEAT, STADIUM, fcfa, freeCount, type Block, type Cat } from './stadium'
import { getBlock, liveTick, pickSeats, priceOf, useApp, type Op } from './store'
import { flyAerial, flyBlock, flyLoges, flySeat } from './cam'
import { runDemo } from './demo'

const Scene = lazy(() => import('./Scene'))

const useIsDesktop = () => {
  const [d, setD] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 900px)')
    const f = () => setD(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return d
}

const glass = 'bg-[#0b1020]/72 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]'

function TopBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),14px)] [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] sm:px-6">
      <div className="leading-tight">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.28em] text-white">
          Stade de Kégué <span className="text-[#ffb347]">3D</span>
        </div>
        <div className="mt-0.5 text-[10.5px] text-white/55">Concept indépendant, non officiel</div>
      </div>
      <div className="hidden text-right leading-tight sm:block">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">{STADIUM.city}</div>
        <div className="mt-0.5 text-[10.5px] text-white/55">{STADIUM.capacity} · Billetterie en ligne</div>
      </div>
    </div>
  )
}

function Tools() {
  const phase = useApp((s) => s.phase)
  const auto = useApp((s) => s.autoRotate)
  const set = useApp((s) => s.set)
  if (phase === 'checkout' || phase === 'ticket') return null
  const btn = 'flex h-10 items-center gap-2 rounded-xl px-3 text-[12.5px] font-semibold text-white/90 transition hover:bg-white/10 active:scale-95'
  return (
    <div className={`pointer-events-auto flex items-center gap-1 rounded-2xl p-1 ${glass}`}>
      <button
        data-demo="btn-aerial"
        className={btn}
        onClick={() => {
          set({ phase: 'aerial', blockId: null, seat: null, hover: null })
          flyAerial()
        }}
        title="Vue aérienne"
      >
        <Orbit className="h-4 w-4 text-[#ffce1f]" /> <span className="whitespace-nowrap">Vue aérienne</span>
      </button>
      <button
        data-demo="btn-loges"
        className={btn}
        onClick={() => {
          set({ phase: 'aerial', blockId: null, seat: null, hover: null, autoRotate: false })
          flyLoges()
        }}
        title="Loges VIP"
      >
        <Crown className="h-4 w-4 text-[#f5c542]" /> <span className="whitespace-nowrap">Loges VIP</span>
      </button>
      <button
        className={`${btn} ${auto ? 'bg-white/10' : ''}`}
        onClick={() => set({ autoRotate: !auto })}
        title="Rotation automatique"
        aria-label="Rotation automatique"
      >
        <RotateCw className={`h-4 w-4 ${auto ? 'animate-[spin_4s_linear_infinite] text-[#22c55e]' : ''}`} />
      </button>
    </div>
  )
}

function useCatStats() {
  useApp((s) => s.version)
  const m = {} as Record<Cat, number>
  for (const b of BLOCKS) m[b.cat] = (m[b.cat] ?? 0) + freeCount(b)
  return m
}

function Legend({ compact }: { compact?: boolean }) {
  const stats = useCatStats()
  const order: Cat[] = ['vip', 'honneur', 'laterale', 'virage']
  return (
    <div className={`pointer-events-auto rounded-2xl ${glass} ${compact ? 'p-2' : 'p-3'}`}>
      {!compact && (
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Catégories</div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ff6b6b]">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d4f] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff4d4f]" /></span>
            En direct
          </div>
        </div>
      )}
      <div className={compact ? 'grid grid-cols-4 gap-1' : 'space-y-1.5'}>
        {order.map((c) => (
          <div key={c} className={compact ? 'rounded-xl bg-white/[0.04] px-1.5 py-1.5 text-center' : 'flex items-center gap-2.5 rounded-xl px-1 py-0.5'}>
            {compact ? (
              <>
                <div className="flex items-center justify-center gap-1 text-[10.5px] font-semibold text-white/85">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATS[c].color }} /> {CATS[c].short}
                </div>
                <div className="text-[11px] font-extrabold text-white">{(CATS[c].price / 1000).toLocaleString('fr-FR')} k</div>
              </>
            ) : (
              <>
                <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10" style={{ background: CATS[c].color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-white">{CATS[c].label}</div>
                  <div className="text-[11px] text-white/50">{stats[c].toLocaleString('fr-FR')} places libres</div>
                </div>
                <div className="text-[12.5px] font-bold text-white">{fcfa(CATS[c].price)}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Tooltip() {
  const hover = useApp((s) => s.hover)
  useApp((s) => s.version)
  const b = getBlock(hover?.id ?? null)
  const viewers = useMemo(() => (b ? 4 + ((b.id.charCodeAt(1) * 7 + b.id.charCodeAt(2) * 3) % 23) : 0), [b])
  if (!hover || !b) return null
  const free = freeCount(b)
  const pct = Math.round((free / b.sold.length) * 100)
  const left = Math.min(window.innerWidth - 250, Math.max(10, hover.x + 18))
  const top = Math.min(window.innerHeight - 170, Math.max(70, hover.y - 20))
  return (
    <motion.div
      key={b.id}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`pointer-events-none fixed z-40 w-[236px] rounded-2xl p-3 ${glass}`}
      style={{ left, top }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATS[b.cat].color }} />
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">{CATS[b.cat].label}</div>
      </div>
      <div className="mt-1 text-[15px] font-extrabold text-white">{b.name}</div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-[10.5px] text-white/50">Prix</div>
          <div className="text-[15px] font-extrabold text-[#ffce1f]">{fcfa(priceOf(b))}</div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] text-white/50">Places restantes</div>
          <motion.div key={free} initial={{ scale: 1.25, color: '#ff8a8a' }} animate={{ scale: 1, color: '#ffffff' }} className="text-[15px] font-extrabold">
            {free}
          </motion.div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${100 - pct}%`, background: `linear-gradient(90deg, ${CATS[b.cat].color}, #ffce1f)` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/55">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {viewers} personnes regardent</span>
        <span className="flex items-center gap-1 text-white/75"><MousePointer2 className="h-3 w-3" /> Cliquer</span>
      </div>
    </motion.div>
  )
}

function LiveToast() {
  const last = useApp((s) => s.lastSale)
  const phase = useApp((s) => s.phase)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!last) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 2600)
    return () => clearTimeout(t)
  }, [last])
  const b = last ? BLOCK_BY_ID[last.id] : null
  const desktop = useIsDesktop()
  if (phase === 'checkout' || phase === 'ticket' || (!desktop && phase !== 'aerial')) return null
  return (
    <AnimatePresence>
      {show && b && (
        <motion.div
          key={last!.at}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`pointer-events-none flex max-w-full items-center gap-2 self-center truncate whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] text-white/85 sm:self-end ${glass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff4d4f]" />
          {last!.n} place{last!.n > 1 ? 's' : ''} vendue{last!.n > 1 ? 's' : ''} · {b.name}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- seat picker ----------
function SeatGrid({ b }: { b: Block }) {
  useApp((s) => s.version)
  const seat = useApp((s) => s.seat)
  const qty = useApp((s) => s.qty)
  const set = useApp((s) => s.set)
  const chosen = seat ? pickSeats(b, seat, qty) : []
  const isChosen = (r: number, c: number) => chosen.some((s) => s.r === r && s.c === c)
  const maxW = b.cols * (b.tier === 'loge' ? 34 : 22)
  return (
    <div>
      <div className="mx-auto" style={{ maxWidth: maxW }}>
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${b.cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: b.rows }).flatMap((_, ri) => {
            const r = b.rows - 1 - ri
            return Array.from({ length: b.cols }).map((__, c) => {
              const sold = b.sold[r * b.cols + c]
              const ch = isChosen(r, c)
              return (
                <button
                  key={`${r}-${c}`}
                  data-demo={`seat-${r}-${c}`}
                  disabled={!!sold}
                  aria-label={`Rang ${r + 1}, siège ${c + 1}${sold ? ', occupé' : ''}`}
                  onClick={() => set({ seat: { r, c } })}
                  className={`aspect-square rounded-[3px] transition ${sold ? 'cursor-not-allowed bg-white/[0.08]' : 'hover:scale-125 hover:ring-1 hover:ring-white'} ${ch ? 'scale-110 ring-2 ring-white' : ''}`}
                  style={sold ? undefined : { background: ch ? '#ffffff' : CATS[b.cat].color, opacity: ch ? 1 : 0.92 }}
                />
              )
            })
          })}
        </div>
        <div className="mt-2 rounded-md bg-gradient-to-r from-[#1d6b34]/0 via-[#1d6b34]/70 to-[#1d6b34]/0 py-1 text-center text-[9.5px] font-bold uppercase tracking-[0.3em] text-white/70">
          Terrain
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10.5px] text-white/55">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CATS[b.cat].color }} /> Libre</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-white/10" /> Vendu</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-white ring-1 ring-white" /> Votre choix</span>
      </div>
    </div>
  )
}

function bestSeat(b: Block) {
  // the showcase seat (same one as the auto demo) so every capture shows the same ticket
  if (b.id === DEMO_SEAT.block) return { r: DEMO_SEAT.r, c: DEMO_SEAT.c }
  let best: { r: number; c: number } | null = null
  let score = Infinity
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.cols; c++) {
      if (b.sold[r * b.cols + c]) continue
      const s = Math.abs(c - (b.cols - 1) / 2) * 1.2 + Math.abs(r - b.rows * 0.45)
      if (s < score) {
        score = s
        best = { r, c }
      }
    }
  return best
}

function PanelHeader({ b, onBack }: { b: Block; onBack: () => void }) {
  useApp((s) => s.version)
  const free = freeCount(b)
  return (
    <div className="flex items-start gap-3">
      <button onClick={onBack} aria-label="Retour" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/80 transition hover:bg-white/10">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/50">
          <span className="h-2 w-2 rounded-full" style={{ background: CATS[b.cat].color }} /> {CATS[b.cat].label}
        </div>
        <div className="truncate text-[17px] font-extrabold text-white">{b.name}</div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-extrabold text-[#ffce1f]">{fcfa(priceOf(b))}</div>
        <motion.div key={free} initial={{ color: '#ff8a8a' }} animate={{ color: 'rgba(255,255,255,0.55)' }} className="text-[11px]">
          {free} places restantes
        </motion.div>
      </div>
    </div>
  )
}

function BlockPanel({ b }: { b: Block }) {
  const seat = useApp((s) => s.seat)
  const set = useApp((s) => s.set)
  const back = () => {
    set({ phase: 'aerial', blockId: null, seat: null })
    flyAerial()
  }
  return (
    <div className="space-y-3">
      <PanelHeader b={b} onBack={back} />
      <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <SeatGrid b={b} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[12.5px]">
        {seat ? (
          <div className="text-white">
            <span className="text-white/50">Votre place :</span> <b>Rang {seat.r + 1}</b> · <b>Siège {seat.c + 1}</b>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-white/60">
            <Armchair className="h-4 w-4" /> Touchez un siège libre
          </div>
        )}
        <button
          data-demo="btn-best"
          onClick={() => {
            const s = bestSeat(b)
            if (s) set({ seat: s })
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#ffce1f] transition hover:bg-white/5"
        >
          <Sparkles className="h-3.5 w-3.5" /> Meilleure place
        </button>
      </div>
      <button
        data-demo="btn-view"
        disabled={!seat}
        onClick={() => {
          if (!seat) return
          set({ phase: 'seat' })
          flySeat(b, seat.r, seat.c)
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffce1f] to-[#f5a524] text-[14px] font-extrabold text-[#141006] shadow-[0_8px_30px_-8px_rgba(255,206,31,0.6)] transition enabled:hover:brightness-105 enabled:active:scale-[0.98] disabled:opacity-40"
      >
        <Eye className="h-4.5 w-4.5" /> Voir le terrain depuis ce siège
      </button>
    </div>
  )
}

function SeatPill({ b }: { b: Block }) {
  const live = useApp((s) => s.seat)
  const keep = useRef(live)
  if (live) keep.current = live
  const seat = keep.current
  const set = useApp((s) => s.set)
  if (!seat) return null
  return (
    <div className="flex items-center gap-4 pl-5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATS[b.cat].color, boxShadow: `0 0 12px ${CATS[b.cat].color}` }} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[14px] font-extrabold text-white">
          {b.name} · Rang {seat.r + 1} · Siège {seat.c + 1}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-white/55">
          <Hand className="h-3.5 w-3.5" /> Vue réelle depuis votre siège · glissez pour regarder autour
        </div>
      </div>
      <div className="text-[15px] font-extrabold text-white">{fcfa(priceOf(b))}</div>
      <button
        data-demo="btn-change"
        onClick={() => {
          set({ phase: 'block' })
          flyBlock(b)
        }}
        className="h-11 rounded-full bg-white/[0.08] px-4 text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
      >
        Changer
      </button>
      <button
        data-demo="btn-book"
        onClick={() => set({ phase: 'checkout', payStep: 'recap' })}
        className="h-11 rounded-full bg-[#ffc533] px-6 text-[13.5px] font-extrabold text-[#141006] shadow-[0_8px_30px_-8px_rgba(255,197,51,0.7)] transition hover:brightness-105 active:scale-[0.98]"
      >
        Réserver
      </button>
    </div>
  )
}

function SeatViewPanel({ b }: { b: Block }) {
  const live = useApp((s) => s.seat)
  const keep = useRef(live)
  if (live) keep.current = live
  const seat = keep.current
  const set = useApp((s) => s.set)
  if (!seat) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffce1f]/15 text-[#ffce1f]">
          <Eye className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Vue réelle depuis votre siège</div>
          <div className="truncate text-[15px] font-extrabold text-white">
            {b.name} · Rang {seat.r + 1} · Siège {seat.c + 1}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px] text-white/55">
        <Hand className="h-3.5 w-3.5" /> Glissez pour regarder autour de vous
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button
          data-demo="btn-change"
          onClick={() => {
            set({ phase: 'block' })
            flyBlock(b)
          }}
          className="h-12 rounded-2xl bg-white/[0.07] px-4 text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Changer
        </button>
        <button
          data-demo="btn-book"
          onClick={() => set({ phase: 'checkout', payStep: 'recap' })}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffce1f] to-[#f5a524] text-[14px] font-extrabold text-[#141006] shadow-[0_8px_30px_-8px_rgba(255,206,31,0.6)] transition hover:brightness-105 active:scale-[0.98]"
        >
          Réserver · {fcfa(priceOf(b))}
        </button>
      </div>
    </div>
  )
}

const OPS: Record<Op, { name: string; by: string; color: string; ring: string }> = {
  tmoney: { name: 'T-Money', by: 'Togocom', color: '#ffcf00', ring: 'ring-[#ffcf00]' },
  flooz: { name: 'Flooz', by: 'Moov Africa', color: '#2f7cf6', ring: 'ring-[#2f7cf6]' },
}

const fmtPhone = (d: string) => d.replace(/(\d{2})(?=\d)/g, '$1 ').trim()

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-white/55">{k}</span>
      <span className="text-right font-semibold text-white">{v}</span>
    </div>
  )
}

function Checkout({ b }: { b: Block }) {
  const { seat, qty, payStep, op, phone, set } = useApp()
  const seats = seat ? pickSeats(b, seat, qty) : []
  const maxQty = seat ? pickSeats(b, seat, b.tier === 'loge' ? 8 : 4).length : 1
  const total = priceOf(b) * seats.length
  const valid = phone.length === 8

  useEffect(() => {
    if (payStep !== 'wait') return
    const t = setTimeout(() => {
      const st = useApp.getState()
      const sel = st.seat ? pickSeats(b, st.seat, st.qty) : []
      sel.forEach((s) => (b.sold[s.r * b.cols + s.c] = 1))
      const id = 'KGE-' + Math.random().toString(36).slice(2, 8).toUpperCase()
      st.set({ ticket: { id, block: b.id, seats: sel, total: priceOf(b) * sel.length, op: st.op, phone: st.phone }, phase: 'ticket', payStep: 'done', version: st.version + 1 })
    }, 2800)
    return () => clearTimeout(t)
  }, [payStep, b])

  const head = (title: string, back?: () => void) => (
    <div className="flex items-center gap-3">
      {back ? (
        <button onClick={back} aria-label="Retour" className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : null}
      <div className="flex-1 text-[17px] font-extrabold text-white">{title}</div>
      <div className="flex gap-1">
        {['recap', 'pay', 'wait'].map((s, i) => (
          <span key={s} className={`h-1.5 rounded-full transition-all ${['recap', 'pay', 'wait'].indexOf(payStep) >= i ? 'w-5 bg-[#ffce1f]' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </div>
  )

  return (
    <AnimatePresence mode="wait">
      {payStep === 'recap' && (
        <motion.div key="recap" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
          {head('Récapitulatif', () => {
            set({ phase: 'seat' })
            if (seat) flySeat(b, seat.r, seat.c)
          })}
          <div className="rounded-2xl bg-white/[0.03] px-3.5 py-2 ring-1 ring-white/[0.06]">
            <Row k="Stade" v={STADIUM.name} />
            <Row k="Catégorie" v={<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CATS[b.cat].color }} />{CATS[b.cat].label}</span>} />
            <Row k="Bloc" v={b.name} />
            <Row k={seats.length > 1 ? 'Places' : 'Place'} v={`Rang ${seats[0]?.r + 1} · Siège${seats.length > 1 ? 's' : ''} ${seats.map((s) => s.c + 1).join(', ')}`} />
            <Row k="Accès" v={b.gate} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3.5 py-2.5 ring-1 ring-white/[0.06]">
            <div>
              <div className="text-[13px] font-semibold text-white">Nombre de billets</div>
              <div className="text-[11px] text-white/50">Places côte à côte</div>
            </div>
            <div className="flex items-center gap-2">
              <button data-demo="qty-minus" onClick={() => set({ qty: Math.max(1, qty - 1) })} className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.07] text-white hover:bg-white/10" aria-label="Moins">
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-6 text-center text-[16px] font-extrabold text-white">{seats.length}</div>
              <button data-demo="qty-plus" onClick={() => set({ qty: Math.min(maxQty, qty + 1) })} disabled={qty >= maxQty} className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.07] text-white hover:bg-white/10 disabled:opacity-30" aria-label="Plus">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between px-1">
            <span className="text-[13px] text-white/60">Total</span>
            <motion.span key={total} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-[22px] font-extrabold text-[#ffce1f]">{fcfa(total)}</motion.span>
          </div>
          <button data-demo="btn-continue" onClick={() => set({ payStep: 'pay' })} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffce1f] to-[#f5a524] text-[14px] font-extrabold text-[#141006] transition hover:brightness-105 active:scale-[0.98]">
            Continuer vers le paiement <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
      {payStep === 'pay' && (
        <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
          {head('Paiement Mobile Money', () => set({ payStep: 'recap' }))}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(OPS) as Op[]).map((k) => (
              <button
                key={k}
                data-demo={`op-${k}`}
                onClick={() => set({ op: k })}
                className={`relative rounded-2xl p-3 text-left ring-1 transition ${op === k ? `bg-white/[0.07] ring-2 ${OPS[k].ring}` : 'bg-white/[0.03] ring-white/10 hover:bg-white/[0.05]'}`}
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg text-[11px] font-black text-[#0b1020]" style={{ background: OPS[k].color }}>
                  {k === 'tmoney' ? 'T' : 'F'}
                </div>
                <div className="mt-2 text-[14px] font-extrabold text-white">{OPS[k].name}</div>
                <div className="text-[11px] text-white/50">{OPS[k].by}</div>
                {op === k && (
                  <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[#0b1020]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Numéro {OPS[op].name}</span>
            <div className="flex h-12 items-center gap-2 rounded-2xl bg-white/[0.05] px-3 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-[#ffce1f]">
              <Smartphone className="h-4 w-4 text-white/50" />
              <span className="text-[15px] font-semibold text-white/60">+228</span>
              <input
                data-demo="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="90 00 00 00"
                value={fmtPhone(phone)}
                onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold tracking-wide text-white outline-none placeholder:text-white/25"
              />
            </div>
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-[#22c55e]/10 px-3 py-2 text-[11.5px] text-[#9ff0bd]">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Démonstration : aucun paiement réel n'est effectué.
          </div>
          <button
            data-demo="btn-pay"
            disabled={!valid}
            onClick={() => set({ payStep: 'wait' })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffce1f] to-[#f5a524] text-[14px] font-extrabold text-[#141006] transition enabled:hover:brightness-105 enabled:active:scale-[0.98] disabled:opacity-40"
          >
            Payer {fcfa(total)}
          </button>
        </motion.div>
      )}
      {payStep === 'wait' && (
        <motion.div key="wait" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-2 text-center">
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: OPS[op].color }} />
            <span className="relative grid h-16 w-16 place-items-center rounded-full" style={{ background: OPS[op].color }}>
              <Smartphone className="h-7 w-7 text-[#0b1020]" />
            </span>
          </div>
          <div>
            <div className="text-[17px] font-extrabold text-white">Confirmez sur votre téléphone</div>
            <div className="mx-auto mt-1 max-w-[300px] text-[12.5px] text-white/60">
              Une demande de paiement {OPS[op].name} de <b className="text-white">{fcfa(total)}</b> a été envoyée au +228 {fmtPhone(phone)}. Validez avec votre code secret.
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-[12px] text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" /> En attente de confirmation…
          </div>
          <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.8, ease: 'linear' }} className="h-full bg-[#ffce1f]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function useQR(text: string) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: 360, color: { dark: '#0b1020', light: '#ffffff' } }).then(setUrl)
  }, [text])
  return url
}

function TicketView() {
  const live = useApp((s) => s.ticket)
  const keep = useRef(live)
  if (live) keep.current = live
  const t = keep.current
  const set = useApp((s) => s.set)
  const qr = useQR(t ? `KEGUE-DEMO|${t.id}|${t.block}|R${t.seats[0].r + 1}|S${t.seats.map((s) => s.c + 1).join('-')}` : 'KEGUE')
  if (!t) return null
  const b = BLOCK_BY_ID[t.block]
  const download = async () => {
    const cv = document.createElement('canvas')
    cv.width = 900
    cv.height = 1400
    const g = cv.getContext('2d')!
    g.fillStyle = '#0b1020'
    g.fillRect(0, 0, 900, 1400)
    const gr = g.createLinearGradient(0, 0, 900, 0)
    gr.addColorStop(0, '#006a4e')
    gr.addColorStop(0.5, '#ffce00')
    gr.addColorStop(1, '#d21034')
    g.fillStyle = gr
    g.fillRect(0, 0, 900, 16)
    g.fillStyle = '#fff'
    g.font = '800 54px system-ui, sans-serif'
    g.fillText(STADIUM.name, 60, 120)
    g.font = '500 30px system-ui, sans-serif'
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fillText(STADIUM.city, 60, 175)
    g.fillText('E-billet · Place réservée', 60, 220)
    const rows: [string, string][] = [
      ['Catégorie', CATS[b.cat].label],
      ['Bloc', b.name],
      ['Rang', String(t.seats[0].r + 1)],
      ['Siège(s)', t.seats.map((s) => s.c + 1).join(', ')],
      ['Accès', b.gate],
      ['Total payé', fcfa(t.total)],
    ]
    rows.forEach(([k, v], i) => {
      g.fillStyle = 'rgba(255,255,255,0.5)'
      g.font = '500 26px system-ui, sans-serif'
      g.fillText(k, 60, 310 + i * 70)
      g.fillStyle = '#fff'
      g.font = '700 32px system-ui, sans-serif'
      g.fillText(v, 330, 310 + i * 70)
    })
    const img = new Image()
    img.src = qr
    await img.decode()
    g.fillStyle = '#fff'
    g.fillRect(250, 780, 400, 400)
    g.drawImage(img, 260, 790, 380, 380)
    g.fillStyle = '#fff'
    g.font = '700 34px ui-monospace, monospace'
    g.textAlign = 'center'
    g.fillText(t.id, 450, 1240)
    g.font = '500 22px system-ui, sans-serif'
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.fillText('Billet de démonstration, sans valeur. Concept indépendant, non officiel.', 450, 1310)
    const a = document.createElement('a')
    a.href = cv.toDataURL('image/png')
    a.download = `e-billet-${t.id}.png`
    a.click()
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center gap-2.5">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }} className="grid h-9 w-9 place-items-center rounded-full bg-[#22c55e] text-[#04120a]">
          <Check className="h-5 w-5" strokeWidth={3} />
        </motion.span>
        <div>
          <div className="text-[16px] font-extrabold text-white">Paiement confirmé</div>
          <div className="text-[11.5px] text-white/55">Payé par {OPS[t.op].name} · +228 {fmtPhone(t.phone)}</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl bg-[#f8f6ef] text-[#0b1020] shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#006a4e] via-[#ffce00] to-[#d21034]" />
        <div className="flex items-start justify-between gap-2 px-4 pt-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b1020]/50">E-billet · Place réservée</div>
            <div className="mt-0.5 text-[18px] font-black">{STADIUM.name}</div>
            <div className="text-[12px] font-medium text-[#0b1020]/60">{STADIUM.city} · {CATS[b.cat].label}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 py-3 text-center">
          {[
            ['Bloc', b.id],
            ['Rang', String(t.seats[0].r + 1)],
            [t.seats.length > 1 ? 'Sièges' : 'Siège', t.seats.map((s) => s.c + 1).join('-')],
            ['Accès', b.gate.split(' · ')[0].replace('Porte ', 'P')],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-[#0b1020]/[0.05] py-1.5">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#0b1020]/45">{k}</div>
              <div className="text-[15px] font-black">{v}</div>
            </div>
          ))}
        </div>
        <div className="relative mx-4 border-t-2 border-dashed border-[#0b1020]/15" />
        <div className="flex items-center gap-3 p-4">
          {qr ? <img src={qr} alt="QR code du billet" className="h-[104px] w-[104px] rounded-lg" /> : <div className="h-[104px] w-[104px] rounded-lg bg-[#0b1020]/10" />}
          <div className="min-w-0 flex-1 text-[12px] leading-snug">
            <div className="font-mono text-[14px] font-bold">{t.id}</div>
            <div className="mt-0.5 text-[#0b1020]/60">{CATS[b.cat].label} · {t.seats.length} billet{t.seats.length > 1 ? 's' : ''}</div>
            <div className="font-bold">{fcfa(t.total)}</div>
            <div className="mt-1 text-[10.5px] text-[#0b1020]/45">Présentez ce QR code à l'entrée. Billet de démonstration, sans valeur.</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={download} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.07] text-[13px] font-semibold text-white ring-1 ring-white/10 hover:bg-white/10">
          <Download className="h-4 w-4" /> Télécharger
        </button>
        <button
          data-demo="btn-home"
          onClick={() => {
            set({ phase: 'aerial', blockId: null, seat: null, ticket: null, payStep: 'recap', qty: 1, autoRotate: true })
            flyAerial()
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffce1f] to-[#f5a524] text-[13px] font-extrabold text-[#141006] hover:brightness-105"
        >
          Retour au stade
        </button>
      </div>
    </motion.div>
  )
}

function Panel() {
  const phase = useApp((s) => s.phase)
  const blockId = useApp((s) => s.blockId)
  const desktop = useIsDesktop()
  const b = getBlock(blockId)
  const open = phase !== 'aerial' && !!b
  const content =
    !b ? null : phase === 'block' ? <BlockPanel b={b} /> : phase === 'seat' ? <SeatViewPanel b={b} /> : phase === 'checkout' ? <Checkout b={b} /> : phase === 'ticket' ? <TicketView /> : null
  const overlay = phase === 'checkout' || phase === 'ticket'
  return (
    <>
      <AnimatePresence>{overlay && <motion.div key="dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 bg-[#05070d]/45" />}</AnimatePresence>
      <AnimatePresence>
        {open && desktop && phase === 'seat' && b ? (
          <motion.div
            key="pill"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={`pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[min(820px,calc(100%-48px))] -translate-x-1/2 rounded-full p-2 ${glass}`}
          >
            <SeatPill b={b} />
          </motion.div>
        ) : null}
        {open && !(desktop && phase === 'seat') &&
          (desktop ? (
            <motion.aside
              key="side"
              initial={{ x: 440, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 440, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className={`pointer-events-auto absolute bottom-5 right-5 z-30 max-h-[calc(100dvh-110px)] w-[410px] overflow-y-auto overscroll-contain rounded-3xl p-4 ${glass}`}
            >
              {content}
            </motion.aside>
          ) : (
            <motion.section
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 34 }}
              className={`pointer-events-auto absolute inset-x-0 bottom-0 z-30 max-h-[78dvh] overflow-y-auto overscroll-contain rounded-t-[28px] px-4 pt-2 pb-[max(env(safe-area-inset-bottom),16px)] ${glass}`}
            >
              <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/20" />
              {content}
            </motion.section>
          ))}
      </AnimatePresence>
    </>
  )
}

function AerialHint() {
  const phase = useApp((s) => s.phase)
  const desktop = useIsDesktop()
  if (phase !== 'aerial') return null
  return (
    <div className="pointer-events-none flex items-center justify-center gap-2 text-[11.5px] font-medium text-white/70">
      <MousePointer2 className="h-3.5 w-3.5" />
      {desktop ? 'Survolez une tribune pour voir prix et places · Cliquez pour y entrer · Glissez pour tourner' : 'Touchez une tribune · Glissez pour tourner'}
    </div>
  )
}

function Cursor() {
  const c = useApp((s) => s.cursor)
  if (!c.show) return null
  return (
    <motion.div className="pointer-events-none fixed left-0 top-0 z-[60]" animate={{ x: c.x - 4, y: c.y - 2 }} transition={{ type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.55 }}>
      <motion.div animate={{ scale: c.down ? 0.82 : 1 }} transition={{ duration: 0.12 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]">
          <path d="M4 2.5 L4 19 L8.6 14.8 L11.6 21.5 L14.4 20.3 L11.5 13.8 L17.8 13.6 Z" fill="#fff" stroke="#0b1020" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </motion.div>
      {c.down && <motion.span initial={{ scale: 0.3, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.45 }} className="absolute -left-3 -top-3 h-8 w-8 rounded-full border-2 border-[#ffce1f]" />}
    </motion.div>
  )
}

function Loader() {
  const ready = useApp((s) => s.ready)
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div key="ld" exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 z-50 grid place-items-center bg-[#05070d]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#006a4e] via-[#ffce00] to-[#d21034]" animate={{ x: ['-100%', '300%'] }} transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }} />
            </div>
            <div className="text-[13px] font-semibold text-white/80">Construction du Stade de Kégué…</div>
            <div className="mt-1 text-[11px] text-white/40">Modèle 3D généré en code, aucun fichier lourd</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const phase = useApp((s) => s.phase)
  const ready = useApp((s) => s.ready)
  const demo = useApp((s) => s.demo)
  const desktop = useIsDesktop()

  useEffect(() => {
    const id = setInterval(() => liveTick(BLOCKS), demo ? 2200 : 1700)
    return () => clearInterval(id)
  }, [demo])
  useEffect(() => {
    if (ready && demo) runDemo()
  }, [ready, demo])
  useEffect(() => {
    const onResize = () => {
      const st = useApp.getState()
      if (st.phase === 'aerial') flyAerial(true)
      else if (st.phase === 'block' && st.blockId) flyBlock(BLOCK_BY_ID[st.blockId])
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#05070d] font-sans text-white select-none">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
      <TopBar />
      {/* floating controls */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),12px)+60px)] z-20 flex flex-col items-stretch gap-2 px-3 sm:top-[calc(max(env(safe-area-inset-top),12px)+64px)] sm:items-end sm:px-5">
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Tools />
          <LiveToast />
        </div>
      </div>
      {/* bottom area (aerial) */}
      {phase === 'aerial' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-5 sm:pb-5">
          {desktop ? (
            <div className="flex items-end justify-between gap-4">
              <div className="w-[330px]">
                <Legend />
              </div>
              <div className={`mb-1 rounded-full px-4 py-2 ${glass}`}>
                <AerialHint />
              </div>
              <div className="w-[330px]" />
            </div>
          ) : (
            <>
              <div className={`self-center rounded-full px-3 py-1.5 ${glass}`}>
                <AerialHint />
              </div>
              <Legend compact />
            </>
          )}
        </div>
      )}
      {phase === 'seat' && <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_120px_40px_rgba(0,0,0,0.55)]" />}
      <Tooltip />
      <Panel />
      <Cursor />
      <Loader />
    </div>
  )
}
