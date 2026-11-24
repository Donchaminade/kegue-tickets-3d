import { create } from 'zustand'
import { BLOCK_BY_ID, CATS, rand, type Block } from './stadium'

export type Phase = 'aerial' | 'block' | 'seat' | 'checkout' | 'ticket'
export type Op = 'tmoney' | 'flooz'
export type PayStep = 'recap' | 'pay' | 'wait' | 'done'

export interface Ticket {
  id: string
  block: string
  seats: { r: number; c: number }[]
  total: number
  op: Op
  phone: string
}

interface S {
  phase: Phase
  hover: { id: string; x: number; y: number } | null
  blockId: string | null
  seat: { r: number; c: number } | null
  qty: number
  payStep: PayStep
  op: Op
  phone: string
  ticket: Ticket | null
  version: number
  autoRotate: boolean
  ready: boolean
  demo: boolean
  cursor: { x: number; y: number; down: boolean; show: boolean }
  lastSale: { id: string; n: number; at: number } | null
  set: (p: Partial<S>) => void
}

export const useApp = create<S>((set) => ({
  phase: 'aerial',
  hover: null,
  blockId: null,
  seat: null,
  qty: 1,
  payStep: 'recap',
  op: 'tmoney',
  phone: '',
  ticket: null,
  version: 0,
  autoRotate: true,
  ready: false,
  demo: typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo'),
  cursor: { x: -100, y: -100, down: false, show: false },
  lastSale: null,
  set: (p) => set(p),
}))

export const getBlock = (id: string | null): Block | null => (id ? BLOCK_BY_ID[id] ?? null : null)

/** Contiguous free seats in the same row starting from the selected seat. */
export function pickSeats(b: Block, seat: { r: number; c: number }, qty: number) {
  const out = [{ ...seat }]
  let lo = seat.c - 1
  let hi = seat.c + 1
  while (out.length < qty) {
    if (hi < b.cols && !b.sold[seat.r * b.cols + hi]) out.push({ r: seat.r, c: hi++ })
    else if (lo >= 0 && !b.sold[seat.r * b.cols + lo]) out.push({ r: seat.r, c: lo-- })
    else break
  }
  return out.sort((a, z) => a.c - z.c)
}

export const priceOf = (b: Block) => CATS[b.cat].price

/** Simulated live sales: other fans buying seats in random blocks. */
export function liveTick(blocks: Block[]) {
  const st = useApp.getState()
  const b = blocks[Math.floor(rand() * blocks.length)]
  const n = 1 + Math.floor(rand() * 3)
  let done = 0
  for (let k = 0; k < 40 && done < n; k++) {
    const i = Math.floor(rand() * b.sold.length)
    if (b.sold[i]) continue
    const r = Math.floor(i / b.cols)
    const c = i % b.cols
    if (st.blockId === b.id && st.seat && Math.abs(st.seat.r - r) <= 0 && Math.abs(st.seat.c - c) <= 4) continue
    b.sold[i] = 1
    done++
  }
  if (done) st.set({ version: st.version + 1, lastSale: { id: b.id, n: done, at: Date.now() } })
}
