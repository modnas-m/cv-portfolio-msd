<script setup>
// A pixel-art sky behind the cluster: a red sun (a moon in dark mode),
// drifting clouds, and rain, snow, fog or a storm, from real weather.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KINDS } from '../weather.js'

const props = defineProps({
  kind: { type: String, default: 'clear' },
  dark: { type: Boolean, default: false },
  safe: { type: Object, default: () => ({}) },
})

const P = 3                      // css px per sky pixel
const canvas = ref(null)
let ctx, w = 0, h = 0, raf = 0, last = 0, t = 0
let clouds = [], drops = [], flakes = [], stars = [], bolt = null, nextBolt = 4
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const rnd = (a, b) => a + Math.random() * (b - a)

const spec = () => KINDS[props.kind] || KINDS.clear
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// where the sun sits: top right of the free area, below the text on phones
function sunAt() {
  const wide = window.innerWidth >= 900
  const x = w - ((props.safe.right || 0) + (wide ? 90 : 56)) / P
  const y = wide ? 128 / P : ((props.safe.top || 0) + 36) / P
  return { x: Math.round(x), y: Math.round(y) }
}

// the sky only fills the free area, so it never runs over the text
function area() {
  return { x0: Math.floor((props.safe.left || 0) / P), x1: Math.ceil(w - (props.safe.right || 0) / P) }
}

function cloud(x) {
  const cw = Math.round(rnd(14, 28)), ch = Math.round(cw * 0.38)
  const sun = sunAt()
  return {
    x, y: Math.round(rnd(sun.y - 8, sun.y + 26)), w: cw, speed: rnd(1.2, 3.5),
    rects: [
      [0, Math.round(ch * 0.45), cw, Math.round(ch * 0.55)],
      [Math.round(cw * 0.12), Math.round(ch * 0.18), Math.round(cw * 0.5), Math.round(ch * 0.5)],
      [Math.round(cw * 0.45), 0, Math.round(cw * 0.34), Math.round(ch * 0.6)],
    ],
  }
}

function seedSky() {
  const s = spec()
  const { x0, x1 } = area(), span = x1 - x0
  clouds = Array.from({ length: s.clouds }, (_, i) => cloud(x0 + (i / Math.max(1, s.clouds)) * span * 0.9 + rnd(0, span * 0.15)))
  const top = sunAt().y
  drops = Array.from({ length: Math.round(s.rain * span * 0.7) }, () => ({ x: rnd(x0, x1), y: rnd(top, h), v: rnd(110, 170) }))
  flakes = Array.from({ length: Math.round(s.snow * span * 0.35) }, () => ({ x: rnd(x0, x1), y: rnd(top, h), v: rnd(10, 22), p: rnd(0, 6), big: Math.random() < 0.25 }))
  const sun = sunAt()
  stars = Array.from({ length: 7 }, () => ({ x: Math.round(sun.x + rnd(-60, 30)), y: Math.round(sun.y + rnd(-25, 30)), p: rnd(0, 6) }))
  bolt = null
}

function disc(cx, cy, r, color, cut) {
  ctx.fillStyle = color
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.8) continue
      if (cut && (dx - cut.dx) ** 2 + (dy - cut.dy) ** 2 <= cut.r * cut.r + cut.r * 0.8) continue
      ctx.fillRect(cx + dx, cy + dy, 1, 1)
    }
}

function drawSun(c) {
  const { x, y } = sunAt()
  if (props.dark) {
    for (const s of stars) {
      if (still || Math.sin(t * 1.7 + s.p) > -0.3) { ctx.fillStyle = c.ink; ctx.fillRect(s.x, s.y, 1, 1) }
    }
    disc(x, y, 7, c.ink, { dx: 3, dy: -2, r: 6 })
    return
  }
  disc(x, y, 7, c.signal)
  // rays blink between straight and diagonal, like an old game
  const diagonal = !still && Math.floor(t / 0.6) % 2 === 1
  ctx.fillStyle = c.signal
  for (let k = 0; k < 8; k++) {
    if ((k % 2 === 1) !== diagonal) continue
    const a = (k / 8) * Math.PI * 2
    for (let r = 10; r <= 12; r++) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1)
  }
}

function drawClouds(c, wet) {
  const fill = props.dark ? (wet ? '#1a1a1a' : c.cloud) : (wet ? '#d9d9d9' : c.cloud)
  const line = props.dark ? '#6a6a6a' : c.ink
  for (const cl of clouds) {
    const x = Math.round(cl.x)
    ctx.fillStyle = line
    for (const [rx, ry, rw, rh] of cl.rects) ctx.fillRect(x + rx - 1, cl.y + ry - 1, rw + 2, rh + 2)
    ctx.fillStyle = fill
    for (const [rx, ry, rw, rh] of cl.rects) ctx.fillRect(x + rx, cl.y + ry, rw, rh)
  }
}

function drawFog(c) {
  ctx.fillStyle = props.dark ? '#3a3a3a' : '#cfcfcf'
  const shift = Math.floor(t * 4)
  for (const fy of [0.38, 0.52, 0.66]) {
    const y0 = Math.round(h * fy)
    for (let y = y0; y < y0 + 5; y++)
      for (let x = (y + shift) % 2; x < w; x += 2) ctx.fillRect(x, y, 1, 1)
  }
}

function frame(dt) {
  const s = spec()
  const c = { ink: css('--ink'), signal: css('--signal'), cloud: css('--cloud'), rain: css('--rain') }
  ctx.clearRect(0, 0, w, h)
  const { x0, x1 } = area()
  ctx.save()
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, h); ctx.clip()
  if (!s.hideSun) drawSun(c)

  for (const cl of clouds) { cl.x += cl.speed * dt; if (cl.x > x1 + 2) cl.x = x0 - cl.w - 2 }
  drawClouds(c, s.rain > 0 || s.storm)

  const top = sunAt().y
  ctx.fillStyle = c.rain
  for (const d of drops) {
    d.y += d.v * dt; d.x += d.v * dt * 0.12
    if (d.y > h) { d.y = rnd(top - 10, top + 20); d.x = rnd(x0 - 20, x1) }
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3)
  }
  ctx.fillStyle = props.dark ? '#ffffff' : '#a3a3a3'
  for (const f of flakes) {
    f.y += f.v * dt; f.x += Math.sin(t * 1.3 + f.p) * dt * 6
    if (f.y > h) { f.y = rnd(top - 10, top + 20); f.x = rnd(x0, x1) }
    ctx.fillRect(Math.round(f.x), Math.round(f.y), f.big ? 2 : 1, f.big ? 2 : 1)
  }
  if (s.fog) drawFog(c)

  // storm: now and then a pixel bolt drops out of a cloud
  if (s.storm && !still) {
    if (!bolt && t > nextBolt && clouds.length) {
      const cl = clouds[Math.floor(Math.random() * clouds.length)]
      let x = Math.round(cl.x + cl.w / 2), y = cl.y + 10
      const pts = []
      for (let i = 0; i < 6; i++) { pts.push([x, y]); x += Math.random() < 0.5 ? -2 : 2; y += 5 }
      bolt = { pts, until: t + 0.18 }
      nextBolt = t + rnd(4, 9)
    }
    if (bolt) {
      ctx.fillStyle = props.dark ? '#ffffff' : c.ink
      for (let i = 0; i < bolt.pts.length - 1; i++) {
        const [x0, y0] = bolt.pts[i], [x1] = bolt.pts[i + 1]
        for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * (k / 5)), y0 + k, 1, 1)
      }
      if (t > bolt.until) bolt = null
    }
  }
  ctx.restore()
}

function tick(now) {
  raf = requestAnimationFrame(tick)
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  if (document.hidden) return
  t += dt
  frame(dt)
}

function resize() {
  const r = canvas.value.getBoundingClientRect()
  w = Math.ceil(r.width / P); h = Math.ceil(r.height / P)
  canvas.value.width = w; canvas.value.height = h
  ctx.imageSmoothingEnabled = false
  seedSky()
  if (still) frame(0)
}

let ro
onMounted(() => {
  ctx = canvas.value.getContext('2d')
  ro = new ResizeObserver(resize)
  ro.observe(canvas.value)
  resize()
  if (!still) { last = performance.now(); raf = requestAnimationFrame(tick) }
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect() })
watch(() => props.kind, () => { seedSky(); if (still) frame(0) })
watch(() => props.dark, () => { if (still) frame(0) })
watch(() => props.safe, () => { seedSky(); if (still) frame(0) }, { deep: true })
</script>

<template>
  <canvas ref="canvas" class="sky" aria-hidden="true" />
</template>

<style scoped>
.sky { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; pointer-events: none; }
</style>
