<script setup lang="ts">
// The distributed version of LogTape: the same tape, but multiple clients
// append concurrently (scattered, colored records above the tail) and the
// filled prefix is tinted to show they all land in one interleaved order.
withDefaults(
  defineProps<{
    cells?: number
    filled?: number
  }>(),
  {
    cells: 8,
    filled: 5,
  },
)

// Concurrent client appends, scattered above the tape. `left`/`top` are pixel
// offsets within the tape's box (cell = 56px wide + 8px gap = 64px stride).
// Color classes are spelled out in full so UnoCSS picks them up statically.
// `dir` is 'down' (record above the tape, default) or 'up' (record below,
// pointing up into the tail). For 'down', `top` is the box's y offset and the
// connector shortens as `top` grows. For 'up', `gap` is the connector length.
const clients = [
  { label: 'A', box: 'border-teal-400 text-teal-300', line: 'border-teal-400', head: 'text-teal-400', left: 300, top: 40 },
  { label: 'B', box: 'border-amber-400 text-amber-300', line: 'border-amber-400', head: 'text-amber-400', left: 366, dir: 'up', gap: 28 },
  { label: 'C', box: 'border-fuchsia-400 text-fuchsia-300', line: 'border-fuchsia-400', head: 'text-fuchsia-400', left: 438, top: 0 },
]

// The interleaved total order already on the log, one tint per client.
const fill = [
  'border-teal-400 bg-teal-400/15',
  'border-fuchsia-400 bg-fuchsia-400/15',
  'border-amber-400 bg-amber-400/15',
  'border-sky-400 bg-sky-400/15',
  'border-teal-400 bg-teal-400/15',
]
</script>

<template>
  <div class="flex justify-center font-mono mt-2">
    <div class="relative pb-24">
      <!-- concurrent client appends, scattered around the tail -->
      <template v-for="(c, idx) in clients" :key="idx">
        <!-- record above the tape, pointing down -->
        <div
          v-if="c.dir !== 'up'"
          class="absolute flex flex-col items-center"
          :style="{ left: `${c.left}px`, top: `${c.top}px` }"
        >
          <div class="w-14 h-14 flex items-center justify-center border-2 border-dashed rounded" :class="c.box">
            {{ c.label }}
          </div>
          <div class="border-l-2 border-dashed" :class="c.line" :style="{ height: `${84 - (c.top ?? 0)}px` }" />
          <div class="-mt-2 leading-none" :class="c.head">▾</div>
        </div>
        <!-- record below the tape, pointing up (tape bottom is at 200px) -->
        <div v-else class="absolute flex flex-col items-center" :style="{ left: `${c.left}px`, top: '200px' }">
          <div class="-mb-2 leading-none" :class="c.head">▴</div>
          <div class="border-l-2 border-dashed" :class="c.line" :style="{ height: `${c.gap ?? 24}px` }" />
          <div class="w-14 h-14 flex items-center justify-center border-2 border-dashed rounded" :class="c.box">
            {{ c.label }}
          </div>
        </div>
      </template>
      <!-- the log: interleaved filled prefix + empty tail -->
      <div class="flex gap-2 pt-36">
        <div
          v-for="i in cells"
          :key="i"
          class="w-14 h-14 flex items-center justify-center border-2 rounded"
          :class="i <= filled ? fill[(i - 1) % fill.length] : 'border-dashed border-gray-600'"
        >
          {{ i <= filled ? i - 1 : '' }}
        </div>
      </div>
    </div>
  </div>
</template>
