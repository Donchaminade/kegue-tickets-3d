import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, PerformanceMonitor, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  BLOCKS, CATS, FACADE_D, L, LOGE, LOWER, TRACK_IN, TRACK_OUT, UPPER, rowD, rowY, seatPose, shape, type Block,
} from './stadium'
import { useApp } from './store'
import { camRef, flyIntro, selectBlock } from './cam'

// ---------- geometry helpers ----------
function tSamples(t0 = 0, t1 = 1, curveN = 44, straightN = 8) {
  const out: number[] = []
  for (let seg = 0; seg < 4; seg++) {
    const n = seg % 2 === 0 ? straightN : curveN
    for (let i = 0; i < n; i++) out.push(seg * 0.25 + (i / n) * 0.25)
  }
  out.push(1)
  if (t0 === 0 && t1 === 1) return out
  const inner = out.filter((t) => t > t0 && t < t1)
  return [t0, ...inner, t1]
}

/** Sweep a 2D profile [(rad, y)...] along the stadium shape. Each profile
 * segment gets its own vertices so normals stay crisp at the steps. */
function sweep(profile: [number, number][], ts: number[], colors?: (THREE.Color | null)[]) {
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  let base = 0
  for (let k = 0; k < profile.length - 1; k++) {
    const [r0, y0] = profile[k]
    const [r1, y1] = profile[k + 1]
    const c = colors?.[k] ?? null
    for (const t of ts) {
      const a = shape(t, r0)
      const b = shape(t, r1)
      pos.push(a.x, y0, a.z, b.x, y1, b.z)
      if (c) col.push(c.r, c.g, c.b, c.r, c.g, c.b)
      else col.push(1, 1, 1, 1, 1, 1)
    }
    for (let i = 0; i < ts.length - 1; i++) {
      const a = base + i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
    base += ts.length * 2
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function stadiumShape(rad: number) {
  const s = new THREE.Shape()
  s.moveTo(-L, -rad)
  s.lineTo(L, -rad)
  s.absarc(L, 0, rad, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(-L, rad)
  s.absarc(-L, 0, rad, Math.PI / 2, (3 * Math.PI) / 2, false)
  return s
}

// ---------- bowl ----------
function Bowl() {
  const geo = useMemo(() => {
    const prof: [number, number][] = []
    const cols: (THREE.Color | null)[] = []
    const tread = new THREE.Color('#2c323e')
    const riser = new THREE.Color('#1a1f29')
    const wall = new THREE.Color('#232936')
    const push = (p: [number, number], c: THREE.Color | null) => {
      if (prof.length) cols.push(c)
      prof.push(p)
    }
    push([LOWER.d0 - 0.5, 0], null)
    push([LOWER.d0 - 0.5, LOWER.y0 + 0.7], wall)
    push([LOWER.d0 - 0.1, LOWER.y0 + 0.7], wall)
    push([LOWER.d0 - 0.1, LOWER.y0], wall)
    for (let r = 0; r < LOWER.rows; r++) {
      const d = rowD(LOWER, r)
      const y = rowY(LOWER, r)
      push([d, y], riser)
      push([d + LOWER.depth, y], tread)
      if (r < LOWER.rows - 1) push([d + LOWER.depth, y + LOWER.rise], riser)
    }
    const dEnd = rowD(LOWER, LOWER.rows)
    push([dEnd, LOGE.y0 - 0.1], riser)
    push([UPPER.d0 - 0.2, LOGE.y0 - 0.1], tread)
    push([UPPER.d0 - 0.2, UPPER.y0], wall)
    for (let r = 0; r < UPPER.rows; r++) {
      const d = rowD(UPPER, r)
      const y = rowY(UPPER, r)
      push([d, y], riser)
      push([d + UPPER.depth, y], tread)
      if (r < UPPER.rows - 1) push([d + UPPER.depth, y + UPPER.rise], riser)
    }
    const top = rowY(UPPER, UPPER.rows - 1)
    push([FACADE_D, top], tread)
    push([FACADE_D, top + 1.3], wall)
    push([FACADE_D + 0.5, top + 1.3], wall)
    push([FACADE_D + 0.5, 0], new THREE.Color('#1c2230'))
    return sweep(prof, tSamples())
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  )
}

// LED fascia bands in Togo colours (green / yellow / red)
function Fascias() {
  const geo = useMemo(() => {
    const ts = tSamples(0, 1, 120, 40)
    const green = new THREE.Color('#0f9d58').multiplyScalar(1.4)
    const yellow = new THREE.Color('#ffce1f').multiplyScalar(1.3)
    const red = new THREE.Color('#e5272d').multiplyScalar(1.3)
    const a = sweep([[UPPER.d0 - 0.25, LOGE.y0 + 1.2], [UPPER.d0 - 0.25, LOGE.y0 + 2.1]], ts)
    const b = sweep([[FACADE_D + 0.56, 15.4], [FACADE_D + 0.56, 16.6]], ts)
    const c = sweep([[LOWER.d0 - 0.55, 0.25], [LOWER.d0 - 0.55, 1.45]], ts)
    // colour by perimeter position: flag-like stripes
    for (const g of [a, b, c]) {
      const p = g.getAttribute('position')
      const col = g.getAttribute('color')
      for (let i = 0; i < p.count; i++) {
        const ang = Math.atan2(p.getZ(i), p.getX(i))
        const k = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 30) % 3
        const cc = g === c ? (k === 0 ? green : k === 1 ? yellow : green) : k === 0 ? green : k === 1 ? yellow : red
        col.setXYZ(i, cc.r, cc.g, cc.b)
      }
    }
    return mergeGeometries([a, b, c])
  }, [])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ---------- seats (single InstancedMesh) ----------
const seatGeo = (() => {
  const seat = new THREE.BoxGeometry(0.5, 0.3, 0.42)
  seat.translate(0, 0.27, -0.02)
  const back = new THREE.BoxGeometry(0.5, 0.5, 0.08)
  back.translate(0, 0.66, 0.2)
  return mergeGeometries([seat, back])
})()

export const seatIndex: { map: Map<string, number>; list: { b: Block; r: number; c: number }[] } = { map: new Map(), list: [] }
for (const b of BLOCKS)
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.cols; c++) {
      seatIndex.map.set(`${b.id}:${r}:${c}`, seatIndex.list.length)
      seatIndex.list.push({ b, r, c })
    }

const CROWD = ['#d9d4c7', '#2f3a4d', '#c99a4a', '#8b2f2f', '#244a3a', '#d7b125', '#1d6b3c', '#ffffff', '#4b5568', '#a63a2a']

function Seats() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const version = useApp((s) => s.version)
  const blockId = useApp((s) => s.blockId)
  const count = seatIndex.list.length
  useLayoutEffect(() => {
    const m = ref.current!
    const o = new THREE.Object3D()
    seatIndex.list.forEach(({ b, r, c }, i) => {
      const p = seatPose(b, r, c)
      o.position.set(p.x, p.y, p.z)
      o.lookAt(p.x - p.nx, p.y, p.z - p.nz)
      o.rotateY(Math.PI)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [])
  useEffect(() => {
    const m = ref.current!
    const col = new THREE.Color()
    seatIndex.list.forEach(({ b, r, c }, i) => {
      const sold = b.sold[r * b.cols + c]
      if (sold) {
        col.set(CROWD[(i * 7 + r * 3) % CROWD.length]).multiplyScalar(0.55)
      } else {
        col.set(CATS[b.cat].seat)
        if (blockId && blockId !== b.id) col.multiplyScalar(0.55)
      }
      m.setColorAt(i, col)
    })
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [version, blockId])
  return (
    <instancedMesh ref={ref} args={[seatGeo, undefined, count]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial roughness={0.6} metalness={0.05} />
    </instancedMesh>
  )
}

// ---------- block hit zones ----------
function zoneGeo(b: Block) {
  if (b.tier === 'loge') {
    const ts = tSamples(b.t0 + 0.001, b.t1 - 0.001, 300, 40)
    return sweep([[LOGE.d0 - 0.08, LOGE.y0 + 0.05], [LOGE.d0 - 0.08, LOGE.y1 - 0.05]], ts)
  }
  const T = b.tier === 'bas' ? LOWER : UPPER
  const ts = tSamples(b.t0 + 0.0008, b.t1 - 0.0008, 260, 40)
  return sweep([[rowD(T, 0) + 0.05, rowY(T, 0) + 0.8], [rowD(T, T.rows) - 0.05, rowY(T, T.rows - 1) + 1.0]], ts)
}

function Zone({ b }: { b: Block }) {
  const geo = useMemo(() => zoneGeo(b), [b])
  const hover = useApp((s) => s.hover?.id === b.id)
  const sel = useApp((s) => s.blockId === b.id)
  const phase = useApp((s) => s.phase)
  const set = useApp((s) => s.set)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const target = hover ? 0.42 : sel && phase === 'block' ? 0.22 : 0
  useFrame((_, dt) => {
    const m = mat.current
    if (!m) return
    const pulse = sel && phase === 'block' ? Math.sin(performance.now() / 260) * 0.06 : 0
    m.opacity += (target + pulse - m.opacity) * Math.min(1, dt * 10)
    m.visible = m.opacity > 0.01
  })
  const active = phase === 'aerial' || phase === 'block'
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!active || e.pointerType === 'touch' || useApp.getState().demo) return
    e.stopPropagation()
    set({ hover: { id: b.id, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } })
  }
  return (
    <mesh
      geometry={geo}
      onPointerMove={onMove}
      onPointerOut={() => {
        if (useApp.getState().hover?.id === b.id && !useApp.getState().demo) set({ hover: null })
      }}
      onClick={(e) => {
        if (!active || e.delta > 8 || useApp.getState().demo) return
        e.stopPropagation()
        selectBlock(b)
      }}
    >
      <meshBasicMaterial ref={mat} color={CATS[b.cat].color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}


function Zones() {
  return (
    <group>
      {BLOCKS.map((b) => (
        <Zone key={b.id} b={b} />
      ))}
    </group>
  )
}

// ---------- pitch / track ----------
function pitchTexture() {
  const W = 2048
  const H = 1400
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const sx = W / 116 // metres -> px (pitch 105x68 + run-off)
  const ox = W / 2
  const oy = H / 2
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#2f8a3c' : '#287a34'
    g.fillRect((i * W) / 16, 0, W / 16 + 1, H)
  }
  const grad = g.createRadialGradient(ox, oy, 100, ox, oy, W * 0.6)
  grad.addColorStop(0, 'rgba(255,255,255,0.06)')
  grad.addColorStop(1, 'rgba(0,0,0,0.25)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(255,255,255,0.92)'
  g.lineWidth = 0.14 * sx
  const X = (m: number) => ox + m * sx
  const Y = (m: number) => oy + m * sx
  const rect = (x0: number, y0: number, x1: number, y1: number) => g.strokeRect(X(x0), Y(y0), (x1 - x0) * sx, (y1 - y0) * sx)
  rect(-52.5, -34, 52.5, 34)
  g.beginPath()
  g.moveTo(X(0), Y(-34))
  g.lineTo(X(0), Y(34))
  g.stroke()
  g.beginPath()
  g.arc(X(0), Y(0), 9.15 * sx, 0, Math.PI * 2)
  g.stroke()
  for (const s of [-1, 1]) {
    const e = 52.5 * s
    rect(Math.min(e, e - 16.5 * s), -20.16, Math.max(e, e - 16.5 * s), 20.16)
    rect(Math.min(e, e - 5.5 * s), -9.16, Math.max(e, e - 5.5 * s), 9.16)
    g.beginPath()
    const ps = e - 11 * s
    g.arc(X(ps), Y(0), 0.25 * sx, 0, Math.PI * 2)
    g.fillStyle = '#fff'
    g.fill()
    g.beginPath()
    const a = Math.acos(5.5 / 9.15)
    if (s > 0) g.arc(X(ps), Y(0), 9.15 * sx, Math.PI - a, Math.PI + a)
    else g.arc(X(ps), Y(0), 9.15 * sx, -a, a)
    g.stroke()
    for (const cy of [-34, 34]) {
      g.beginPath()
      g.arc(X(e), Y(cy), 1 * sx, 0, Math.PI * 2)
      g.stroke()
    }
  }
  g.beginPath()
  g.arc(X(0), Y(0), 0.3 * sx, 0, Math.PI * 2)
  g.fill()
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function Ground() {
  const { tex, infield, track, apron, lanes } = useMemo(() => {
    const infield = new THREE.ShapeGeometry(stadiumShape(TRACK_IN), 48)
    const ts = stadiumShape(TRACK_OUT)
    ts.holes.push(stadiumShape(TRACK_IN) as unknown as THREE.Path)
    const track = new THREE.ShapeGeometry(ts, 48)
    const as = stadiumShape(LOWER.d0 - 0.4)
    as.holes.push(stadiumShape(TRACK_OUT) as unknown as THREE.Path)
    const apron = new THREE.ShapeGeometry(as, 48)
    const pts: number[] = []
    const T = tSamples(0, 1, 60, 2)
    for (let k = 0; k <= 8; k++) {
      const rad = TRACK_IN + 0.1 + k * 1.22
      for (let i = 0; i < T.length - 1; i++) {
        const a = shape(T[i], rad)
        const b = shape(T[i + 1], rad)
        pts.push(a.x, 0.04, a.z, b.x, 0.04, b.z)
      }
    }
    const lanes = new THREE.BufferGeometry()
    lanes.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return { tex: pitchTexture(), infield, track, apron, lanes }
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05}>
        <circleGeometry args={[900, 48]} />
        <meshStandardMaterial color="#0b0f17" roughness={1} />
      </mesh>
      <mesh geometry={apron} rotation-x={-Math.PI / 2} position-y={0.0}>
        <meshStandardMaterial color="#1e5a2c" roughness={1} />
      </mesh>
      <mesh geometry={infield} rotation-x={-Math.PI / 2} position-y={0.01}>
        <meshStandardMaterial color="#246f31" roughness={1} />
      </mesh>
      <mesh geometry={track} rotation-x={-Math.PI / 2} position-y={0.02}>
        <meshStandardMaterial color="#a8412e" roughness={0.95} />
      </mesh>
      <lineSegments geometry={lanes}>
        <lineBasicMaterial color="#f3e9e2" transparent opacity={0.55} />
      </lineSegments>
      <mesh rotation-x={-Math.PI / 2} position-y={0.035}>
        <planeGeometry args={[116, 75.5]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      <Goal x={-52.5} />
      <Goal x={52.5} />
    </group>
  )
}

function Goal({ x }: { x: number }) {
  const s = Math.sign(x)
  return (
    <group position={[x, 0, 0]}>
      {[-3.66, 3.66].map((z) => (
        <mesh key={z} position={[0, 1.22, z]}>
          <boxGeometry args={[0.12, 2.44, 0.12]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.44, 0]}>
        <boxGeometry args={[0.12, 0.12, 7.44]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[s * 1, 1.22, 0]}>
        <boxGeometry args={[2, 2.44, 7.32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ---------- players ----------
const FORMATION: [number, number][] = [
  [-49, 0], [-38, -20], [-40, -7], [-40, 7], [-38, 20], [-22, -24], [-24, -8], [-24, 8], [-22, 24], [-8, -6], [-6, 9],
]
function Players() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const ball = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => new THREE.CapsuleGeometry(0.38, 1.05, 3, 8), [])
  useLayoutEffect(() => {
    const m = ref.current!
    const c = new THREE.Color()
    for (let i = 0; i < 22; i++) {
      const home = i < 11
      c.set(i === 0 ? '#16a34a' : i === 11 ? '#f97316' : home ? '#ffd21f' : '#f4f4f5')
      m.setColorAt(i, c)
    }
    m.instanceColor!.needsUpdate = true
  }, [])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    const bx = Math.sin(t * 0.23) * 18
    const bz = Math.sin(t * 0.31 + 1) * 14
    for (let i = 0; i < 22; i++) {
      const home = i < 11
      const [fx, fz] = FORMATION[i % 11]
      const x = (home ? fx : -fx) * 0.92 + bx * (i % 11 === 0 ? 0.08 : 0.35) + Math.sin(t * 0.7 + i) * 1.5
      const z = (home ? fz : -fz) + bz * 0.3 + Math.cos(t * 0.6 + i * 1.7) * 1.4
      o.position.set(x, 0.9, z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    if (ball.current) ball.current.position.set(bx * 0.9, 0.25, bz * 0.6)
  })
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, undefined, 22]} raycast={() => null} frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <mesh ref={ball} raycast={() => null}>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

// ---------- VIP boxes ----------
function Loges() {
  const { shell, glass, glow, parapet, walls } = useMemo(() => {
    const t0 = 0.02
    const t1 = 0.23
    const ts = tSamples(t0, t1, 60, 30)
    const shell = sweep(
      [
        [LOGE.d0, LOGE.y0],
        [LOGE.d1, LOGE.y0],
        [LOGE.d1, LOGE.y1],
        [LOGE.d0 - 0.6, LOGE.y1 + 0.2],
        [LOGE.d0 - 0.6, LOGE.y1 + 0.55],
      ],
      ts,
    )
    const glass = sweep([[LOGE.d0, LOGE.y0 + 0.9], [LOGE.d0, LOGE.y1]], ts)
    const glow = sweep([[LOGE.d0 - 0.62, LOGE.y1 + 0.22], [LOGE.d0 - 0.62, LOGE.y1 + 0.5]], ts)
    const parapet = sweep([[LOGE.d0, LOGE.y0], [LOGE.d0, LOGE.y0 + 0.9]], ts)
    const parts: THREE.BufferGeometry[] = []
    const N = 9
    for (let i = 0; i < N; i++) {
      const t = t0 + (i / (N - 1)) * (t1 - t0)
      const a = shape(t, LOGE.d0)
      const b = shape(t, LOGE.d1)
      const len = Math.hypot(b.x - a.x, b.z - a.z)
      const w = new THREE.BoxGeometry(0.25, LOGE.y1 - LOGE.y0, len)
      w.translate((a.x + b.x) / 2, (LOGE.y0 + LOGE.y1) / 2, (a.z + b.z) / 2)
      parts.push(w)
    }
    return { shell, glass, glow, parapet, walls: mergeGeometries(parts) }
  }, [])
  return (
    <group>
      <mesh geometry={shell}>
        <meshStandardMaterial color="#3a2f22" emissive="#7a5418" emissiveIntensity={0.55} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={parapet}>
        <meshStandardMaterial color="#1b2130" roughness={0.6} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={walls}>
        <meshStandardMaterial color="#1b2130" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial color="#9fd0ff" transparent opacity={0.16} roughness={0.05} metalness={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={glow}>
        <meshBasicMaterial color="#ffcf4a" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---------- roof over the main stand ----------
function Roof() {
  const { roof, edge, cols } = useMemo(() => {
    const ts = tSamples(-0.012, 0.262, 40, 24)
    const roof = sweep([[56.5, 24.2], [66, 23.0], [78, 21.0]], ts)
    const edge = sweep([[56.6, 23.9], [57.6, 23.8]], ts)
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i <= 10; i++) {
      const t = -0.005 + (i / 10) * 0.26
      const p = shape(t, 77.2)
      const c = new THREE.CylinderGeometry(0.35, 0.45, 21, 8)
      c.translate(p.x, 10.5, p.z)
      parts.push(c)
      // diagonal truss
      const q = shape(t, 62)
      const len = Math.hypot(q.x - p.x, q.z - p.z, 23.5 - 16)
      const tr = new THREE.CylinderGeometry(0.18, 0.18, len, 6)
      const dir = new THREE.Vector3(q.x - p.x, 23.4 - 16, q.z - p.z).normalize()
      tr.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
      tr.translate((p.x + q.x) / 2, (16 + 23.4) / 2, (p.z + q.z) / 2)
      parts.push(tr)
    }
    return { roof, edge, cols: mergeGeometries(parts) }
  }, [])
  return (
    <group>
      <mesh geometry={roof}>
        <meshStandardMaterial color="#c9ced8" roughness={0.45} metalness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={edge}>
        <meshBasicMaterial color="#fff6dc" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={cols}>
        <meshStandardMaterial color="#8a93a3" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  )
}

// ---------- floodlights ----------
function Floodlights() {
  const masts = useMemo(() => [0.3125, 0.4375, 0.8125, 0.9375].map((t) => shape(t, 88)), [])
  return (
    <group>
      {masts.map((p, i) => {
        const yaw = Math.atan2(-p.x, -p.z)
        return (
          <group key={i} position={[p.x, 0, p.z]} rotation-y={yaw}>
            <mesh position-y={21}>
              <cylinderGeometry args={[0.5, 0.9, 42, 8]} />
              <meshStandardMaterial color="#5b6475" metalness={0.6} roughness={0.5} />
            </mesh>
            <group position={[0, 43, 0]} rotation-x={0.55}>
              <mesh>
                <boxGeometry args={[11, 5.5, 0.8]} />
                <meshStandardMaterial color="#20262f" />
              </mesh>
              <mesh position-z={0.42}>
                <planeGeometry args={[10.2, 4.8]} />
                <meshBasicMaterial color="#fffbea" toneMapped={false} />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}

// ---------- city around ----------
function City() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const trees = useRef<THREE.InstancedMesh>(null)
  const N = 160
  const NT = 220
  useLayoutEffect(() => {
    let s = 7
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2
      const d = 150 + r() * 230
      const h = 3 + r() * r() * 22
      o.position.set(Math.cos(a) * d * 1.25, h / 2, Math.sin(a) * d)
      o.scale.set(6 + r() * 14, h, 6 + r() * 12)
      o.rotation.y = r() * Math.PI
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
      c.setHSL(0.6, 0.12, 0.035 + r() * 0.04)
      ref.current!.setColorAt(i, c)
    }
    for (let i = 0; i < NT; i++) {
      const a = r() * Math.PI * 2
      const d = 98 + r() * 40
      const h = 4 + r() * 5
      o.position.set(Math.cos(a) * d * 1.2, h / 2, Math.sin(a) * d)
      o.scale.set(h * 0.6, h, h * 0.6)
      o.rotation.y = 0
      o.updateMatrix()
      trees.current!.setMatrixAt(i, o.matrix)
    }
  }, [])
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} raycast={() => null}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={trees} args={[undefined, undefined, NT]} raycast={() => null}>
        <coneGeometry args={[0.6, 1, 6]} />
        <meshStandardMaterial color="#12301f" roughness={1} />
      </instancedMesh>
    </group>
  )
}

// ---------- selected seat marker ----------
function SeatMarker() {
  const seat = useApp((s) => s.seat)
  const blockId = useApp((s) => s.blockId)
  const phase = useApp((s) => s.phase)
  const qty = useApp((s) => s.qty)
  const g = useRef<THREE.Group>(null)
  const b = BLOCKS.find((x) => x.id === blockId)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.position.y = Math.sin(t * 3) * 0.15
    g.current.children.forEach((c, i) => (c.rotation.y = t * 1.5 + i))
  })
  if (!b || !seat || phase === 'seat' || phase === 'checkout' || phase === 'ticket') return null
  const p = seatPose(b, seat.r, seat.c)
  void qty
  return (
    <group position={[p.x, p.y + 1.6, p.z]}>
      <group ref={g}>
        <mesh>
          <octahedronGeometry args={[0.45]} />
          <meshBasicMaterial color="#ffd21f" toneMapped={false} />
        </mesh>
        <mesh position-y={-1.0} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.45, 0.62, 24]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

// ---------- sky dome ----------
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 top = vec3(0.012,0.02,0.045); vec3 hor = vec3(0.07,0.10,0.18); vec3 glow = vec3(0.20,0.16,0.10); vec3 c = mix(hor, top, pow(h, 0.45)); c += glow * pow(1.0 - h, 10.0) * 0.6; gl_FragColor = vec4(c, 1.0); }',
      }),
    [],
  )
  return (
    <mesh material={mat} raycast={() => null} renderOrder={-1}>
      <sphereGeometry args={[1000, 32, 16]} />
    </mesh>
  )
}

// ---------- camera + loop ----------
function Rig() {
  const ref = useRef<CameraControls>(null)
  const { camera, size } = useThree()
  const auto = useApp((s) => s.autoRotate)
  const phase = useApp((s) => s.phase)
  useEffect(() => {
    camRef.current = ref.current
    const v = new THREE.Vector3()
    camRef.project = (x, y, z) => {
      v.set(x, y, z).project(camera)
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height }
    }
  }, [camera, size])
  useEffect(() => {
    flyIntro()
    const c = ref.current
    const stop = () => useApp.getState().set({ autoRotate: false })
    c?.addEventListener('controlstart', stop)
    return () => c?.removeEventListener('controlstart', stop)
  }, [])
  useFrame((_, dt) => {
    if (auto && phase === 'aerial' && ref.current) ref.current.azimuthAngle += dt * 0.06
  })
  return <CameraControls ref={ref} makeDefault smoothTime={0.55} draggingSmoothTime={0.12} />
}

function Ready() {
  const set = useApp((s) => s.set)
  useEffect(() => {
    const id = requestAnimationFrame(() => set({ ready: true }))
    return () => cancelAnimationFrame(id)
  }, [set])
  return null
}

export default function Scene() {
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, useApp.getState().demo ? 1 : 1.75))
  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: 42, near: 0.1, far: 2500, position: [-260, 260, 380] }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      onPointerMissed={() => useApp.getState().hover && !useApp.getState().demo && useApp.getState().set({ hover: null })}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(0.8, d - 0.35))} onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio || 1, 1.75, d + 0.25))} />
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#0b1222', 230, 700]} />
      <hemisphereLight args={['#a9c3ff', '#1a1208', 0.45]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-60, 120, 70]} intensity={1.15} color="#fff6e5" />
      <directionalLight position={[80, 90, -60]} intensity={0.55} color="#dfe8ff" />
      <Sky />
      <Stars radius={500} depth={60} count={1500} factor={6} fade speed={0.4} />
      <Ground />
      <Bowl />
      <Fascias />
      <Seats />
      <Loges />
      <Roof />
      <Floodlights />
      <Players />
      <City />
      <Zones />
      <SeatMarker />
      <Rig />
      <Ready />
    </Canvas>
  )
}
