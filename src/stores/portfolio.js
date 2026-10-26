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
    layers,           // in the order the list shows them (not the model's order)
    selected: null,   // layer id
    hovered: null,    // layer id
  }),
  getters: {
    // a layer can hold more than one project
    projectsFor: (s) => (layerId) => s.projects.filter((p) => p.layer === layerId),
    // every project, in list order, then projects.json order within a layer
    projectSequence: (s) => s.layers.flatMap((l) => s.projects.filter((p) => p.layer === l.id)),
    projectBySlug: (s) => (slug) => s.projects.find((p) => p.slug === slug),
    layerName: (s) => (layerId) => s.layers.find((l) => l.id === layerId)?.name,
    layerShows: (s) => (layerId) => s.layers.find((l) => l.id === layerId)?.shows,
    // what a layer holds, in one shape: projects, or entries from the CV (teaching)
    layerItems: (s) => (layerId) => {
      const layer = s.layers.find((l) => l.id === layerId)
      if (layer?.cv) {
        return s.cv[layer.cv].map((e) => ({ key: e.role + e.org, title: e.org, line: `${e.role}, ${e.dates}` }))
      }
      return s.projects.filter((p) => p.layer === layerId)
        .map((p) => ({ key: p.slug, title: p.title, line: p.oneLiner, slug: p.slug }))
    },
    isCvLayer: (s) => (layerId) => !!s.layers.find((l) => l.id === layerId)?.cv,
    // the short lines under a layer's name: its "summary" if it has one, else its project titles
    layerSubtitles: (s) => (layerId) => {
      const layer = s.layers.find((l) => l.id === layerId)
      if (layer?.summary) return [layer.summary]
      return s.projects.filter((p) => p.layer === layerId).map((p) => p.title)
    },
  },
})
