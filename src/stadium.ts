// Procedural layout of the Stade de Kégué concept: oval bowl (athletics track
// shape), two rings of stands all around, VIP boxes on the main side.
export const L = 42.2 // half length of the track straights
export const TRACK_IN = 36.4
export const TRACK_OUT = 46.4

export type Cat = 'vip' | 'honneur' | 'laterale' | 'virage'

export const CATS: Record<Cat, { label: string; short: string; price: number; color: string; seat: string }> = {
  vip: { label: 'Loges VIP', short: 'VIP', price: 50000, color: '#f5c542', seat: '#f5c542' },
  honneur: { label: "Tribune d'honneur", short: 'Honneur', price: 15000, color: '#e5484d', seat: '#e5484d' },
  laterale: { label: 'Tribunes latérales', short: 'Latérales', price: 5000, color: '#22c55e', seat: '#1fae55' },
  virage: { label: 'Virages populaires', short: 'Virages', price: 2000, color: '#3b82f6', seat: '#3a7be8' },
}

export const MATCH = {
  home: 'Togo',
  homeNick: 'Les Éperviers',
  away: 'Ghana',
  awayNick: 'Black Stars',
  comp: 'Match amical international',
  date: 'Samedi 27 mars 2027',
  dateShort: 'Sam. 27 mars',
  time: '17h00',
  venue: 'Stade de Kégué, Lomé',
}

// Tier definitions (distances measured outward from the track centre line shape)
export const LOWER = { d0: 49, depth: 0.85, rise: 0.45, y0: 1.0, rows: 12 }
export const UPPER = { d0: 65.2, depth: 0.9, rise: 0.55, y0: 10.9, rows: 10 }
export const LOGE = { d0: 60.4, d1: 65.0, y0: 6.5, y1: 10.6 }
export const FACADE_D = 75.4

export const rowD = (t: typeof LOWER, r: number) => t.d0 + r * t.depth
export const rowY = (t: typeof LOWER, r: number) => t.y0 + r * t.rise

/** Point on the stadium shape. t in [0,1): 0-.25 main straight (z<0),
 *  .25-.5 east curve, .5-.75 opposite straight, .75-1 west curve. */
export function shape(t: number, rad: number): { x: number; z: number; nx: number; nz: number } {
  t = ((t % 1) + 1) % 1
  const seg = Math.min(3, Math.floor(t * 4))
  const s = t * 4 - seg
  if (seg === 0) return { x: -L + 2 * L * s, z: -rad, nx: 0, nz: -1 }
  if (seg === 2) return { x: L - 2 * L * s, z: rad, nx: 0, nz: 1 }
  const a = seg === 1 ? -Math.PI / 2 + Math.PI * s : Math.PI / 2 + Math.PI * s
  const cx = seg === 1 ? L : -L
  return { x: cx + rad * Math.cos(a), z: rad * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) }
}

export interface Block {
  id: string
  name: string
  cat: Cat
  tier: 'bas' | 'haut' | 'loge'
  t0: number
  t1: number
  rows: number
  cols: number
  sold: Uint8Array // rows*cols, 1 = sold
  gate: string
}

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const rand = rng(20270327)

const OCC: Record<Cat, number> = { vip: 0.5, honneur: 0.55, laterale: 0.66, virage: 0.8 }

function makeBlock(id: string, name: string, cat: Cat, tier: Block['tier'], t0: number, t1: number, rows: number, cols: number, gate: string): Block {
  const sold = new Uint8Array(rows * cols)
  const occ = OCC[cat]
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      // fuller towards the middle of each block and lower rows near the pitch
      const centre = 1 - Math.abs((c + 0.5) / cols - 0.5) * 0.5
      sold[r * cols + c] = rand() < occ * centre * (cat === 'vip' ? 1 : 1.05 - r / rows / 6) ? 1 : 0
    }
  return { id, name, cat, tier, t0, t1, rows, cols, sold, gate }
}

function buildBlocks(): Block[] {
  const out: Block[] = []
  const tiers: { tier: 'bas' | 'haut'; rows: number }[] = [
    { tier: 'bas', rows: LOWER.rows },
    { tier: 'haut', rows: UPPER.rows },
  ]
  for (const { tier, rows } of tiers) {
    const T = tier === 'bas' ? '1' : '2'
    // main straight: 6 blocks
    const mainCats: Cat[] = tier === 'bas' ? ['laterale', 'laterale', 'honneur', 'honneur', 'laterale', 'laterale'] : ['laterale', 'honneur', 'honneur', 'honneur', 'honneur', 'laterale']
    for (let i = 0; i < 6; i++) {
      const cat = mainCats[i]
      const nm = cat === 'honneur' ? `Honneur ${T}${String.fromCharCode(65 + i)}` : `Latérale A${T}${i + 1}`
      out.push(makeBlock(`A${T}${i + 1}`, nm, cat, tier, (i / 6) * 0.25, ((i + 1) / 6) * 0.25, rows, 16, i < 3 ? 'Porte 2' : 'Porte 3'))
    }
    // east curve
    for (let i = 0; i < 5; i++)
      out.push(makeBlock(`B${T}${i + 1}`, `Virage Est B${T}${i + 1}`, 'virage', tier, 0.25 + (i / 5) * 0.25, 0.25 + ((i + 1) / 5) * 0.25, rows, tier === 'bas' ? 30 : 34, 'Porte 4'))
    // opposite straight
    for (let i = 0; i < 6; i++)
      out.push(makeBlock(`C${T}${i + 1}`, `Latérale C${T}${i + 1}`, 'laterale', tier, 0.5 + (i / 6) * 0.25, 0.5 + ((i + 1) / 6) * 0.25, rows, 16, i < 3 ? 'Porte 5' : 'Porte 6'))
    // west curve
    for (let i = 0; i < 5; i++)
      out.push(makeBlock(`D${T}${i + 1}`, `Virage Ouest D${T}${i + 1}`, 'virage', tier, 0.75 + (i / 5) * 0.25, 0.75 + ((i + 1) / 5) * 0.25, rows, tier === 'bas' ? 30 : 34, 'Porte 7'))
  }
  // VIP boxes on the main side between the two rings
  const N = 8
  const m = 0.02
  for (let i = 0; i < N; i++) {
    const t0 = m + (i / N) * (0.25 - 2 * m)
    const t1 = m + ((i + 1) / N) * (0.25 - 2 * m)
    out.push(makeBlock(`L${i + 1}`, `Loge VIP ${i + 1}`, 'vip', 'loge', t0, t1, 2, 4, 'Porte 1 · Entrée VIP'))
  }
  return out
}

export const BLOCKS = buildBlocks()
export const BLOCK_BY_ID = Object.fromEntries(BLOCKS.map((b) => [b.id, b])) as Record<string, Block>

export const freeCount = (b: Block) => {
  let n = 0
  for (let i = 0; i < b.sold.length; i++) if (!b.sold[i]) n++
  return n
}

export interface SeatPose {
  x: number
  y: number
  z: number
  nx: number
  nz: number
}

const LOGE_PAD = 0.12
/** World position of a seat (bottom of the seat) and outward normal. */
export function seatPose(b: Block, r: number, c: number): SeatPose {
  if (b.tier === 'loge') {
    const w = b.t1 - b.t0
    const t = b.t0 + w * LOGE_PAD + ((c + 0.5) / b.cols) * w * (1 - 2 * LOGE_PAD)
    const rad = LOGE.d0 + 1.3 + r * 1.3
    const p = shape(t, rad)
    return { x: p.x, y: LOGE.y0 + 0.25 + r * 0.45, z: p.z, nx: p.nx, nz: p.nz }
  }
  const tier = b.tier === 'bas' ? LOWER : UPPER
  const t = b.t0 + ((c + 0.5) / b.cols) * (b.t1 - b.t0)
  const p = shape(t, rowD(tier, r) + 0.42)
  return { x: p.x, y: rowY(tier, r), z: p.z, nx: p.nx, nz: p.nz }
}

export function blockCentre(b: Block): SeatPose {
  return seatPose(b, Math.floor(b.rows / 2), Math.floor(b.cols / 2))
}

export const fcfa = (n: number) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ') + ' FCFA'
