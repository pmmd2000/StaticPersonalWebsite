<template>
  <main class="container">
    <SiteHeader />
    <section class="page-intro">
      <h1 ref="title" class="page-title">Privacy policy</h1>
      <p class="updated mono">Last updated {{ UPDATED }}</p>
    </section>

    <article class="prose">
      <p>
        This policy covers parhammonfared.com and the small apps I run under it (for example
        fitness.parhammonfared.com and finance.parhammonfared.com). They are personal projects run by me, Parham
        Monfared, in the United Kingdom. Questions or requests:
        <a href="mailto:info@parhammonfared.com">info@parhammonfared.com</a>.
      </p>

      <h2>This website</h2>
      <ul>
        <li>
          <strong>Analytics.</strong> The public pages use Google Analytics, which sets cookies and records which pages
          are visited, roughly where from, and on what kind of device. I use it only to see what people read. You can
          block it with your browser's privacy settings or Google's
          <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">opt-out add-on</a>.
        </li>
        <li>
          <strong>Email.</strong> If you email me, I use your address and message only to reply.
        </li>
        <li>
          <strong>Hosting.</strong> The site runs on Cloudflare, which processes requests (including IP addresses) to
          serve and protect it.
        </li>
      </ul>

      <h2>Sign in with Google</h2>
      <p>
        Some of my apps let you sign in with your Google account. Google then shares your name, email address,
        profile picture and a Google account ID with the app. I use them only to sign you in and to recognise your
        account in that app. Nothing else from your Google account is read.
      </p>

      <h2>Google Calendar</h2>
      <p>
        Some apps can sync their own events (for example planned workouts) to your Google Calendar, only if you
        choose to connect it. They ask for permission to create and manage <em>a separate calendar of their
        own</em>. They cannot see or change your other calendars or events. You can disconnect at any time in the
        app or at <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>.
      </p>

      <h2>How Google data is handled</h2>
      <ul>
        <li>It is used only to provide the features described above, for you.</li>
        <li>It is never sold, never used for advertising, and never used to train AI models.</li>
        <li>
          It is not shared with anyone, except the infrastructure that runs the apps: Cloudflare, Hetzner (servers in
          Germany) and a server I run in the UK. Backups are kept in Cloudflare R2 storage.
        </li>
        <li>Only I have administrative access to it.</li>
      </ul>
      <p>
        The use and transfer of information received from Google APIs adheres to the
        <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">Google API
        Services User Data Policy</a>, including the Limited Use requirements.
      </p>

      <h2>App content and AI features</h2>
      <p>
        What you enter into an app (for example transactions or workouts) is stored so the app can work. Some apps
        have optional AI features that send the text you ask about to an AI provider (OpenAI) to process it. Data
        received from Google is never part of that.
      </p>

      <h2>Keeping and deleting data</h2>
      <p>
        Your data is kept while you use an app. Email me and I will delete your account and its data. Backups expire
        on their own within about 13 months. You can also remove an app's access to your Google account at any time
        at <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>.
      </p>

      <h2>Children</h2>
      <p>These sites are not intended for children under 13.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top changes with it.</p>
    </article>
    <SiteFooter />
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { scrambleIn } from '../motion.js'
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'

const UPDATED = '12 November 2026'
const title = ref(null)
onMounted(() => scrambleIn(title.value))
</script>

<style scoped>
.updated {
  margin: 20px 0 0;
  font-size: 0.85rem;
  color: var(--dim);
}

.prose {
  max-width: 72ch;
  padding: 48px 0 96px;
  color: var(--muted);
}

.prose h2 {
  margin: 48px 0 12px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  color: var(--fg);
}

.prose p,
.prose li {
  line-height: 1.65;
}

.prose ul {
  padding-left: 1.2em;
}

.prose li + li {
  margin-top: 10px;
}

.prose strong,
.prose em {
  color: var(--fg);
}

.prose a {
  color: var(--fg);
  text-underline-offset: 3px;
}

.prose a:hover {
  color: var(--accent);
}
</style>
