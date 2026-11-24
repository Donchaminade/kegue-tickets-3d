// ?demo=1 : scripted walkthrough used for screen recordings.
import { BLOCK_BY_ID, blockCentre, type Block } from './stadium'
import { useApp } from './store'
import { camRef, selectBlock } from './cam'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const st = () => useApp.getState()

function cursorTo(x: number, y: number) {
  st().set({ cursor: { ...st().cursor, x, y, show: true } })
}
async function press() {
  st().set({ cursor: { ...st().cursor, down: true } })
  await sleep(140)
  st().set({ cursor: { ...st().cursor, down: false } })
}
function el(sel: string) {
  return document.querySelector<HTMLElement>(`[data-demo="${sel}"]`)
}
async function clickEl(sel: string, wait = 650) {
  const e = el(sel)
  if (!e) return
  const r = e.getBoundingClientRect()
  cursorTo(r.left + r.width / 2, r.top + r.height / 2)
  await sleep(wait)
  await press()
  e.click()
}
function blockScreen(b: Block) {
  const p = blockCentre(b)
  return camRef.project ? camRef.project(p.x, p.y + 1, p.z) : { x: 0, y: 0 }
}
async function hoverBlock(id: string, hold = 1150) {
  const b = BLOCK_BY_ID[id]
  const p = blockScreen(b)
  cursorTo(p.x, p.y)
  await sleep(600)
  st().set({ hover: { id, x: p.x, y: p.y } })
  await sleep(hold)
}

function freeNear(b: Block, r0: number, c0: number) {
  let best = { r: r0, c: c0 }
  let d = Infinity
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.cols - 1; c++) {
      if (b.sold[r * b.cols + c] || b.sold[r * b.cols + c + 1]) continue
      const s = Math.abs(r - r0) * 1.5 + Math.abs(c - c0)
      if (s < d) {
        d = s
        best = { r, c }
      }
    }
  return best
}

let running = false
export async function runDemo() {
  if (running) return
  running = true
  ;(window as unknown as { __demo: string }).__demo = 'running'
  const c = camRef.current
  await sleep(2600)
  st().set({ autoRotate: false })
  cursorTo(window.innerWidth * 0.62, window.innerHeight * 0.55)
  await sleep(500)

  // 1. aerial hover
  for (const id of ['D14', 'C13', 'A14', 'B23']) await hoverBlock(id)
  st().set({ hover: null })

  // 2. free rotation (drag)
  const sx = window.innerWidth * 0.35
  const sy = window.innerHeight * 0.6
  cursorTo(sx, sy)
  await sleep(500)
  st().set({ cursor: { ...st().cursor, down: true } })
  cursorTo(sx + window.innerWidth * 0.3, sy - 20)
  c?.rotate(Math.PI * 0.55, -0.12, true)
  await sleep(1500)
  st().set({ cursor: { ...st().cursor, down: false } })
  await sleep(400)
  st().set({ cursor: { ...st().cursor, down: true } })
  cursorTo(sx, sy)
  c?.rotate(-Math.PI * 0.55, 0.12, true)
  await sleep(1500)
  st().set({ cursor: { ...st().cursor, down: false } })

  // 3. VIP boxes
  await clickEl('btn-loges')
  await sleep(2600)
  await hoverBlock('L4', 1400)
  st().set({ hover: null })
  await clickEl('btn-aerial', 500)
  await sleep(2000)

  // 4. pick a block and fly in
  const target = BLOCK_BY_ID['A14']
  await hoverBlock(target.id, 900)
  await press()
  selectBlock(target)
  await sleep(1900)

  // 5. choose a seat
  const seat = freeNear(target, 5, 8)
  const cell = `seat-${seat.r}-${seat.c}`
  const e = el(cell)
  if (e) {
    const r = e.getBoundingClientRect()
    cursorTo(r.left + 40, r.top - 30)
    await sleep(500)
  }
  await clickEl(cell, 700)
  await sleep(900)

  // 6. view from the seat + look around
  await clickEl('btn-view')
  await sleep(2600)
  const cc = camRef.current
  cc?.rotate(0.45, 0, true)
  await sleep(1500)
  cc?.rotate(-0.9, 0.05, true)
  await sleep(1800)
  cc?.rotate(0.45, -0.05, true)
  await sleep(1300)

  // 7. checkout
  await clickEl('btn-book')
  await sleep(1300)
  await clickEl('qty-plus', 600)
  await sleep(900)
  await clickEl('btn-continue')
  await sleep(1100)
  await clickEl('op-tmoney', 600)
  await sleep(400)
  await clickEl('phone', 600)
  for (const d of '90123456') {
    st().set({ phone: st().phone + d })
    await sleep(110)
  }
  await sleep(500)
  await clickEl('btn-pay')
  await sleep(3400)

  // 8. ticket
  st().set({ cursor: { ...st().cursor, show: false } })
  await sleep(4200)
  await clickEl('btn-home')
  await sleep(3000)
  st().set({ cursor: { ...st().cursor, show: false } })
  ;(window as unknown as { __demo: string }).__demo = 'done'
  running = false
}
