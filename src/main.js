import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: () => import('./pages/HomePage.vue'), meta: { title: 'Parham Monfared' } },
        { path: '/news', component: () => import('./pages/NewsPage.vue'), meta: { title: 'Latest news I follow' } },
        { path: '/hobbies', component: () => import('./pages/HobbiesPage.vue'), meta: { title: 'Hobbies & Projects' } },
        { path: '/admin', component: () => import('./pages/AdminPage.vue'), meta: { title: 'Admin' } },
        { path: '/:pathMatch(.*)*', redirect: '/' }
    ],
    scrollBehavior(to, from, saved) {
        if (saved) return saved
        if (!to.hash) return { top: 0 }
        // Hobby anchors render after their fetch, so wait briefly for the target.
        return new Promise((resolve) => {
            let tries = 0
            const look = () => {
                if (document.querySelector(to.hash) || ++tries > 40) resolve({ el: to.hash, behavior: 'smooth' })
                else setTimeout(look, 50)
            }
            look()
        })
    }
})

router.afterEach((to) => {
    document.title = to.path === '/' ? to.meta.title : `${to.meta.title} · Parham Monfared`
})

createApp(App).use(router).mount('#app')
