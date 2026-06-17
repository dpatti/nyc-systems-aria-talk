<script setup lang="ts">
// A simple "tape" visualization of an append-only log: a row of cells with a
// filled prefix and an empty tail, plus an incoming record hovering over the
// next empty cell with an arrow pointing into it.
withDefaults(
  defineProps<{
    cells?: number // total cells drawn
    filled?: number // how many of the leading cells are filled
    incoming?: string // label on the record waiting to be appended
  }>(),
  {
    cells: 8,
    filled: 5,
    incoming: 'rec',
  },
)
</script>

<template>
  <div class="flex justify-center font-mono">
    <div class="flex flex-col items-start">
      <!-- incoming record, hovering over the next empty cell -->
      <div class="flex gap-2">
        <div v-for="i in filled" :key="i" class="w-14" />
        <div class="w-14 h-14 flex items-center justify-center border-2 border-dashed border-teal-400 rounded text-teal-300">
          {{ incoming }}
        </div>
      </div>
      <!-- arrow into the next empty cell -->
      <div class="flex gap-2 text-teal-400 text-2xl leading-none">
        <div v-for="i in filled" :key="i" class="w-14" />
        <div class="w-14 text-center">↓</div>
      </div>
      <!-- the log: filled prefix + empty tail -->
      <div class="flex gap-2 mt-1">
        <div
          v-for="i in cells"
          :key="i"
          class="w-14 h-14 flex items-center justify-center border-2 rounded"
          :class="i <= filled ? 'border-gray-400 bg-gray-700/40' : 'border-dashed border-gray-600'"
        >
          {{ i <= filled ? i - 1 : '' }}
        </div>
      </div>
    </div>
  </div>
</template>
