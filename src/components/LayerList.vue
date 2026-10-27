<script setup>
// The layers of the cluster. On wide screens a list beside the model; on phones
// a "Projects" button that opens the same list upwards, like a dropdown.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { usePortfolio } from '../stores/portfolio.js'
import PixelIcon from './PixelIcon.vue'

const p = usePortfolio()
const emit = defineEmits(['choose'])

const open = ref(false)
const root = ref(null)
function choose(id) {
  open.value = false
  emit('choose', id)
}
function onPointer(e) { if (open.value && !root.value?.contains(e.target)) open.value = false }
function onKey(e) { if (e.key === 'Escape') open.value = false }
onMounted(() => { addEventListener('pointerdown', onPointer); addEventListener('keydown', onKey) })
onBeforeUnmount(() => { removeEventListener('pointerdown', onPointer); removeEventListener('keydown', onKey) })
</script>

<template>
  <nav ref="root" class="layers" :class="{ open }" aria-label="Areas of work">
    <button type="button" class="menu pixel-button" :aria-expanded="open" aria-controls="layer-menu" @click="open = !open">
      Projects <PixelIcon :name="open ? 'down' : 'up'" />
    </button>
    <ol id="layer-menu">
      <li v-for="layer in p.layers" :key="layer.id">
        <button
          type="button"
          :class="{ on: p.selected === layer.id, hot: p.hovered === layer.id }"
          :aria-pressed="p.selected === layer.id"
          @mouseenter="p.hovered = layer.id"
          @mouseleave="p.hovered = null"
          @focus="p.hovered = layer.id"
          @blur="p.hovered = null"
          @click="choose(layer.id)"
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
.layers { width: 290px; }
.menu { display: none; }
ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
ol button {
  width: 100%; text-align: left; cursor: pointer;
  display: grid; grid-template-columns: 16px 1fr; column-gap: 12px; align-items: baseline;
  padding: 8px 8px; background: var(--paper); border: 2px solid transparent; border-radius: 0;
}
.swatch { width: 12px; height: 12px; border: 2px solid var(--ink); grid-row: span 2; align-self: start; margin-top: 4px; }
.layer { font-family: var(--font-pixel); font-size: 20px; line-height: 1.1; }
.project { font-size: var(--t-small); color: var(--stone); grid-column: 2; }
ol button.hot, ol button:hover { border-color: var(--ink); }
ol button.on { border-color: var(--signal); }
ol button.on .swatch { background: var(--signal); border-color: var(--signal); }
ol button.on .layer { color: var(--signal); }

/* phones: one button; the list opens upwards above it */
@media (max-width: 899px) {
  .layers { width: auto; position: relative; display: flex; justify-content: center; }
  .menu { display: inline-flex; align-items: center; gap: 10px; }
  ol {
    display: none; position: absolute; bottom: calc(100% + 10px); left: 0; right: 0;
    padding: 8px; background: var(--paper); border: 2px solid var(--ink); box-shadow: 6px 6px 0 var(--signal);
  }
  .open ol { display: grid; }
  ol button { padding: 10px 8px; }
  .layer { font-size: 18px; }
}
</style>
