<script setup>
import { usePortfolio } from '../stores/portfolio.js'
const p = usePortfolio()
const sections = [
  ['Experience', 'experience'],
  ['Teaching', 'teaching'],
  ['Education', 'education'],
]
</script>

<template>
  <main class="page cv">
    <h1>CV</h1>
    <p class="lead">{{ p.cv.summary }}</p>

    <section v-for="[title, key] in sections" :key="key" class="block">
      <h2>{{ title }}</h2>
      <ol>
        <li v-for="e in p.cv[key]" :key="e.role + e.org">
          <span class="dates">{{ e.dates }}</span>
          <span class="what"><strong>{{ e.role }}</strong>, {{ e.org }}</span>
          <span v-if="e.note" class="note">{{ e.note }}</span>
        </li>
      </ol>
    </section>

    <section class="block lists">
      <div><h2>Software</h2><p>{{ p.cv.software.join(', ') }}.</p></div>
      <div><h2>Languages</h2><p>{{ p.cv.languages.join(', ') }}.</p></div>
      <div><h2>Certifications</h2><ul><li v-for="c in p.cv.certifications" :key="c">{{ c }}</li></ul></div>
    </section>
  </main>
</template>

<style scoped>
.cv { max-width: 1040px; }
h1 { font-size: var(--t-h1); }
.lead { font-size: var(--t-lead); line-height: 1.4; margin-top: 24px; max-width: 46ch; }
.block { margin-top: 64px; }
h2 { font-size: 24px; padding-bottom: 8px; border-bottom: 2px solid var(--ink); }
ol { list-style: none; margin: 0; padding: 0; }
ol li { display: grid; grid-template-columns: 180px 1fr; column-gap: 24px; padding: 14px 0; border-bottom: 1px solid var(--grid); }
.dates { font-family: var(--font-pixel); color: var(--stone); grid-row: span 2; }
strong { font-weight: 500; }
.note { color: var(--stone); font-size: var(--t-small); grid-column: 2; }
.lists { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
.lists p, .lists ul { margin-top: 12px; }
.lists ul { padding-left: 18px; }
@media (max-width: 720px) {
  ol li { grid-template-columns: 1fr; }
  .dates { grid-row: auto; }
  .note { grid-column: auto; }
  .lists { grid-template-columns: 1fr; }
}
</style>
