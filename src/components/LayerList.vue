<script setup>
import { usePortfolio } from '../stores/portfolio.js'
const p = usePortfolio()
const emit = defineEmits(['choose'])
</script>

<template>
  <nav class="layers" aria-label="Layers of the cluster, one project each">
    <p class="caption">Layers</p>
    <ol>
      <li v-for="layer in p.layers" :key="layer.id">
        <button
          type="button"
          :class="{ on: p.selected === layer.id, hot: p.hovered === layer.id }"
          :aria-pressed="p.selected === layer.id"
          @mouseenter="p.hovered = layer.id"
          @mouseleave="p.hovered = null"
          @focus="p.hovered = layer.id"
          @blur="p.hovered = null"
          @click="emit('choose', layer.id)"
        >
          <span class="swatch" aria-hidden="true" />
          <span class="layer">{{ layer.name }}</span>
          <span class="project">
            <template v-for="(line, i) in p.layerSubtitles(layer.id)" :key="line"><br v-if="i" />{{ line }}</template>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.layers { width: 260px; }
.caption { font-size: var(--t-small); color: var(--stone); margin-bottom: 8px; }
ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
button {
  width: 100%; text-align: left; cursor: pointer;
  display: grid; grid-template-columns: 16px 1fr; column-gap: 12px; align-items: baseline;
  padding: 8px 8px; background: var(--paper); border: 2px solid transparent; border-radius: 0;
}
.swatch { width: 12px; height: 12px; border: 2px solid var(--ink); grid-row: span 2; align-self: start; margin-top: 4px; }
.layer { font-family: var(--font-pixel); font-size: 20px; line-height: 1.1; }
.project { font-size: var(--t-small); color: var(--stone); grid-column: 2; }
button.hot, button:hover { border-color: var(--ink); }
button.on { border-color: var(--signal); }
button.on .swatch { background: var(--signal); border-color: var(--signal); }
button.on .layer { color: var(--signal); }

@media (max-width: 899px) {
  .layers { width: 100%; }
  .caption { display: none; }
  ol { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; gap: 6px; padding-bottom: 4px; }
  button { grid-template-columns: 12px auto; column-gap: 8px; padding: 6px 10px; border-color: var(--ink); }
  .swatch { width: 10px; height: 10px; grid-row: auto; margin-top: 0; align-self: center; }
  .layer { font-size: 17px; }
  .project { display: none; }
}
</style>
