<template>
  <div class="generating-indicator" :style="phaseColorStyle">
    <span class="generating-dot" />
    <span class="generating-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text: string
  phase?: string
}>()

const phaseColors: Record<string, string> = {
  preparing: '220 14% 60%',
  thinking: '265 90% 66%',
  toolCalling: '25 95% 60%',
  searching: '200 90% 55%',
  generating: '145 65% 50%',
  working: '220 14% 60%'
}

const phaseColorStyle = computed(() => {
  const hsl = phaseColors[props.phase ?? ''] ?? phaseColors.working
  return { '--generating-phase-color': hsl }
})
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
  background: hsl(var(--generating-phase-color));
  animation: generating-breathe 2s ease-in-out infinite;
}

.generating-text {
  font-size: 12px;
  color: hsl(var(--generating-phase-color));
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
