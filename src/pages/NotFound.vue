<template>
  <main class="page lost">
    <h1>This room hasn't grown yet</h1>
    <p class="lead">The page you asked for isn't part of the cluster.</p>
    <RouterLink class="pixel-button" to="/">Back to the cluster</RouterLink>
  </main>
</template>

<style scoped>
h1 { font-size: var(--t-h1); max-width: 14ch; }
.lead { font-size: var(--t-lead); margin: 24px 0 40px; }
.pixel-button { text-decoration: none; }
</style>
