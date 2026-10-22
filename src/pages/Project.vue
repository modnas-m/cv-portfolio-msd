<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePortfolio } from '../stores/portfolio.js'
import NotFound from './NotFound.vue'

const route = useRoute()
const p = usePortfolio()
const project = computed(() => p.projectBySlug(route.params.slug))
const index = computed(() => p.layers.findIndex((l) => l.id === project.value?.layer))
const below = computed(() => index.value > 0 ? p.layers[index.value - 1] : null)
const above = computed(() => index.value < p.layers.length - 1 ? p.layers[index.value + 1] : null)
const pending = (text) => text?.startsWith('[')
// image paths in projects.json start at public/; prefix the site's base path
const asset = (src) => (src.startsWith('/') ? import.meta.env.BASE_URL + src.slice(1) : src)
</script>

<template>
  <NotFound v-if="!project" />
  <main v-else class="page project">
    <p class="layer"><span class="swatch" aria-hidden="true" />{{ p.layerName(project.layer) }} layer</p>
    <h1>{{ project.title }}</h1>
    <p class="lead">{{ project.oneLiner }}</p>

    <dl class="facts">
      <div><dt>Problem</dt><dd>{{ project.problem }}</dd></div>
      <div><dt>What I built</dt><dd>{{ project.approach }}</dd></div>
      <div><dt>Result</dt><dd>{{ project.result }}</dd></div>
      <div><dt>How it was run</dt><dd :class="{ pending: pending(project.coordination) }">{{ project.coordination }}</dd></div>
    </dl>

    <p class="meta">
      {{ project.kind }}, {{ project.years }}.
      Tools: {{ project.tools.join(', ') }}.
      <template v-if="project.note">{{ project.note }}</template>
      <template v-if="project.link"> <a :href="project.link" target="_blank" rel="noopener">Read the full write-up</a>.</template>
    </p>

    <div class="images" :class="{ empty: !project.images.length }">
      <figure v-for="img in project.images" :key="img.src">
        <img :src="asset(img.src)" :alt="img.alt" loading="lazy" />
        <figcaption v-if="img.caption">{{ img.caption }}</figcaption>
      </figure>
      <template v-if="!project.images.length">
        <div class="slot wide">Image</div><div class="slot">Image</div><div class="slot">Image</div>
      </template>
    </div>

    <nav class="stack" aria-label="Other layers">
      <RouterLink v-if="above" :to="`/work/${p.projectFor(above.id).slug}`" class="up">
        <span class="dir">Layer above</span>
        <span class="to">{{ above.name }}: {{ p.projectFor(above.id).title }}</span>
      </RouterLink>
      <RouterLink v-if="below" :to="`/work/${p.projectFor(below.id).slug}`" class="down">
        <span class="dir">Layer below</span>
        <span class="to">{{ below.name }}: {{ p.projectFor(below.id).title }}</span>
      </RouterLink>
      <RouterLink to="/" class="back"><span class="dir">Back to the cluster</span></RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.project { max-width: 1040px; }
.layer { display: flex; align-items: center; gap: 10px; font-family: var(--font-pixel); font-size: 18px; color: var(--signal); }
.swatch { width: 12px; height: 12px; background: var(--signal); }
h1 { font-size: var(--t-h1); margin-top: 12px; max-width: 18ch; }
.lead { font-size: clamp(22px, 2.6vw, 30px); line-height: 1.3; margin-top: 24px; max-width: 34ch; }

.facts { margin: 56px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 40px; }
.facts div { border-top: 2px solid var(--ink); padding-top: 12px; }
dt { font-family: var(--font-pixel); font-size: 18px; }
dd { margin: 8px 0 0; max-width: var(--max-text); }
dd.pending { color: var(--stone); }
.meta { margin-top: 40px; font-size: var(--t-small); color: var(--stone); max-width: var(--max-text); }

.images { margin-top: 56px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.images figure { margin: 0; }
.images figure:first-child { grid-column: span 2; }
figcaption { font-size: var(--t-small); color: var(--stone); margin-top: 6px; }
.slot {
  aspect-ratio: 4 / 3; display: grid; place-items: center;
  font-family: var(--font-pixel); color: var(--stone);
  background: repeating-linear-gradient(45deg, transparent 0 6px, var(--grid) 6px 8px);
  border: 2px solid var(--grid);
}
.slot.wide { grid-column: span 2; aspect-ratio: 16 / 7; }

.stack { margin-top: 72px; display: grid; gap: 8px; }
.stack a { display: grid; padding: 14px 16px; border: 2px solid var(--ink); text-decoration: none; background: var(--paper); }
.stack a:hover { border-color: var(--signal); box-shadow: 4px 4px 0 var(--signal); }
.dir { font-family: var(--font-pixel); font-size: 18px; }
.to { color: var(--stone); font-size: var(--t-small); }

@media (max-width: 720px) {
  .facts { grid-template-columns: 1fr; gap: 24px; }
  .images { grid-template-columns: 1fr; }
  .images figure:first-child, .slot.wide { grid-column: auto; }
}
</style>
