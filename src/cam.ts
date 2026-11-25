import type { CameraControls } from '@react-three/drei'
import { BLOCK_BY_ID, blockCentre, seatPose, type Block } from './stadium'
import { useApp } from './store'

type CC = CameraControls
export const camRef: { current: CC | null; project: ((x: number, y: number, z: number) => { x: number; y: number }) | null } = {
  current: null,
  project: null,
}

const portrait = () => window.innerWidth < window.innerHeight
const mobile = () => window.innerWidth < 768

function mode(seat: boolean) {
  const c = camRef.current
  if (!c) return
  c.minDistance = seat ? 0 : 8
  c.maxDistance = seat ? 1 : 420
  c.dollySpeed = seat ? 0 : 1
  c.truckSpeed = seat ? 0 : 1
  c.azimuthRotateSpeed = seat ? -0.35 : 1
  c.polarRotateSpeed = seat ? -0.35 : 1
  c.maxPolarAngle = seat ? Math.PI * 0.62 : Math.PI * 0.46
  c.minPolarAngle = seat ? Math.PI * 0.3 : 0.05
  c.smoothTime = 0.55
}

function aerialLook(smooth: boolean) {
  const c = camRef.current!
  const a = window.innerWidth / window.innerHeight
  if (a < 0.8) c.setLookAt(175, 345, 6, -6, 0, 0, smooth)
  else if (a < 1.25) c.setLookAt(0, 190, 215, 0, 0, 6, smooth)
  else c.setLookAt(0, 118, 158, 0, 0, 6, smooth)
}

export function flyAerial(instant = false) {
  const c = camRef.current
  if (!c) return
  mode(false)
  aerialLook(!instant)
}

export function flyIntro() {
  const c = camRef.current
  if (!c) return
  mode(false)
  c.setLookAt(-260, 260, 380, 0, 0, 0, false)
  c.smoothTime = 1.1
  requestAnimationFrame(() => {
    aerialLook(true)
    setTimeout(() => (c.smoothTime = 0.55), 2500)
  })
}

export function flyBlock(b: Block) {
  const c = camRef.current
  if (!c) return
  mode(false)
  c.smoothTime = 0.7
  const s = blockCentre(b)
  const back = b.tier === 'loge' ? 26 : 44
  const ex = s.x - s.nx * back
  const ez = s.z - s.nz * back
  const m = mobile()
  const ey = s.y + (b.tier === 'loge' ? 7 : 19) + (m ? 8 : 0)
  // On mobile the bottom sheet covers the lower half: aim lower so the block sits higher on screen.
  const ty = s.y - (m ? 7 : 1)
  c.setLookAt(ex, ey, ez, s.x + s.nx * 2, ty, s.z + s.nz * 2, true)
}

export function seatEye(b: Block, r: number, col: number) {
  const s = seatPose(b, r, col)
  const ex = s.x + s.nx * 0.35
  const ez = s.z + s.nz * 0.35
  const ey = s.y + 1.25
  const tx = s.x * 0.42
  const tz = s.z * 0.12
  const dx = tx - ex
  const dy = -6 - ey
  const dz = tz - ez
  const len = Math.hypot(dx, dy, dz)
  return { ex, ey, ez, dx: dx / len, dy: dy / len, dz: dz / len }
}

export function flySeat(b: Block, r: number, col: number) {
  const c = camRef.current
  if (!c) return
  const e = seatEye(b, r, col)
  mode(true)
  c.smoothTime = 0.75
  c.setLookAt(e.ex, e.ey, e.ez, e.ex + e.dx * 0.5, e.ey + e.dy * 0.5, e.ez + e.dz * 0.5, true)
}

export function flyLoges() {
  const c = camRef.current
  if (!c) return
  mode(false)
  c.smoothTime = 0.8
  const m = portrait()
  c.setLookAt(m ? 22 : 14, m ? 22 : 19, m ? -4 : -18, 0, m ? 5 : 8, -62, true)
}

export function selectBlock(b: Block) {
  useApp.getState().set({ blockId: b.id, seat: null, qty: 1, phase: 'block', hover: null, autoRotate: false })
  flyBlock(b)
}

// Small hook used by the automated screenshot scripts.
;(window as unknown as { __kg: unknown }).__kg = { BLOCK_BY_ID, camRef, flyAerial, flyBlock, flySeat, flyLoges, selectBlock, useApp }
