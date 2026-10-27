<script setup>
// A pixel cup of coffee whose steam swirls and rises. Drawn on a 14×16 grid like the voxels.
const cup = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '.XXXXXXXXXX...',
  '.XccccccccX...',
  '.X........XXX.',
  '.X........X.X.',
  '.X........X.X.',
  '.X........XXX.',
  '..X......X....',
  '...XXXXXX.....',
  'XXXXXXXXXXXX..',
]
const cells = (rows, ch) => rows.flatMap((r, y) => [...r].map((c, x) => (c === ch ? { x, y } : null)).filter(Boolean))
const ink = cells(cup, 'X')
const coffee = cells(cup, 'c')
const body = cells(cup.map((r, y) => (y > 8 && y < 14 ? r : '')), '.').filter(({ x, y }) => (y < 13 ? x > 1 && x < 10 : x > 2 && x < 9))
// one wisp, two poses; three wisps side by side
const wispA = [[0, 4], [0, 3], [1, 2], [1, 1], [0, 0]]
const wispB = [[1, 4], [1, 3], [0, 2], [0, 1], [1, 0]]
const at = (wisp, dx) => wisp.map(([x, y]) => ({ x: x + dx, y: y + 1 }))
const steamA = [2, 5, 8].flatMap((dx) => at(wispA, dx))
const steamB = [2, 5, 8].flatMap((dx) => at(wispB, dx))
</script>

<template>
  <svg class="coffee" viewBox="0 0 14 16" shape-rendering="crispEdges" role="img" aria-label="A cup of coffee, steaming">
    <g class="steam">
      <g class="a"><rect v-for="p in steamA" :key="`a${p.x}-${p.y}`" :x="p.x" :y="p.y" width="1" height="1" /></g>
      <g class="b"><rect v-for="p in steamB" :key="`b${p.x}-${p.y}`" :x="p.x" :y="p.y" width="1" height="1" /></g>
    </g>
    <rect v-for="p in body" :key="`f${p.x}-${p.y}`" :x="p.x" :y="p.y" width="1" height="1" class="fill" />
    <rect v-for="p in coffee" :key="`c${p.x}-${p.y}`" :x="p.x" :y="p.y" width="1" height="1" class="brew" />
    <rect v-for="p in ink" :key="`i${p.x}-${p.y}`" :x="p.x" :y="p.y" width="1" height="1" class="ink" />
  </svg>
</template>

<style scoped>
.coffee { width: 1.2em; height: auto; vertical-align: -0.12em; margin-left: 0.25em; overflow: visible; }
.ink { fill: var(--ink); }
.fill { fill: var(--paper); }
.brew { fill: var(--signal); }
.steam { fill: var(--stone); animation: rise 1.6s steps(4) infinite; }
.steam .b { opacity: 0; }
.steam .a { animation: swap 0.8s steps(1) infinite; }
.steam .b { animation: swap 0.8s steps(1) infinite reverse; }
@keyframes swap { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes rise {
  0% { transform: translateY(1px); opacity: 0.2; }
  40% { opacity: 1; }
  100% { transform: translateY(-2px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .steam, .steam .a, .steam .b { animation: none; }
  .steam { opacity: 1; }
  .steam .b { opacity: 0; }
}
</style>
