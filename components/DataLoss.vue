<script setup lang="ts">
// Why promoting the behind node corrupts the log — three nodes, like the
// cluster. A (active) and B are caught up (they hold 4 & 5); C is behind (1-3).
// The writes aren't lost — clients saw them and B still has them — but new
// appends land at different offsets on C vs B, so the logs diverge. Steps:
//   0 A active & ahead; A and B both hold 4,5; clients read from B (saw 5)
//   1 A crashes
//   2 we incorrectly promote C (the behind node)
//   3 append 6,7,8 — on C they take its next offsets (4,5,6); B already has
//     offsets 4,5 so it drops 6,7 as retransmissions, appending only 8 (offset 6)
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicks } = useSlideContext()
const c = computed(() => $clicks.value ?? 0)

const stride = 64
const OX = 120
const W = 700
const H = 270

const aDead = computed(() => c.value >= 1)
const promotedC = computed(() => c.value >= 2)
const appended = computed(() => c.value >= 3)

const rows = { A: 20, B: 104, C: 188 }

// C's appends relaying up to B: 6→offset4 and 7→offset5 are dropped as
// retransmissions (red); 8→offset6 is genuinely new and replicates (normal).
const relayArrows = [
  { col: 4, color: 'text-red-400' },
  { col: 5, color: 'text-red-400' },
  { col: 6, color: 'text-gray-200' },
]
const activeId = computed(() => (promotedC.value ? 'C' : aDead.value ? null : 'A'))

const gray = 'border-gray-400 bg-gray-700/40 text-gray-200'
const teal = 'border-teal-400 bg-teal-400/15 text-teal-200'
// new appends, one color each so the same message is trackable across rows
const newColor: Record<number, string> = {
  6: 'border-amber-400 bg-amber-400/15 text-amber-200',
  7: 'border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200',
  8: 'border-sky-400 bg-sky-400/15 text-sky-200',
}
// On C, 6/7/8 take its next offsets (4/5/6). B already has offsets 4/5, so it
// reads 6/7 as retransmissions of its 4/5 and drops them — only 8 is new to B,
// landing at offset 6 too. So 8 sits at the same offset on both, but the records
// underneath (4,5 vs 6,7) disagree.
const newOnB = [{ label: 8, col: 6 }]
const newOnC = [{ label: 6, col: 4 }, { label: 7, col: 5 }, { label: 8, col: 6 }]

function labelClass(id: string) {
  if (activeId.value === id) return 'text-blue-300'
  if (id === 'A' && aDead.value) return 'text-red-400'
  return 'text-gray-300'
}
</script>

<template>
  <div class="relative mx-auto mt-6 font-mono" :style="{ width: `${W}px`, height: `${H}px` }">
    <!-- node labels -->
    <div v-for="(top, id) in rows" :key="id" class="absolute text-sm transition-all duration-500" :class="labelClass(id)" :style="{ left: '0px', top: `${top + 16}px` }">
      {{ id }}{{ activeId === id ? ' (active)' : '' }}
    </div>

    <!-- A: 1-5, dims when it dies -->
    <div
      v-for="o in [1, 2, 3, 4, 5]"
      :key="`a${o}`"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="[o > 3 ? teal : gray, aDead ? 'opacity-40' : '']"
      :style="{ left: `${OX + (o - 1) * stride}px`, top: `${rows.A}px` }"
    >
      {{ o }}
    </div>

    <!-- B: caught up (1-5); new messages append after its 4,5 -->
    <div
      v-for="o in [1, 2, 3, 4, 5]"
      :key="`b${o}`"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="o > 3 ? teal : gray"
      :style="{ left: `${OX + (o - 1) * stride}px`, top: `${rows.B}px` }"
    >
      {{ o }}
    </div>
    <div
      v-for="m in newOnB"
      :key="`bn${m.label}`"
      v-show="appended"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="newColor[m.label]"
      :style="{ left: `${OX + (m.col - 1) * stride}px`, top: `${rows.B}px` }"
    >
      {{ m.label }}
    </div>

    <!-- C: behind (1-3); new messages take its next offsets -->
    <div
      v-for="o in [1, 2, 3]"
      :key="`c${o}`"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="promotedC ? teal : gray"
      :style="{ left: `${OX + (o - 1) * stride}px`, top: `${rows.C}px` }"
    >
      {{ o }}
    </div>
    <div
      v-for="m in newOnC"
      :key="`cn${m.label}`"
      v-show="appended"
      class="absolute w-14 h-14 flex items-center justify-center border-2 rounded transition-all duration-500"
      :class="newColor[m.label]"
      :style="{ left: `${OX + (m.col - 1) * stride}px`, top: `${rows.C}px` }"
    >
      {{ m.label }}
    </div>

    <!-- relay attempts from C up to B (only 8 actually replicates) -->
    <div
      v-for="a in relayArrows"
      :key="`arr${a.col}`"
      v-show="appended"
      class="absolute text-2xl leading-none text-center"
      :class="a.color"
      :style="{ left: `${OX + (a.col - 1) * stride}px`, width: '56px', top: `${rows.B + 62}px` }"
    >
      ↑
    </div>

    <!-- before the divergence: clients read from B (publishers live there, not A) -->
    <div v-show="!appended" class="absolute text-sm text-teal-300" :style="{ left: `${OX + 6 * stride + 16}px`, top: `${rows.B + 16}px` }">
      ← clients read here (saw 5)
    </div>
    <!-- after: B and C now disagree on offsets 4,5 -->
    <div v-show="appended" class="absolute text-sm text-red-400" :style="{ left: `${OX + 6 * stride + 16}px`, top: `${rows.B + 16}px` }">
      ← clients disagree
    </div>
    <div v-show="appended" class="absolute text-sm text-red-400" :style="{ left: `${OX + 6 * stride + 16}px`, top: `${rows.C + 16}px` }">
      ← clients disagree
    </div>
  </div>
</template>
