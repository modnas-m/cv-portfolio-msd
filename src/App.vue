<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePortfolio } from './stores/portfolio.js'
import { useTheme } from './stores/theme.js'
import PixelIcon from './components/PixelIcon.vue'
const p = usePortfolio()
const theme = useTheme()
theme.watchSystem()
// The header stays put on the home page, where the cluster stays put too;
// on every other page it scrolls away with the content.
const route = useRoute()
const home = computed(() => route.name === 'home')
const year = new Date().getFullYear()
</script>

<template>
  <header class="bar" :class="{ fixed: home }">
    <RouterLink to="/" class="name" :aria-label="p.site.name">
      <span class="full">{{ p.site.name }}</span><span class="short" aria-hidden="true">María S. D.</span>
    </RouterLink>
    <nav aria-label="Main">
      <RouterLink to="/">Work</RouterLink>
      <RouterLink to="/cv">CV</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
      <button class="theme" type="button" :aria-label="theme.dark ? 'Switch to light mode' : 'Switch to dark mode'" @click="theme.toggle()">
        <PixelIcon :name="theme.dark ? 'sun' : 'moon'" />
      </button>
    </nav>
  </header>
  <RouterView />
  <footer v-if="!home" class="credit">© {{ year }} {{ p.site.name }}</footer>
</template>

<style scoped>
.bar {
  position: absolute; inset: 0 0 auto 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 16px var(--gutter);
  pointer-events: none;
}
.bar.fixed { position: fixed; }
.bar > * { pointer-events: auto; }
.credit { padding: 0 var(--gutter) 24px; text-align: center; font-size: 12px; color: var(--stone); }
.name { font-family: var(--font-pixel); font-size: 20px; text-decoration: none; background: var(--paper); padding: 0 4px; }
nav { display: flex; gap: 20px; font-family: var(--font-pixel); font-size: 18px; background: var(--paper); padding: 0 4px; }
nav { align-items: center; }
nav a { text-decoration: none; }
.theme { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; background: none; border: 0; cursor: pointer; }
.theme:hover { color: var(--signal); }
nav a.router-link-exact-active { color: var(--signal); }
@media (max-width: 520px) { .name { font-size: 15px; } nav { gap: 12px; font-size: 15px; } }
.name, nav { white-space: nowrap; }
.short { display: none; }
@media (max-width: 430px) { .full { display: none; } .short { display: inline; } }
</style>
