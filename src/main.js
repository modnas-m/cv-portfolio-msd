import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/600.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'
import router from './router.js'

createApp(App).use(createPinia()).use(router).mount('#app')
