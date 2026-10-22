<script setup>
// Tiny pixel icons drawn on a 7×7 grid, so they match the voxels.
defineProps({ name: { type: String, required: true } })
const icons = {
  left: ['0001000', '0011000', '0111111', '1111111', '0111111', '0011000', '0001000'],
  right: ['0001000', '0001100', '1111110', '1111111', '1111110', '0001100', '0001000'],
  up: ['0001000', '0011100', '0111110', '1111111', '0011100', '0011100', '0011100'],
  down: ['0011100', '0011100', '0011100', '1111111', '0111110', '0011100', '0001000'],
  sun: ['1001001', '0100010', '0011100', '1111111', '0011100', '0100010', '1001001'],
  moon: ['0011100', '0110000', '1100000', '1100000', '1100000', '0110000', '0011100'],
  close: ['1000001', '0100010', '0010100', '0001000', '0010100', '0100010', '1000001'],
}
</script>

<template>
  <svg viewBox="0 0 7 7" width="14" height="14" shape-rendering="crispEdges" aria-hidden="true">
    <template v-for="(row, y) in icons[name]" :key="y">
      <template v-for="(c, x) in row" :key="x">
        <rect v-if="c === '1'" :x="x" :y="y" width="1" height="1" fill="currentColor" />
      </template>
    </template>
  </svg>
</template>
