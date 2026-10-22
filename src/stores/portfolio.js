import { defineStore } from 'pinia'
import projects from '../../content/projects.json'
import layers from '../../content/layers.json'
import site from '../../content/site.json'
import cv from '../../content/cv.json'

export const usePortfolio = defineStore('portfolio', {
  state: () => ({
    site,
    cv,
    projects,
    layers,           // bottom to top
    selected: null,   // layer id
    hovered: null,    // layer id
  }),
  getters: {
    projectFor: (s) => (layerId) => s.projects.find((p) => p.layer === layerId),
    projectBySlug: (s) => (slug) => s.projects.find((p) => p.slug === slug),
    layerName: (s) => (layerId) => s.layers.find((l) => l.id === layerId)?.name,
    layerShows: (s) => (layerId) => s.layers.find((l) => l.id === layerId)?.shows,
    stackTopDown: (s) => [...s.layers].reverse(),
  },
})
