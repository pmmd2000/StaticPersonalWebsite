import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: () => import('./pages/HomePage.vue'), meta: { title: 'Parham Monfared' } },
        { path: '/news', component: () => import('./pages/NewsPage.vue'), meta: { title: 'Tech news I liked' } },
        { path: '/hobbies', component: () => import('./pages/HobbiesPage.vue'), meta: { title: 'Hobbies' } },
        { path: '/admin', component: () => import('./pages/AdminPage.vue'), meta: { title: 'Admin' } },
        { path: '/:pathMatch(.*)*', redirect: '/' }
    ],
    scrollBehavior: (to, from, saved) => saved || { top: 0 }
})

router.afterEach((to) => {
    document.title = to.path === '/' ? to.meta.title : `${to.meta.title} · Parham Monfared`
})

createApp(App).use(router).mount('#app')
