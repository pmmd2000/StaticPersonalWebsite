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
        { path: '/privacy', component: () => import('./pages/PrivacyPage.vue'), meta: { title: 'Privacy policy' } },
        { path: '/admin', component: () => import('./pages/AdminPage.vue'), meta: { title: 'Admin', private: true } },
        { path: '/brief', component: () => import('./pages/BriefPage.vue'), meta: { title: 'Morning Brief', private: true } },
        {
            path: '/brief/history',
            component: () => import('./pages/BriefHistoryPage.vue'),
            meta: { title: 'Brief history', private: true }
        },
        {
            path: '/brief/:date(\\d{4}-\\d{2}-\\d{2})',
            component: () => import('./pages/BriefPage.vue'),
            meta: { title: 'Morning Brief', private: true }
        },
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
    // Private pages also get X-Robots-Tag from the Worker; this covers client-side navigation.
    let robots = document.querySelector('meta[name="robots"]')
    if (to.meta.private) {
        if (!robots) robots = Object.assign(document.createElement('meta'), { name: 'robots' })
        robots.content = 'noindex, nofollow'
        document.head.appendChild(robots)
    } else {
        robots?.remove()
    }
})

createApp(App).use(router).mount('#app')
