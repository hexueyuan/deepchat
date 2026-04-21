<template>
  <div class="generating-indicator">
    <span class="generating-dot" />
    <span class="generating-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<style scoped>
.generating-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.generating-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--primary));
  animation: generating-breathe 2s ease-in-out infinite;
}

.generating-text {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  animation: generating-breathe 2s ease-in-out infinite;
}

@keyframes generating-breathe {
  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .generating-dot,
  .generating-text {
    animation: none;
    opacity: 0.7;
  }
}
</style>
