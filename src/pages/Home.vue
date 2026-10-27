<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { usePortfolio } from '../stores/portfolio.js'
import VoxelScene from '../components/VoxelScene.vue'
import LayerList from '../components/LayerList.vue'
import PixelIcon from '../components/PixelIcon.vue'
import Compass from '../components/Compass.vue'
import WeatherSky from '../components/WeatherSky.vue'
import { Aggregator } from '../three/aggregate.js'
import { LAYERS } from '../three/VoxelStage.js'
import { getWeather, KINDS } from '../weather.js'
import { useTheme } from '../stores/theme.js'

const p = usePortfolio()
const theme = useTheme()
const weather = ref(null)
const weatherLine = computed(() => {
  const wx = weather.value
  if (!wx) return ''
  const temp = wx.temp == null ? '' : `, ${wx.temp} °C`
  return `${wx.place} right now: ${KINDS[wx.kind].label}${temp}`
})
const stageEl = ref(null)
const scene = ref(null)
const progress = ref(0)
const wide = ref(true)
const turns = ref(0)

// As the cluster comes apart, the side list fades out and each layer
// gets its own tag, fading in just above it (the landscape's goes underneath:
// nothing is ever below it, and its neighbour above is tall).
const frame = shallowRef({ explode: 0, anchors: {} })
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x) }
const listFade = computed(() => 1 - smooth(0.1, 0.45, frame.value.explode))
const tagFade = computed(() => smooth(0.35, 0.9, frame.value.explode))
// Tags are little boxes, so they're laid out together: each sits above its
// layer, and if it would overlap a tag already placed, it moves up.
const tagEls = {}
const tagRef = (id) => (el) => { if (el) tagEls[id] = el; else delete tagEls[id] }
const tagPos = computed(() => {
  const out = {}, placed = []
  const gap = 8, pad = 6
  // in the model's order, bottom part first: the bottom tag goes underneath
  LAYERS.map((id) => p.layers.find((l) => l.id === id)).filter(Boolean).forEach((layer, i) => {
    const a = frame.value.anchors[layer.id]
    if (!a) return
    const el = tagEls[layer.id]
    const w = el?.offsetWidth || 110, h = el?.offsetHeight || 32
    const r = { x: a.x - w / 2, y: i === 0 ? a.bottom + gap : a.top - gap - h, w, h }
    if (i > 0) {
      for (let tries = 0; tries < 8; tries++) {
        const hit = placed.find((o) => r.x < o.x + o.w + pad && o.x < r.x + r.w + pad && r.y < o.y + o.h + pad && o.y < r.y + r.h + pad)
        if (!hit) break
        r.y = hit.y - h - pad
      }
    }
    placed.push(r)
    out[layer.id] = r
  })
  // hovering or choosing a tag can change its size; read it again next frame
  void p.hovered; void p.selected
  return out
})
const tagAt = (id) => {
  const r = tagPos.value[id]
  return r ? `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)` : 'none'
}

// keep the cluster in the space the text and the layer list leave free
const safe = computed(() => wide.value
  ? { left: 400, right: 330, top: 64, bottom: 88 }
  : { left: 0, right: 0, top: 200, bottom: 150 })

// Scrolling through the first section takes the cluster apart.
const explode = computed(() => Math.min(1, progress.value / 0.8))
const card = computed(() => (p.selected ? p.layerItems(p.selected) : []))

// The cluster: a new seed on every visit, or ?seed=12345 to get one back.
const seed = ref(0)
const modules = ref(0)
const grown = ref(false)
let agg = null
let timer = null

function newSeed() {
  const fromUrl = Number(new URLSearchParams(location.search).get('seed'))
  return fromUrl > 0 && !seed.value ? fromUrl : 10000 + Math.floor(Math.random() * 89999)
}

// The cluster grows in about a second and a half, whatever its size;
// the rest of the page fades in once it's done (the first time only).
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const GROW_MS = 1400
const revealed = ref(still)

const fadeIn = () => (revealed.value ? 'reveal' : 'pending')
const order = (i) => ({ '--i': i })

function done() {
  grown.value = true
  revealed.value = true
  clearInterval(timer)
}

function grow() {
  clearInterval(timer)
  seed.value = newSeed()
  agg = new Aggregator(seed.value)
  modules.value = 0
  grown.value = false
  scene.value?.reset()
  // one room per step; a step that finds no place just tries again
  const next = () => {
    let parts = {}
    for (let i = 0; i < 30 && parts && !Object.keys(parts).length; i++) parts = agg.step()
    return parts
  }
  if (still) {
    for (let parts = next(); parts; parts = next()) scene.value?.add(parts)
    modules.value = agg.roomCount
    return done()
  }
  timer = setInterval(() => {
    if (document.hidden) return
    const parts = next()
    if (!parts) return done()
    scene.value?.add(parts)
    modules.value = agg.roomCount
  }, Math.max(30, GROW_MS / agg.opts.maxRooms))
}

function onResize() {
  wide.value = window.innerWidth >= 900
  onScroll()
}

function onScroll() {
  const el = stageEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const travel = el.offsetHeight - window.innerHeight
  progress.value = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 1
}

// choosing a layer highlights it; only scrolling takes the cluster apart
function choose(id) {
  p.selected = p.selected === id ? null : id
}

// "What I do" lives in a sheet that slides up from the bottom. Any real
// motion (scrolling, swiping, a key, a click elsewhere) puts it away again.
const aboutOpen = ref(false)
const sheetEl = ref(null)
const toggleEl = ref(null)
let touchY = null
function openAbout() {
  aboutOpen.value = true
  setTimeout(() => sheetEl.value?.focus({ preventScroll: true }), 50)
}
function closeAbout() {
  if (!aboutOpen.value) return
  aboutOpen.value = false
}
function onWheel(e) {
  if (!aboutOpen.value) return
  e.preventDefault()          // this scroll only closes the sheet
  closeAbout()
}
function onTouchStart(e) { touchY = e.touches[0]?.clientY ?? null }
function onTouchMove(e) {
  if (!aboutOpen.value || touchY == null) return
  if (Math.abs((e.touches[0]?.clientY ?? touchY) - touchY) > 12) { e.preventDefault(); closeAbout() }
}
function onPointerDown(e) {
  if (!aboutOpen.value) return
  if (sheetEl.value?.contains(e.target) || toggleEl.value?.contains(e.target)) return
  closeAbout()
}

function onKey(e) {
  if (aboutOpen.value) {
    if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) {
      if (e.key !== 'Escape') e.preventDefault()
      closeAbout()
      toggleEl.value?.focus({ preventScroll: true })
    }
    return
  }
  if (e.key === 'Escape') p.selected = null
}

onMounted(() => {
  getWeather().then((wx) => (weather.value = wx))
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('pointerdown', onPointerDown)
  onResize()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('pointerdown', onPointerDown)
})
</script>

<template>
  <main>
    <section ref="stageEl" class="stage" aria-label="The cluster">
      <div class="sticky" :class="{ lifted: aboutOpen }">
        <WeatherSky :class="fadeIn(3)" :style="order(3)" :kind="weather?.kind || 'clear'" :dark="theme.dark" :safe="safe" />
        <VoxelScene
          ref="scene"
          class="scene"
          :explode="explode"
          :selected="p.selected"
          :hovered="p.hovered"
          :safe="safe"
          :dark="theme.dark"
          @hover="(id) => (p.hovered = id)"
          @select="choose"
          @turn="(n) => (turns = n)"
          @frame="(f) => (frame = f)"
          @ready="grow"
        />

        <div class="intro" :class="[{ away: card }, fadeIn(0)]" :style="order(0)" :aria-hidden="!!card">
          <h1>{{ p.site.tagline }}</h1>
          <p v-if="p.site.subtitle" class="subtitle">{{ p.site.subtitle }}</p>
          <p class="role">{{ p.site.role }} in Barcelona. Every layer of this cluster is something I worked on.</p>
          <p class="hint" :class="{ gone: explode > 0.08 }">Scroll to take it apart.</p>
        </div>

        <LayerList class="list" :class="[fadeIn(1), { asleep: listFade < 0.3 }]" :style="[order(1), { opacity: listFade }]"
          :aria-hidden="listFade < 0.3" @choose="choose" />

        <div v-show="tagFade > 0.01" class="tags" :class="{ asleep: tagFade < 0.5 }" :style="{ opacity: tagFade }">
          <template v-for="layer in p.layers" :key="layer.id">
            <button
              v-if="frame.anchors[layer.id]"
              type="button"
              :ref="tagRef(layer.id)"
              class="tag"
              :class="{ on: p.selected === layer.id, hot: p.hovered === layer.id }"
              :style="{ transform: tagAt(layer.id) }"
              @mouseenter="p.hovered = layer.id"
              @mouseleave="p.hovered = null"
              @focus="p.hovered = layer.id"
              @blur="p.hovered = null"
              @click="choose(layer.id)"
            >
              <span class="tag-layer"><span class="swatch" aria-hidden="true" />{{ layer.name }}</span>
              <template v-if="p.hovered === layer.id || p.selected === layer.id">
                <span v-for="line in p.layerSubtitles(layer.id)" :key="line" class="tag-project">{{ line }}</span>
              </template>
            </button>
          </template>
        </div>

        <aside v-if="card.length" class="card" aria-live="polite">
          <button class="close pixel-button" type="button" aria-label="Close" @click="p.selected = null">
            <PixelIcon name="close" />
          </button>
          <h2 class="card-layer">{{ p.layerName(p.selected) }}</h2>
          <div v-for="item in card" :key="item.key" class="card-project" :class="{ compact: !item.slug }">
            <h3>{{ item.title }}</h3>
            <p v-if="!item.slug" class="card-line">{{ item.line }}</p>
            <RouterLink v-if="item.slug" class="pixel-button open" :to="`/work/${item.slug}`">Open project</RouterLink>
          </div>
          <RouterLink v-if="p.isCvLayer(p.selected)" class="pixel-button open card-cv" to="/cv">Read the CV</RouterLink>
        </aside>

        <div class="controls" :class="fadeIn(2)" :style="order(2)">
          <div class="grower">
            <p class="building-name">
              <span class="b-title">Specimen {{ seed }}</span>
              <span class="b-meta">{{ modules }} rooms, {{ grown ? 'fully grown' : 'still growing' }}</span>
            </p>
            <button class="pixel-button" type="button" @click="grow">Grow another</button>
          </div>
          <div class="turn">
            <p v-if="weatherLine" class="weather-line">{{ weatherLine }}</p>
            <p class="drag-hint">Drag the model to turn it</p>
            <button class="pixel-button compass" type="button" aria-label="Turn the model a quarter turn" @click="scene?.rotate(1)">
              <Compass :turns="turns" />
            </button>
          </div>
        </div>

        <div class="about" :class="{ open: aboutOpen }">
          <!-- a pull tab on the sheet's top edge: it rises with the sheet -->
          <button ref="toggleEl" class="pixel-button about-toggle" type="button" :class="fadeIn(2)" :style="order(2)"
            :aria-expanded="aboutOpen" aria-controls="about" aria-label="What I do" @click="aboutOpen ? closeAbout() : openAbout()">
            <PixelIcon :name="aboutOpen ? 'down' : 'up'" />
            <span class="about-toggle-label">What I do</span>
          </button>
          <section id="about" ref="sheetEl" class="about-panel" tabindex="-1"
            aria-labelledby="about-title" :aria-hidden="!aboutOpen" :inert="!aboutOpen">
          <div class="about-inner">
            <h2 id="about-title">What I do</h2>
            <ul>
              <li v-for="line in p.site.whatIDo" :key="line">{{ line }}</li>
            </ul>
            <p class="more">
              <RouterLink to="/cv">Read the CV</RouterLink> or
              <a :href="`mailto:${p.site.email}`">write to me</a>.
            </p>
          </div>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.stage { height: 280vh; position: relative; }
.pending { opacity: 0; pointer-events: none; }
.reveal { animation: fade-in .5s ease-out backwards; animation-delay: calc(var(--i) * 120ms); }
@keyframes fade-in { from { opacity: 0; transform: translateY(4px); } }
.sticky { position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden; }
.scene { position: absolute; inset: 0; }

.intro { position: absolute; left: var(--gutter); top: 88px; max-width: 30ch; pointer-events: none; transition: opacity .25s; }
.intro.away { opacity: 0; }
h1 { font-size: clamp(32px, 4.4vw, 56px); }
/* the subtitle finishes the headline's sentence, a size down */
.subtitle { font-family: var(--font-pixel); font-size: clamp(20px, 2vw, 28px); line-height: 1.15; margin-top: 10px; white-space: nowrap; }
.intro h1, .subtitle { text-wrap: balance; }
.role { margin-top: 16px; max-width: 34ch; background: var(--paper); }
.hint { margin-top: 24px; font-family: var(--font-pixel); font-size: 18px; color: var(--signal); transition: opacity .4s; }
.hint.gone { opacity: 0; }

.asleep { pointer-events: none !important; }
.asleep :deep(*) { pointer-events: none !important; }
.tags { position: absolute; inset: 0; pointer-events: none; }
.tags:not(.asleep) .tag { pointer-events: auto; }
/* tags look like the card: outlined, with a pixel drop shadow */
.tag {
  position: absolute; left: 0; top: 0; display: grid; justify-items: start; gap: 2px;
  padding: 5px 10px 6px; background: var(--paper);
  border: 2px solid var(--ink); border-radius: 0; box-shadow: 3px 3px 0 var(--ink);
  cursor: pointer; white-space: nowrap; text-align: left;
}
.tag:hover, .tag.hot { border-color: var(--signal); box-shadow: 3px 3px 0 var(--signal); }
.tag.on { border-color: var(--signal); box-shadow: 4px 4px 0 var(--signal); z-index: 2; }
.tag-layer { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-pixel); font-size: 17px; line-height: 1.1; }
.tag .swatch { width: 10px; height: 10px; border: 2px solid var(--ink); }
.tag.on .tag-layer, .tag:hover .tag-layer, .tag.hot .tag-layer { color: var(--signal); }
.tag.on .swatch { background: var(--signal); border-color: var(--signal); }
.tag-project { font-size: 13px; color: var(--stone); padding-left: 18px; }
.list { position: absolute; right: var(--gutter); top: 50%; transform: translateY(-50%); }

.card {
  position: absolute; left: var(--gutter); top: 96px;
  width: 360px; padding: 20px 20px 24px; background: var(--paper);
  border: 2px solid var(--ink); box-shadow: 6px 6px 0 var(--signal);
}
.card-layer { font-size: 28px; color: var(--signal); margin-right: 40px; }
.card-project { border-top: 2px solid var(--ink); padding-top: 12px; margin-top: 16px; display: grid; gap: 10px; justify-items: start; }
.card h3 { font-family: var(--font-pixel); font-weight: 600; font-size: 21px; line-height: 1.1; }
.card-line { margin: 8px 0 14px; }
.card-project.compact { padding-top: 8px; margin-top: 10px; gap: 2px; }
.card-project.compact .card-line { margin: 0 0 4px; font-size: var(--t-small); color: var(--stone); }
.card-cv { margin-top: 16px; }
.open { text-decoration: none; }
.close { position: absolute; top: 12px; right: 12px; min-width: 32px; height: 32px; padding: 0; box-shadow: 2px 2px 0 var(--ink); }

.controls {
  position: absolute; left: var(--gutter); right: var(--gutter); bottom: 24px;
  display: flex; justify-content: space-between; align-items: end; gap: 16px; pointer-events: none;
}
.controls:not(.pending) > * { pointer-events: auto; }
.grower, .turn { display: flex; align-items: center; gap: 12px; }
.building-name { display: grid; background: var(--paper); padding: 0 4px; min-width: 0; }
.b-title { font-family: var(--font-pixel); font-size: 20px; line-height: 1.1; }
.b-meta { font-size: var(--t-small); color: var(--stone); }
.weather-line, .drag-hint { font-size: var(--t-small); color: var(--stone); background: var(--paper); padding: 0 4px; }
.weather-line { margin-right: 16px; }
.compass { width: 44px; height: 44px; padding: 0; }

/* "What I do": the page slides up a little and the sheet rises from the bottom */
/* the cluster and sky rise a little; the text steps aside so the sheet has the stage */
.sticky > * { transition: translate .5s cubic-bezier(.2, .8, .2, 1), filter .3s; }
.sticky.lifted > .scene { translate: 0 -16vh; }
.sticky.lifted > :is(.sky, .intro, .list, .tags, .controls, .card) { filter: opacity(0); pointer-events: none; }
.about {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 30;
  transform: translateY(calc(100% + 8px)); transition: transform .5s cubic-bezier(.2, .8, .2, 1);
}
.about.open { transform: none; }
/* the sheet fills everything below the header bar */
.about-panel {
  height: calc(100vh - var(--bar-h)); height: calc(100svh - var(--bar-h)); overflow: auto; outline: none;
  background: var(--paper); border-top: 2px solid var(--ink); box-shadow: 0 -6px 0 var(--signal);
}
.about-inner { max-width: 1200px; margin: 0 auto; padding: 40px var(--gutter) 56px; }
.about h2 { font-size: var(--t-h2); }
.about ul { list-style: none; padding: 0; margin: 24px 0 0; display: grid; gap: 4px; }
.about li { font-size: clamp(20px, 2.6vw, 32px); line-height: 1.25; max-width: 34ch; padding: 10px 0; border-top: 2px solid var(--ink); }
.more { margin-top: 32px; font-size: var(--t-lead); }
.about-toggle { position: absolute; left: 50%; bottom: calc(100% + 32px); translate: -50% 0; white-space: nowrap; }
/* open, there's no room above the sheet any more: the tab moves inside, top centre */
.about.open .about-toggle { bottom: auto; top: 22px; z-index: 1; }
.about.open .about-inner { padding-top: 96px; }

@media (max-width: 899px) {
  .intro { top: 72px; right: var(--gutter); max-width: none; }
  h1 { font-size: 30px; }
  .subtitle { font-size: 19px; margin-top: 4px; white-space: normal; }
  .role { font-size: 15px; margin-top: 10px; }
  .hint { margin-top: 12px; font-size: 16px; }
  .list { top: auto; bottom: 84px; left: var(--gutter); right: var(--gutter); transform: none; }
  .card { left: var(--gutter); right: var(--gutter); top: 72px; width: auto; }
  .controls { bottom: 16px; align-items: center; }
  .grower { gap: 10px; }
  .b-title { font-size: 15px; white-space: nowrap; }
  .b-meta, .weather-line, .drag-hint { display: none; }
  .tag { padding: 3px 6px 4px; box-shadow: 2px 2px 0 var(--ink); }
  .tag-layer { font-size: 14px; gap: 6px; }
  .tag .swatch { width: 8px; height: 8px; }
  .tag-project { display: none; }
  .grower .pixel-button { white-space: nowrap; font-size: 14px; }
  .b-title { display: none; }
  .about-toggle { bottom: calc(100% + 24px); min-width: 44px; height: 44px; padding: 0; }
  .about.open .about-inner { padding-top: 84px; }
  .about-toggle-label { display: none; }
  .turn { gap: 8px; }
}
</style>
