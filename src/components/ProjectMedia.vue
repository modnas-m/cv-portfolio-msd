<script setup>
// One figure on a project page. `src` is a path inside the repo's assets/ folder
// (e.g. "sensi/ripple.webp"). Clips are .mp4 with a .webp poster of the same name;
// they loop silently while on screen, and stay still for reduced-motion visitors.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ src: String, alt: String, caption: String })

const files = import.meta.glob('../../assets/**/*.{webp,png,jpg,jpeg,gif,mp4}', {
  eager: true, query: '?url', import: 'default',
})
const url = (path) => (/^(https?:)?\//.test(path) ? path : files[`../../assets/${path}`])

const isVideo = computed(() => props.src.endsWith('.mp4'))
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
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <figure>
    <video
      v-if="isVideo" ref="video" :src="url(src)" :poster="poster" :aria-label="alt"
      muted loop playsinline preload="none" :controls="reduced"
    />
    <img v-else :src="url(src)" :alt="alt" loading="lazy" />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
figure { margin: 0; }
img, video { display: block; width: 100%; height: auto; border: 2px solid var(--ink); background: var(--paper); }
figcaption { font-size: var(--t-small); color: var(--stone); margin-top: 6px; max-width: var(--max-text); }
</style>
