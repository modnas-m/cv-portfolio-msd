<script setup>
// One figure on a project page. `src` is a path inside the repo's assets/ folder
// (e.g. "sensi/ripple.webp"). Clips are .mp4 with a .webp poster of the same name;
// they loop silently while on screen, and stay still for reduced-motion visitors.
// `dark` is an optional version of a still image to show in dark mode.
// Clicking a still opens it larger in an overlay on the page.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTheme } from '../stores/theme.js'
import PixelIcon from './PixelIcon.vue'

const props = defineProps({ src: String, dark: String, alt: String, caption: String })
const theme = useTheme()

const files = import.meta.glob('../../assets/**/*.{webp,png,jpg,jpeg,gif,mp4}', {
  eager: true, query: '?url', import: 'default',
})
const url = (path) => (/^(https?:)?\//.test(path) ? path : files[`../../assets/${path}`])

const isVideo = computed(() => props.src.endsWith('.mp4'))
const still = computed(() => url(theme.dark && props.dark ? props.dark : props.src))
const poster = computed(() => url(props.src.replace(/\.mp4$/, '.webp')))
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const video = ref(null)
let observer
onMounted(() => {
  if (!isVideo.value || reduced || !video.value) return
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.value.play().catch(() => {})
    else video.value.pause()
  }, { threshold: 0.25 })
  observer.observe(video.value)
})

// the overlay
const open = ref(false)
const trigger = ref(null)
const closeButton = ref(null)
function onKey(e) { if (e.key === 'Escape') close() }
async function show() {
  open.value = true
  document.documentElement.style.overflow = 'hidden'
  addEventListener('keydown', onKey)
  await nextTick()
  closeButton.value?.focus()
}
function close() {
  if (!open.value) return
  open.value = false
  document.documentElement.style.overflow = ''
  removeEventListener('keydown', onKey)
  trigger.value?.focus()
}
onBeforeUnmount(() => { observer?.disconnect(); close() })
</script>

<template>
  <figure>
    <video
      v-if="isVideo" ref="video" :src="url(src)" :poster="poster" :aria-label="alt"
      muted loop playsinline preload="none" :controls="reduced"
    />
    <button v-else ref="trigger" type="button" class="zoom" :aria-label="`Enlarge: ${alt}`" @click="show">
      <img :src="still" :alt="alt" loading="lazy" />
    </button>
    <figcaption v-if="caption">{{ caption }}</figcaption>

    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="open" class="lightbox" role="dialog" aria-modal="true" :aria-label="alt" @click="close">
          <button ref="closeButton" type="button" class="close pixel-button" aria-label="Close" @click.stop="close">
            <PixelIcon name="close" />
          </button>
          <img :src="still" :alt="alt" @click.stop />
          <p v-if="caption" class="lightbox-caption" @click.stop>{{ caption }}</p>
        </div>
      </Transition>
    </Teleport>
  </figure>
</template>

<style scoped>
figure { margin: 0; }
/* a matte between the frame and the picture */
img, video {
  display: block; box-sizing: border-box; width: 100%; height: auto;
  padding: clamp(8px, 1.8vw, 24px); border: 2px solid var(--ink); background: var(--paper);
}
.zoom { display: block; width: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
.zoom:hover img, .zoom:focus-visible img { border-color: var(--signal); }
.zoom:focus-visible { outline: none; }
figcaption { font-size: var(--t-small); color: var(--stone); margin-top: 6px; max-width: var(--max-text); }

.lightbox {
  position: fixed; inset: 0; z-index: 100;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  padding: 64px 24px 32px;
  background: color-mix(in srgb, var(--paper) 97%, transparent);
  cursor: zoom-out;
}
.lightbox img {
  width: auto; max-width: min(1600px, 100%); max-height: calc(100vh - 140px);
  box-shadow: 8px 8px 0 var(--signal); cursor: default;
}
.lightbox-caption { font-size: var(--t-small); color: var(--stone); max-width: 70ch; text-align: center; cursor: default; }
.close { position: absolute; top: 16px; right: 16px; }

.lightbox-enter-active, .lightbox-leave-active { transition: opacity 0.15s steps(3); }
.lightbox-enter-from, .lightbox-leave-to { opacity: 0; }

@media (max-width: 720px) {
  .lightbox { padding: 60px 8px 16px; }
  .lightbox img { box-shadow: 4px 4px 0 var(--signal); }
}
</style>
