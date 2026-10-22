// Stochastic aggregation, in the spirit of Wasp for Grasshopper.
//
// A room is one 3×3×3 block on a coarse grid. Rooms sit side by side with a
// one-voxel joint between them, or straight on top of each other. When two
// neighbours merge, the joint fills in and they read as one bigger room.
//
// Each room is split into five kinds of parts, one per layer, bottom to top:
//   landscape  the site, which always covers the whole footprint
//   structure  the skeleton: a thin frame inside every room, and thin
//              columns under overhangs
//   slabs      the floor slab (the bottom row of the block)
//   rooms      the walls
//   windows    the windows
//
// A part is [x, y, z, colour] for one voxel, or [x, y, z, colour, w, h, d]
// for a box of any size (the skeleton's thin members).
//
// Same seed, same cluster. Fine grid units are voxels; y is up.

export const COLORS = {
  white: '#ffffff',
  light: '#ececec',
  stone: '#c4c4c4',
  ink: '#2b2b2b',
  glass: '#bcc6c8',
  lit: '#f2d27a',     // windows at night
}

const ROOM = 3            // a room is ROOM×ROOM×ROOM voxels
const PITCH = ROOM + 1    // side by side, with a one-voxel joint
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const T = 0.34            // thickness of the skeleton's posts and beams

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Aggregator {
  constructor(seed, { maxRooms, reach = 4, levels = 8, mergeChance = 0.4 } = {}) {
    this.seed = seed
    this.rand = mulberry32(seed)
    // each seed picks its own size, from 5 rooms to 30
    maxRooms ??= 5 + Math.floor(this.rand() * 26)
    this.opts = { maxRooms, reach, levels, mergeChance }
    this.cells = new Map()       // "i,j,k" -> room index
    this.stilts = new Set()      // cells taken by columns
    this.rooms = []              // { i, j, k }
    this.merges = 0
    this.groundCells = new Set()
    this.plot = null             // site plot in voxels: { x0, x1, z0, z1 }
    this.failures = 0
    this.done = false
  }

  /** rooms as people would count them: merged neighbours are one room */
  get roomCount() { return this.rooms.length - this.merges }

  key(i, j, k) { return `${i},${j},${k}` }
  has(i, j, k) { return this.cells.has(this.key(i, j, k)) }
  pick(list) { return list[Math.floor(this.rand() * list.length)] }

  // ------------------------------------------------------------- growing
  step() {
    if (this.rooms.length >= this.opts.maxRooms) this.done = true
    if (this.done) return null
    if (!this.rooms.length) return this._place({ i: 0, j: 0, k: 0 }, null)

    for (let tries = 0; tries < 30; tries++) {
      // favour recent rooms, so the cluster branches instead of filling a block
      const n = this.rooms.length
      const a = this.rooms[Math.min(n - 1, Math.floor(n * (1 - Math.pow(this.rand(), 2))))]
      const up = this.rand() < 0.45 * (1 - a.j / this.opts.levels)
      const [di, dk] = this.pick(SIDES)
      const c = up ? { i: a.i, j: a.j + 1, k: a.k } : { i: a.i + di, j: a.j, k: a.k + dk }
      if (this._fits(c)) return this._place(c, up ? null : a)
    }
    if (++this.failures > 8) this.done = true
    return this.done ? null : {}    // nothing fitted this time; try again next step
  }

  _fits(c) {
    const { reach, levels } = this.opts
    if (Math.abs(c.i) > reach || Math.abs(c.k) > reach || c.j >= levels) return false
    if (this.has(c.i, c.j, c.k) || this.stilts.has(this.key(c.i, c.j, c.k))) return false
    // an overhang may hang over at most one empty level
    if (c.j >= 2 && !this.has(c.i, c.j - 1, c.k) && !this.has(c.i, c.j - 2, c.k)) return false
    return true
  }

  _place(c, neighbour) {
    const out = { landscape: [], structure: [], slabs: [], rooms: [], windows: [] }
    const add = (layer, x, y, z, color) => out[layer].push([x, y, z, color])
    const box = (x, y, z, w, h, d) => out.structure.push([x, y, z, 'ink', w, h, d])
    const x0 = c.i * PITCH, z0 = c.k * PITCH, y0 = 1 + c.j * ROOM
    // the skeleton runs through the centres of the block's corner voxels
    const lo = 0.5, hi = ROOM - 0.5
    const corners = [[lo, lo], [hi, lo], [lo, hi], [hi, hi]].map(([a, b]) => [x0 + a, z0 + b])

    // structure: thin columns under an overhang, down to whatever is below
    if (c.j > 0 && !this.has(c.i, c.j - 1, c.k)) {
      this.stilts.add(this.key(c.i, c.j - 1, c.k))
      const foot = c.j >= 2 && this.has(c.i, c.j - 2, c.k) ? 1 + (c.j - 1) * ROOM : 1
      for (const [cx, cz] of corners) box(cx - T / 2, foot, cz - T / 2, T, y0 + lo - foot, T)
    }
    // structure: the room's frame, four posts and the beams along the top and bottom,
    // all kept inside the block so nothing pokes through the walls or roof
    for (const [cx, cz] of corners) box(cx - T / 2, y0 + lo - T / 2, cz - T / 2, T, hi - lo + T, T)
    for (const y of [y0 + lo, y0 + hi]) {
      for (const z of [z0 + lo, z0 + hi]) box(x0 + lo - T / 2, y - T / 2, z - T / 2, hi - lo + T, T, T)
      for (const x of [x0 + lo, x0 + hi]) box(x - T / 2, y - T / 2, z0 + lo - T / 2, T, T, hi - lo + T)
    }

    // the block: slab, then walls and windows
    for (let x = x0; x < x0 + ROOM; x++)
      for (let z = z0; z < z0 + ROOM; z++) add('slabs', x, y0, z, 'stone')
    const windows = new Set(SIDES.filter(() => this.rand() < 0.5).map(([a, b]) => `${a},${b}`))
    for (let y = y0 + 1; y < y0 + ROOM; y++)
      for (let x = x0; x < x0 + ROOM; x++)
        for (let z = z0; z < z0 + ROOM; z++) {
          const side = x === x0 + ROOM - 1 ? '1,0' : x === x0 ? '-1,0' : z === z0 + ROOM - 1 ? '0,1' : z === z0 ? '0,-1' : null
          const corner = (x === x0 || x === x0 + ROOM - 1) && (z === z0 || z === z0 + ROOM - 1)
          const middle = (x - x0 === 1 || z - z0 === 1) && y === y0 + 1
          if (side && !corner && middle && windows.has(side)) add('windows', x, y, z, 'glass')
          else add('rooms', x, y, z, 'white')
        }

    // merge with the room it grew from: fill the joint, and tie the two frames together
    if (neighbour && this.rand() < this.opts.mergeChance) {
      this.merges++
      const di = c.i - neighbour.i, dk = c.k - neighbour.k
      const jx = di === 1 ? x0 - 1 : di === -1 ? x0 + ROOM : null
      const jz = dk === 1 ? z0 - 1 : dk === -1 ? z0 + ROOM : null
      for (let s = 0; s < ROOM; s++) {
        const x = jx ?? x0 + s, z = jz ?? z0 + s
        add('slabs', x, y0, z, 'stone')
        for (let y = y0 + 1; y < y0 + ROOM; y++) add('rooms', x, y, z, 'white')
      }
      for (const y of [y0 + lo, y0 + hi]) {
        if (jx !== null) {
          const a = di === 1 ? x0 - 1 - lo : x0 + hi
          for (const z of [z0 + lo, z0 + hi]) box(a - T / 2, y - T / 2, z - T / 2, 2 + T, T, T)
        } else {
          const a = dk === 1 ? z0 - 1 - lo : z0 + hi
          for (const x of [x0 + lo, x0 + hi]) box(x - T / 2, y - T / 2, a - T / 2, T, T, 2 + T)
        }
      }
    }

    // landscape: the site grows to cover the whole footprint, plus a margin
    const margin = 2
    const want = { x0: x0 - margin, x1: x0 + ROOM + margin, z0: z0 - margin, z1: z0 + ROOM + margin }
    const plot = this.plot = this.plot
      ? { x0: Math.min(this.plot.x0, want.x0), x1: Math.max(this.plot.x1, want.x1), z0: Math.min(this.plot.z0, want.z0), z1: Math.max(this.plot.z1, want.z1) }
      : want
    for (let x = plot.x0; x < plot.x1; x++)
      for (let z = plot.z0; z < plot.z1; z++) {
        const k = `${x},${z}`
        if (this.groundCells.has(k)) continue
        this.groundCells.add(k)
        add('landscape', x, 0, z, this.rand() < 0.06 ? 'stone' : 'light')
      }

    this.cells.set(this.key(c.i, c.j, c.k), this.rooms.length)
    this.rooms.push(c)
    this.failures = 0
    return out
  }
}
