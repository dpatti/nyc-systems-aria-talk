<script setup lang="ts">
// Global eventual consistency as a rebase. Top row = the global log; bottom row
// = your local log. Your local-origin records (L₁ L₂ L₃) stay teal wherever they
// appear — including once they're relayed into the global log — so you can trace
// them; foreign records (A, C, D) are gray. A relayed local record aligns under
// its global slot; un-relayed ones sit at the end and rebase as global grows.
// Steps (by $clicks):
//   0 global [A L₁ C]; locally [L₁ L₂ L₃] — L₁ aligns, L₂/L₃ wait at the end
//   1 L₂ is relayed → it's copied up into the global log (and aligns)
//   2 a foreign record D arrives → your remaining L₃ rebases right
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicks } = useSlideContext()
const c = computed(() => $clicks.value ?? 0)

const stride = 64
const OX = 110
const topRow = 24
const botRow = 104
const W = 560
const H = 180

const globalByClick = [
  ['A', 'L1', 'C'],
  ['A', 'L1', 'C', 'L2'],
  ['A', 'L1', 'C', 'L2', 'D'],
]
const localRecords = ['L1', 'L2', 'L3']

const global = computed(() => globalByClick[Math.min(c.value, globalByClick.length - 1)])

// A relayed local record sits at its global column; an un-relayed one sits after
// the current global tail (and so shifts right as the global log grows).
const localCells = computed(() => {
  const g = global.value
  let pending = 0
  return localRecords.map((id) => {
    const gi = g.indexOf(id)
    return gi >= 0 ? { id, pos: gi } : { id, pos: g.length + pending++ }
  })
})

const isLocal = (id: string) => id.startsWith('L')
const gray = 'border-gray-400 bg-gray-700/40 text-gray-200'
const teal = 'border-teal-400 bg-teal-400/15 text-teal-200'
const subs: Record<string, string> = { '1': '₁', '2': '₂', '3': '₃' }
const label = (id: string) => (isLocal(id) ? `L${subs[id[1]]}` : id)
</script>

<template>
  <div class="relative mx-auto mt-8 font-mono" :style="{ width: `${W}px`, height: `${H}px` }">
    <div class="absolute text-gray-400 text-sm" :style="{ left: '0px', top: `${topRow + 18}px` }">global</div>
    <div class="absolute text-teal-300 text-sm" :style="{ left: '0px', top: `${botRow + 18}px` }">local</div>

    <!-- global log: foreign records gray, relayed local records stay teal -->
    <div
      v-for="(id, i) in global"
      :key="`g-${id}`"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="isLocal(id) ? teal : gray"
      :style="{ left: `${OX + i * stride}px`, top: `${topRow}px` }"
    >
      {{ label(id) }}
    </div>

    <!-- local log: your records, aligned under global when relayed -->
    <div
      v-for="cell in localCells"
      :key="`l-${cell.id}`"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="teal"
      :style="{ left: `${OX + cell.pos * stride}px`, top: `${botRow}px` }"
    >
      {{ label(cell.id) }}
    </div>
  </div>
</template>
