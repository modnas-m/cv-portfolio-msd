<script setup>
import { usePortfolio } from '../stores/portfolio.js'
import PixelCoffee from '../components/PixelCoffee.vue'
const p = usePortfolio()
</script>

<template>
  <main class="page contact">
    <h1>Let's have a chat<PixelCoffee /></h1>
    <p class="lead">Contact me for any inquiry or curiosity regarding computational design, BIM or parametric tools.</p>
    <ul>
      <li><a :href="`mailto:${p.site.email}`">{{ p.site.email }}</a></li>
      <li v-if="p.site.linkedin"><a :href="p.site.linkedin" target="_blank" rel="noopener">LinkedIn</a></li>
      <li v-if="p.site.github"><a :href="p.site.github" target="_blank" rel="noopener">GitHub</a></li>
    </ul>
  </main>
</template>

<style scoped>
h1 { font-size: var(--t-h1); max-width: 22ch; }
.lead { font-size: var(--t-lead); margin-top: 24px; max-width: 40ch; }
ul { list-style: none; padding: 0; margin: 48px 0 0; display: grid; gap: 8px; }
li { font-family: var(--font-pixel); font-size: clamp(22px, 3vw, 34px); }
</style>
