<script setup>
// A pixel compass: the needle shows which way the model faces.
defineProps({ turns: { type: Number, default: 0 } })
const ring = ['001111100', '010000010', '100000001', '100000001', '100000001', '100000001', '100000001', '010000010', '001111100']
</script>

<template>
  <svg viewBox="0 0 9 9" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true">
    <template v-for="(row, y) in ring" :key="y">
      <template v-for="(c, x) in row" :key="x">
        <rect v-if="c === '1'" :x="x" :y="y" width="1" height="1" fill="currentColor" />
      </template>
    </template>
    <g class="needle" :style="{ transform: `rotate(${turns * -90}deg)` }">
      <rect x="4" y="2" width="1" height="3" fill="var(--signal)" />
      <rect x="3" y="3" width="3" height="1" fill="var(--signal)" />
      <rect x="4" y="5" width="1" height="2" fill="currentColor" />
    </g>
  </svg>
</template>

<style scoped>
.needle { transform-origin: 4.5px 4.5px; transition: transform .35s steps(4); }
</style>
