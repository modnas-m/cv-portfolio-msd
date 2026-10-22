import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/work/:slug', name: 'project', component: () => import('./pages/Project.vue') },
    { path: '/cv', name: 'cv', component: () => import('./pages/Cv.vue') },
    { path: '/contact', name: 'contact', component: () => import('./pages/Contact.vue') },
    { path: '/:rest(.*)*', name: 'not-found', component: () => import('./pages/NotFound.vue') },
  ],
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})
