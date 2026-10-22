<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { VoxelStage } from '../three/VoxelStage.js'
import { COLORS } from '../three/aggregate.js'

const props = defineProps({
  explode: { type: Number, default: 0 },
  selected: { type: String, default: null },
  hovered: { type: String, default: null },
  safe: { type: Object, default: () => ({}) },
  dark: { type: Boolean, default: false },
})
const emit = defineEmits(['hover', 'select', 'turn', 'frame', 'ready'])
const canvas = ref(null)
let stage

onMounted(() => {
  stage = new VoxelStage(canvas.value, {
    colors: COLORS,
    onHover: (id) => emit('hover', id),
    onSelect: (id) => emit('select', id),
    onTurn: (turns) => emit('turn', turns),
    onFrame: (frame) => emit('frame', frame),
  })
  stage.setExplode(props.explode)
  stage.setSafeArea(props.safe)
  stage.setTheme(props.dark)
  emit('ready')
})
onBeforeUnmount(() => stage?.dispose())

watch(() => props.explode, (t) => stage?.setExplode(t))
watch(() => props.selected, (id) => stage?.setSelected(id))
watch(() => props.hovered, (id) => stage?.setHovered(id))
watch(() => props.dark, (dark) => stage?.setTheme(dark))
watch(() => props.safe, (safe) => stage?.setSafeArea(safe), { deep: true })

defineExpose({
  add: (parts) => stage?.add(parts),
  reset: () => stage?.reset(),
  rotate: (dir) => stage?.rotate(dir),
})
</script>

<template>
  <canvas ref="canvas" class="voxels" role="img"
    aria-label="A cluster of voxel rooms growing on its own. Each layer of it opens one of my projects; use the layer list to choose one." />
</template>

<style scoped>
.voxels { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: pan-y; cursor: grab; }
</style>
