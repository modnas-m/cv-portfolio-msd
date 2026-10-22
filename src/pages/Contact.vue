<script setup>
import { usePortfolio } from '../stores/portfolio.js'
const p = usePortfolio()
</script>

<template>
  <main class="page contact">
    <h1>Come up to the roof</h1>
    <p class="lead">I'm looking for roles in AEC technology, adoption and technical project management. Barcelona, remote, or Germany.</p>
    <ul>
      <li><a :href="`mailto:${p.site.email}`">{{ p.site.email }}</a></li>
      <li v-if="p.site.linkedin"><a :href="p.site.linkedin" target="_blank" rel="noopener">LinkedIn</a></li>
      <li v-if="p.site.github"><a :href="p.site.github" target="_blank" rel="noopener">GitHub</a></li>
    </ul>
  </main>
</template>

<style scoped>
h1 { font-size: var(--t-h1); max-width: 14ch; }
.lead { font-size: var(--t-lead); margin-top: 24px; max-width: 40ch; }
ul { list-style: none; padding: 0; margin: 48px 0 0; display: grid; gap: 8px; }
li { font-family: var(--font-pixel); font-size: clamp(22px, 3vw, 34px); }
</style>
