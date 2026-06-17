<script setup lang="ts">
// The distributed version of LogTape: same tape grid, but multiple clients
// append concurrently (one per empty tail cell, some from above and some from
// below) and the filled prefix is tinted to show one interleaved order.
// Shares LogTape's flex-grid layout and arrow glyphs so the two look alike.
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

// One concurrent append per empty tail cell. `col` is the 1-based cell it lands
// in; `dir` is 'down' (record above the tape) or 'up' (below). Color classes
// are spelled out in full so UnoCSS picks them up statically.
const clients = [
  { label: '5', box: 'border-teal-400 text-teal-300', head: 'text-teal-400', col: 6, dir: 'down' },
  { label: '6', box: 'border-amber-400 text-amber-300', head: 'text-amber-400', col: 7, dir: 'up' },
  { label: '7', box: 'border-fuchsia-400 text-fuchsia-300', head: 'text-fuchsia-400', col: 8, dir: 'down' },
]

// The interleaved total order already on the log, one tint per client.
const fill = [
  'border-teal-400 bg-teal-400/15',
  'border-fuchsia-400 bg-fuchsia-400/15',
  'border-amber-400 bg-amber-400/15',
  'border-sky-400 bg-sky-400/15',
  'border-teal-400 bg-teal-400/15',
]

const downAt = (i: number) => clients.find((c) => c.col === i && c.dir !== 'up')
const upAt = (i: number) => clients.find((c) => c.col === i && c.dir === 'up')
</script>

<template>
  <div class="flex justify-center font-mono">
    <div class="flex flex-col items-start">
      <!-- incoming records above, hovering over their target cell -->
      <div class="flex gap-2">
        <template v-for="i in cells" :key="i">
          <div
            v-if="downAt(i)"
            class="w-14 h-14 flex items-center justify-center border-2 border-dashed rounded"
            :class="downAt(i)!.box"
          >
            {{ downAt(i)!.label }}
          </div>
          <div v-else class="w-14" />
        </template>
      </div>
      <!-- arrows down into the tape -->
      <div class="flex gap-2 text-2xl leading-none">
        <template v-for="i in cells" :key="i">
          <div v-if="downAt(i)" class="w-14 text-center" :class="downAt(i)!.head">↓</div>
          <div v-else class="w-14" />
        </template>
      </div>
      <!-- the log: interleaved filled prefix + empty tail -->
      <div class="flex gap-2 mt-1">
        <div
          v-for="i in cells"
          :key="i"
          class="w-14 h-14 flex items-center justify-center border-2 rounded"
          :class="i <= filled ? fill[(i - 1) % fill.length] : 'border-dashed border-gray-600'"
        >
          {{ i <= filled ? i - 1 : '' }}
        </div>
      </div>
      <!-- arrows up into the tape -->
      <div class="flex gap-2 mt-1 text-2xl leading-none">
        <template v-for="i in cells" :key="i">
          <div v-if="upAt(i)" class="w-14 text-center" :class="upAt(i)!.head">↑</div>
          <div v-else class="w-14" />
        </template>
      </div>
      <!-- incoming records below -->
      <div class="flex gap-2">
        <template v-for="i in cells" :key="i">
          <div
            v-if="upAt(i)"
            class="w-14 h-14 flex items-center justify-center border-2 border-dashed rounded"
            :class="upAt(i)!.box"
          >
            {{ upAt(i)!.label }}
          </div>
          <div v-else class="w-14" />
        </template>
      </div>
    </div>
  </div>
</template>
