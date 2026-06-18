<script setup lang="ts">
// Why two sequencers corrupt the log — told as a failover gone wrong. Steps:
//   0 node A active, node B replica, shared prefix [1 2 3]
//   1 node A goes offline
//   2 node B is promoted (now active)
//   3 node B stamps a new message at offset 4
//   4 node A comes back from the dead — but it had stamped 3 of its own messages
//     (4,5,6, all different) that disagree with B's. Colors mark them distinct.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicks } = useSlideContext()
const c = computed(() => $clicks.value ?? 0)

const stride = 64
const OX = 150 // room for the "node X (active)" label before the log starts
const rowA = 20
const rowB = 104
const W = 580
const H = 220

const aOffline = computed(() => c.value >= 1 && c.value <= 3)
const bMsg = computed(() => c.value >= 3) // B's offset 4
const aBack = computed(() => c.value >= 4) // A returns with 4,5,6

const activeId = computed(() => (c.value >= 2 ? 'B' : c.value === 0 ? 'A' : null))

const colors: Record<string, string> = {
  gray: 'border-gray-400 bg-gray-700/40 text-gray-200',
  teal: 'border-teal-400 bg-teal-400/15 text-teal-200',
  fuchsia: 'border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200',
  sky: 'border-sky-400 bg-sky-400/15 text-sky-200',
  amber: 'border-amber-400 bg-amber-400/15 text-amber-200',
}

// from = the click at which the cell appears.
const aCells = [
  { o: 1, color: 'gray', from: 0 },
  { o: 2, color: 'gray', from: 0 },
  { o: 3, color: 'gray', from: 0 },
  { o: 4, color: 'teal', from: 4 },
  { o: 5, color: 'fuchsia', from: 4 },
  { o: 6, color: 'sky', from: 4 },
]
const bCells = [
  { o: 1, color: 'gray', from: 0 },
  { o: 2, color: 'gray', from: 0 },
  { o: 3, color: 'gray', from: 0 },
  { o: 4, color: 'amber', from: 3 },
]

function labelClass(id: string) {
  if (activeId.value === id) return 'text-blue-300'
  if (id === 'A' && aOffline.value) return 'text-red-400'
  if (id === 'A' && aBack.value) return 'text-red-400'
  return 'text-gray-300'
}
function labelText(id: string) {
  if (activeId.value === id) return `node ${id} (active)`
  if (id === 'A' && aBack.value) return 'node A (back!)'
  return `node ${id}`
}
</script>

<template>
  <div class="relative mx-auto mt-6 font-mono" :style="{ width: `${W}px`, height: `${H}px` }">
    <div class="absolute text-sm transition-all duration-500" :class="labelClass('A')" :style="{ left: '0px', top: `${rowA + 16}px` }">
      {{ labelText('A') }}
    </div>
    <div class="absolute text-sm transition-all duration-500" :class="labelClass('B')" :style="{ left: '0px', top: `${rowB + 16}px` }">
      {{ labelText('B') }}
    </div>

    <div
      v-for="cell in aCells"
      :key="`a${cell.o}`"
      v-show="c >= cell.from"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="[colors[cell.color], aOffline && cell.o <= 3 ? 'opacity-40' : '']"
      :style="{ left: `${OX + (cell.o - 1) * stride}px`, top: `${rowA}px` }"
    >
      {{ cell.o }}
    </div>

    <div
      v-for="cell in bCells"
      :key="`b${cell.o}`"
      v-show="c >= cell.from"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="colors[cell.color]"
      :style="{ left: `${OX + (cell.o - 1) * stride}px`, top: `${rowB}px` }"
    >
      {{ cell.o }}
    </div>

    <!-- the divergence at offset 4 -->
    <div
      v-show="aBack"
      class="absolute text-sm text-red-400"
      :style="{ left: `${OX + 3 * stride - 24}px`, top: `${rowB + 64}px` }"
    >
      same offsets, different messages
    </div>
  </div>
</template>
