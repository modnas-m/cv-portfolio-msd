import * as THREE from 'three'
import { voxelVertex, voxelFragment, quadVertex, compositeFragment } from './shaders.js'

// bottom to top, and left to right when taken apart
export const LAYERS = ['landscape', 'structure', 'slabs', 'rooms', 'windows']

const ELEVATION = Math.atan(0.5)          // 2:1 pixel-art dimetric
const CAMERA_DISTANCE = 1000
const DEPTH_RANGE = 1200
const ease = (t) => 1 - Math.pow(1 - t, 3)
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))

export class VoxelStage {
  constructor(canvas, { onHover, onSelect, onTurn, onFrame, colors } = {}) {
    this.canvas = canvas
    this.onHover = onHover || (() => {})
    this.onSelect = onSelect || (() => {})
    this.onTurn = onTurn || (() => {})
    this.onFrame = onFrame || (() => {})   // where each layer sits on screen, for its tag
    this.turns = 0
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.palette = Object.fromEntries(Object.entries(colors || {}).map(([k, v]) => [k, new THREE.Color(v)]))

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    this.renderer.setPixelRatio(1)
    this.renderer.setClearColor(0x000000, 0)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000)
    this.ui = {
      paper: new THREE.Color('#ffffff'),
      ink: new THREE.Color('#000000'),
      signal: new THREE.Color('#d7141a'),
    }

    this.explode = 0
    this.explodeTarget = 0
    this.azimuth = Math.PI / 4
    this.azimuthTarget = Math.PI / 4
    this.selected = null
    this.hovered = null
    this.zoom = 6
    this.time = 0
    this.safe = { left: 0, right: 0, top: 0, bottom: 0 }   // css px kept free for text

    this._initPasses()
    this._initLayers()
    this.reset()

    this._raycaster = new THREE.Raycaster()
    this._pointer = new THREE.Vector2()
    this._pointerDirty = false
    canvas.addEventListener('pointerdown', this._onPointerDown)
    canvas.addEventListener('pointerup', this._onPointerUp)
    canvas.addEventListener('pointermove', this._onPointerMove)
    canvas.addEventListener('pointerleave', this._onPointerLeave)
    canvas.addEventListener('click', this._onClick)
    this._ro = new ResizeObserver(() => this.resize())
    this._ro.observe(canvas)
    this.resize()
    this._last = performance.now()
    this._raf = requestAnimationFrame(this._tick)
  }

  // ---------------------------------------------------------------- setup
  _initPasses() {
    const opts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }
    this.rtColor = new THREE.WebGLRenderTarget(1, 1, { ...opts, depthTexture: new THREE.DepthTexture(1, 1) })
    this.rtNormal = new THREE.WebGLRenderTarget(1, 1, opts)
    this.quadScene = new THREE.Scene()
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.composite = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: compositeFragment,
      uniforms: {
        tColor: { value: this.rtColor.texture },
        tNormal: { value: this.rtNormal.texture },
        tDepth: { value: this.rtColor.depthTexture },
        uTexel: { value: new THREE.Vector2() },
        uDepthStep: { value: 0.7 / DEPTH_RANGE },
        uInk: { value: this.ui.ink },
        uSignal: { value: this.ui.signal },
        uPaper: { value: this.ui.paper },
        uNight: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite))
  }

  _material(normalPass) {
    return new THREE.ShaderMaterial({
      vertexShader: voxelVertex,
      fragmentShader: voxelFragment,
      defines: normalPass ? { NORMAL_PASS: '' } : {},
      uniforms: {
        uTime: { value: 0 },
        uSelected: { value: 0 },
        uHover: { value: 0 },
        uDim: { value: 0 },
        uPaper: { value: this.ui.paper },
        uSignal: { value: this.ui.signal },
      },
    })
  }

  _initLayers() {
    this.layers = {}
    for (const id of LAYERS) {
      const layer = {
        id,
        color: this._material(false),
        normal: this._material(true),
        capacity: 0,
        count: 0,
        keys: [],          // colour key per voxel, so the theme can repaint them
        mesh: null,
        hover: 0, selected: 0, dim: 0,
      }
      this.layers[id] = layer
      this._grow(layer, 2048)
    }
  }

  // (re)allocate a layer's instanced mesh with room for `capacity` voxels
  _grow(layer, capacity) {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const colors = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
    const born = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
    geo.setAttribute('aColor', colors)
    geo.setAttribute('aBorn', born)
    const mesh = new THREE.InstancedMesh(geo, layer.color, capacity)
    mesh.frustumCulled = false
    mesh.userData.id = layer.id
    const old = layer.mesh
    if (old) {
      for (let i = 0; i < layer.count; i++) {
        old.getMatrixAt(i, this._m || (this._m = new THREE.Matrix4()))
        mesh.setMatrixAt(i, this._m)
      }
      colors.array.set(old.geometry.attributes.aColor.array.subarray(0, layer.count * 3))
      born.array.set(old.geometry.attributes.aBorn.array.subarray(0, layer.count))
      mesh.position.copy(old.position)
      this.scene.remove(old)
      old.geometry.dispose()
    }
    mesh.count = layer.count
    this.scene.add(mesh)
    layer.mesh = mesh
    layer.capacity = capacity
  }

  // ---------------------------------------------------------------- data
  reset() {
    for (const layer of Object.values(this.layers)) {
      layer.count = 0
      layer.keys = []
      layer.mesh.count = 0
      layer.bounds = new THREE.Box3()
    }
    this.bounds = new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(4, 6, 4))
    this.height = 6
  }

  /** additions: { layerId: [[x, y, z, colorKey, w?, h?, d?], ...] }, appended to what's there.
   *  Without w/h/d it's one voxel; with them, a box of that size from (x, y, z). */
  add(additions) {
    this._append(additions, this.reducedMotion ? -1 : this.time)
  }

  _append(additions, now) {
    const m = new THREE.Matrix4()
    for (const [id, voxels] of Object.entries(additions)) {
      const layer = this.layers[id]
      if (!layer || !voxels.length) continue
      if (layer.count + voxels.length > layer.capacity) {
        this._grow(layer, Math.max(layer.capacity * 2, layer.count + voxels.length))
      }
      const mesh = layer.mesh
      const colors = mesh.geometry.attributes.aColor
      const born = mesh.geometry.attributes.aBorn
      voxels.forEach(([x, y, z, key, w = 1, h = 1, d = 1]) => {
        const i = layer.count++
        m.makeScale(w, h, d).setPosition(x + w / 2, y + h / 2, z + d / 2)
        mesh.setMatrixAt(i, m)
        layer.keys[i] = key
        this._colorInto(colors.array, i, key)
        born.array[i] = now
        const a = new THREE.Vector3(x, y, z), b = new THREE.Vector3(x + w, y + h, z + d)
        this.bounds.expandByPoint(a).expandByPoint(b)
        layer.bounds.expandByPoint(a).expandByPoint(b)
      })
      mesh.count = layer.count
      mesh.instanceMatrix.needsUpdate = true
      colors.needsUpdate = true
      born.needsUpdate = true
      mesh.boundingSphere = null
    }
    this.height = this.bounds.max.y
  }

  // Night: everything a little dimmer, the windows light up, and the dark
  // columns go grey so they don't vanish against the black sky.
  _colorInto(array, i, key) {
    const night = { glass: this.palette.lit, ink: this._nightInk || (this._nightInk = new THREE.Color('#8f8f8f')) }
    const c = (this._night && night[key]) || this.palette[key]
    const k = this._night && !night[key] ? 0.82 : 1
    array[i * 3] = (c?.r ?? 0) * k; array[i * 3 + 1] = (c?.g ?? 0) * k; array[i * 3 + 2] = (c?.b ?? 0) * k
  }

  setTheme(dark) {
    this._night = dark
    this.composite.uniforms.uNight.value = dark ? 1 : 0
    this.ui.paper.set(dark ? '#000000' : '#ffffff')
    this.ui.signal.set(dark ? '#f0262d' : '#d7141a')
    for (const layer of Object.values(this.layers)) {
      const colors = layer.mesh.geometry.attributes.aColor
      for (let i = 0; i < layer.count; i++) this._colorInto(colors.array, i, layer.keys[i])
      colors.needsUpdate = true
    }
  }

  // ---------------------------------------------------------------- controls
  setExplode(t) { this.explodeTarget = Math.min(1, Math.max(0, t)) }
  setSelected(id) { this.selected = id }
  setHovered(id) { this.hovered = id }
  rotate(dir) {
    const step = dir > 0 ? 1 : -1
    this.turns += step
    this.azimuthTarget += step * Math.PI / 2
    this.onTurn(this.turns)
  }
  setSafeArea(safe) { this.safe = { ...this.safe, ...safe } }

  // ---------------------------------------------------------------- picking
  // drag sideways to turn the model, a quarter turn at a time
  _onPointerDown = (e) => {
    this._drag = { x: e.clientX, moved: false }
    this.canvas.style.cursor = 'grabbing'
  }
  _onPointerUp = () => {
    if (this._drag) this._dragEnded = this._drag.moved
    this._drag = null
    this.canvas.style.cursor = this._pick ? 'pointer' : 'grab'
  }

  _onPointerMove = (e) => {
    if (this._drag && e.buttons) {
      const dx = e.clientX - this._drag.x
      if (Math.abs(dx) > 90) {
        this.rotate(dx > 0 ? -1 : 1)
        this._drag.x = e.clientX
        this._drag.moved = true
      }
    }
    const r = this.canvas.getBoundingClientRect()
    this._pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this._pointerDirty = true
  }
  _onPointerLeave = () => {
    this._pick = null
    this._drag = null
    this.onHover(null)
    this.canvas.style.cursor = ''
  }
  // Pick where the click or tap actually happened: on touch screens the pointer
  // "leaves" before the click fires, and there is no hover beforehand.
  _onClick = (e) => {
    if (this._dragEnded) { this._dragEnded = false; return }
    const id = this._pickAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 22 : 8)
    if (id) this.onSelect(id)
  }

  // the layer under a screen point; thin parts are hard to hit, so if the exact
  // point misses, try rings around it and take the nearest hit
  _pickAt(x, y, reach) {
    const r = this.canvas.getBoundingClientRect()
    const at = (px, py) => {
      this._pointer.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1)
      return this._pickLayer()
    }
    let id = at(x, y)
    for (let ring = reach / 2; !id && ring <= reach; ring += reach / 2) {
      for (let k = 0; k < 8 && !id; k++) {
        const a = (k / 8) * Math.PI * 2
        id = at(x + Math.cos(a) * ring, y + Math.sin(a) * ring)
      }
    }
    return id
  }

  _pickLayer() {
    this._raycaster.setFromCamera(this._pointer, this.camera)
    const meshes = Object.values(this.layers).filter((l) => l.count).map((l) => {
      if (!l.mesh.boundingSphere) l.mesh.computeBoundingSphere()
      return l.mesh
    })
    const hit = this._raycaster.intersectObjects(meshes, false)[0]
    return hit ? hit.object.userData.id : null
  }

  // ---------------------------------------------------------------- framing
  _axes(az) {
    const fwd = new THREE.Vector3(Math.cos(az) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.sin(az) * Math.cos(ELEVATION))
    const right = new THREE.Vector3(0, 1, 0).cross(fwd).normalize()
    const up = new THREE.Vector3().crossVectors(fwd, right)
    return { fwd, right, up }
  }

  // Exploded layers line up on a diagonal: side by side, each a step higher.
  _layerOffset(i, t, right) {
    const b = this.bounds
    let wide = 0
    for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
      wide = Math.max(wide, Math.abs(new THREE.Vector3(x - (b.min.x + b.max.x) / 2, 0, z - (b.min.z + b.max.z) / 2).dot(right)))
    }
    const e = ease(t)
    const k = i - (LAYERS.length - 1) / 2
    return right.clone().multiplyScalar(k * (1.15 * wide + 4) * e).add(new THREE.Vector3(0, k * this.height * 0.5 * e, 0))
  }

  _fit(t) {
    const b = this.bounds
    const { right, up } = this._axes(this.azimuthTarget)
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
    const center = new THREE.Vector3()
    LAYERS.forEach((id, i) => {
      if (!this.layers[id].count) return
      const off = this._layerOffset(i, t, right)
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = new THREE.Vector3(x, y, z).add(off)
        const u = p.dot(right), v = p.dot(up)
        minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v)
      }
    })
    if (!isFinite(minU)) { minU = -4; maxU = 4; minV = 0; maxV = 6 }
    // the free area left between the text and the layer list, in render pixels
    const s = this.safe, px = this.pixel || 1
    const w = Math.max(40, this._w - (s.left + s.right) / px)
    const h = Math.max(40, this._h - (s.top + s.bottom) / px)
    // never blow a single room up to fill the screen
    const zoom = Math.min(11, w / ((maxU - minU) * 1.15), h / ((maxV - minV) * 1.15))
    // aim at the middle of the box, then shift so it sits in the middle of the free area
    const midU = (minU + maxU) / 2, midV = (minV + maxV) / 2
    const shiftU = ((s.right - s.left) / 2 / px) / zoom
    const shiftV = ((s.top - s.bottom) / 2 / px) / zoom
    center.copy(right).multiplyScalar(midU + shiftU).add(up.clone().multiplyScalar(midV + shiftV))
    return { zoom, center }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    if (!r.width || !r.height) return
    // render small, scale up without smoothing: that's the pixel art
    this.pixel = Math.max(2, Math.round(r.width / 720))
    const w = Math.ceil(r.width / this.pixel), h = Math.ceil(r.height / this.pixel)
    this._w = w; this._h = h
    this.renderer.setSize(w, h, false)
    this.rtColor.setSize(w, h)
    this.rtNormal.setSize(w, h)
    this.composite.uniforms.uTexel.value.set(1 / w, 1 / h)
    this._center ??= this._fit(this.explode).center
  }

  // ---------------------------------------------------------------- loop
  _tick = (now) => {
    const dt = Math.min(0.05, (now - this._last) / 1000)
    this._last = now
    this.time += dt
    this._raf = requestAnimationFrame(this._tick)
    if (!this._w) return
    const k = this.reducedMotion ? 60 : 1

    this.explode = damp(this.explode, this.explodeTarget, 8 * k, dt)
    this.azimuth = damp(this.azimuth, this.azimuthTarget, 7 * k, dt)

    if (this._pointerDirty) {
      this._pointerDirty = false
      const id = this._pickLayer()
      if (id !== this._pick) {
        this._pick = id
        this.onHover(id)
        if (!this._drag) this.canvas.style.cursor = id ? 'pointer' : 'grab'
      }
    }

    const { right } = this._axes(this.azimuth)
    LAYERS.forEach((id, i) => {
      const l = this.layers[id]
      l.mesh.position.copy(this._layerOffset(i, this.explode, right))
      l.selected = damp(l.selected, this.selected === id ? 1 : 0, 10 * k, dt)
      l.hover = damp(l.hover, this.hovered === id && this.selected !== id ? 1 : 0, 12 * k, dt)
      l.dim = damp(l.dim, this.selected && this.selected !== id ? 1 : 0, 10 * k, dt)
      for (const mat of [l.color, l.normal]) {
        const u = mat.uniforms
        u.uTime.value = this.time
        u.uSelected.value = l.selected
        u.uHover.value = l.hover
        u.uDim.value = l.dim
      }
    })

    // camera orbits at a fixed pixel-art elevation and zooms out as the cluster grows
    const fit = this._fit(this.explode)
    this.zoom = damp(this.zoom, fit.zoom, 3 * k, dt)
    this._center.lerp(fit.center, 1 - Math.exp(-3 * k * dt))
    const c = this._center
    this.camera.position.set(
      c.x + CAMERA_DISTANCE * Math.cos(this.azimuth) * Math.cos(ELEVATION),
      c.y + CAMERA_DISTANCE * Math.sin(ELEVATION),
      c.z + CAMERA_DISTANCE * Math.sin(this.azimuth) * Math.cos(ELEVATION),
    )
    this.camera.lookAt(c)
    this.camera.left = -this._w / 2; this.camera.right = this._w / 2
    this.camera.top = this._h / 2; this.camera.bottom = -this._h / 2
    this.camera.zoom = this.zoom
    // a flat top face changes depth by about 2/zoom per pixel at this elevation
    this.composite.uniforms.uDepthStep.value = (2.2 / this.zoom + 0.6) / DEPTH_RANGE
    this.camera.near = CAMERA_DISTANCE - DEPTH_RANGE / 2
    this.camera.far = CAMERA_DISTANCE + DEPTH_RANGE / 2
    this.camera.updateProjectionMatrix()

    this._render()
    this.onFrame({ explode: this.explode, anchors: this._anchors() })
  }

  // Each layer's middle, top and bottom on screen, in css pixels, so a tag can sit beside it.
  _anchors() {
    const out = {}
    const r = this.canvas.getBoundingClientRect()
    const p = new THREE.Vector3()
    for (const id of LAYERS) {
      const l = this.layers[id]
      if (!l.count || l.bounds.isEmpty()) continue
      const b = l.bounds, o = l.mesh.position
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        p.set(x + o.x, y + o.y, z + o.z).project(this.camera)
        const sx = (p.x + 1) / 2 * r.width, sy = (1 - p.y) / 2 * r.height
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy)
      }
      out[id] = { x: (minX + maxX) / 2, top: minY, bottom: maxY }
    }
    return out
  }

  _render() {
    const r = this.renderer
    const layers = Object.values(this.layers)
    layers.forEach((l) => (l.mesh.material = l.normal))
    r.setRenderTarget(this.rtNormal); r.clear(); r.render(this.scene, this.camera)
    layers.forEach((l) => (l.mesh.material = l.color))
    r.setRenderTarget(this.rtColor); r.clear(); r.render(this.scene, this.camera)
    r.setRenderTarget(null); r.clear(); r.render(this.quadScene, this.quadCamera)
  }

  dispose() {
    cancelAnimationFrame(this._raf)
    this._ro.disconnect()
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas.removeEventListener('pointerup', this._onPointerUp)
    this.canvas.removeEventListener('pointermove', this._onPointerMove)
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave)
    this.canvas.removeEventListener('click', this._onClick)
    for (const l of Object.values(this.layers)) {
      l.mesh.geometry.dispose(); l.color.dispose(); l.normal.dispose()
    }
    this.rtColor.dispose(); this.rtNormal.dispose(); this.composite.dispose()
    this.renderer.dispose()
  }
}
