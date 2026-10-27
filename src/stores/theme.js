import { defineStore } from 'pinia'

// Follows the system setting until someone uses the toggle; then it's
// remembered in this browser only. If the system setting can't be read, light.
const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const systemDark = () => !!media?.matches

function stored() {
  try { return localStorage.getItem('theme') } catch { return null }
}

export const useTheme = defineStore('theme', {
  state: () => ({
    theme: document.documentElement.dataset.theme || (systemDark() ? 'dark' : 'light'),
  }),
  getters: {
    dark: (s) => s.theme === 'dark',
  },
  actions: {
    apply(theme) {
      this.theme = theme
      document.documentElement.dataset.theme = theme
    },
    toggle() {
      const next = this.dark ? 'light' : 'dark'
      try { localStorage.setItem('theme', next) } catch { /* private mode: just don't remember */ }
      this.apply(next)
    },
    watchSystem() {
      media?.addEventListener?.('change', (e) => {
        const s = stored()
        if (s !== 'light' && s !== 'dark') this.apply(e.matches ? 'dark' : 'light')
      })
    },
  },
})
