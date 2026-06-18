<script setup lang="ts">
// Click-driven illustration of the "build on a log" mental model, ending on a
// race condition: another writer's append lands ahead of ours, and the log's
// order is final. The state machine slides under the cell it's reading, ↑
// pointing up into it. Steps (by $clicks):
//   0 the log tape
//   1 a state machine appears
//   2 filter to one color (its subscription)
//   3 read the leftmost record
//   4 move to the next record
//   5 stage an append (dashed, → beside the SM) while a RIVAL append drops in
//   6 commit: the rival lands first at the tail, our record lands just after it
//   7 read the third record
//   8 read the rival's record (it won the race)
//   9 reach our own record
//   10 snapshot a copy of itself
//   11 the SM advances on toward more of the log; the snapshot stays pinned to
//      its stream position (its own dim ↑)
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicks } = useSlideContext()
const c = computed(() => $clicks.value ?? 0)

// Geometry (px). Cell stride = 56 + 8 gap = 64. Room is left above the tape for
// the incoming rival, and OX leaves room for the (wide) state machine box.
const OX = 56
const W = 840
const H = 320
const smW = 144 // w-36
const smHalf = smW / 2
const smH = 64
const TAPE_TOP = 80
const readHeadTop = TAPE_TOP + 58
const smTop = TAPE_TOP + 88

// The interleaved total order. `highlight` is the one subscription the state
// machine cares about; everything else greys out at step 2. Teal at 0, 4, 6.
const cells = ['teal', 'amber', 'fuchsia', 'sky', 'teal', 'amber', 'teal', 'sky']
const highlight = 'teal'
// A distinct letter per record, so individual cells are easy to call out. Our
// own proposed record stays a ✳ (the rival gets its own letter).
const labels = ['G', 'Q', 'T', 'A', 'M', 'P', 'E', 'W']
const rivalLabel = 'K'
const RIVAL_COL = cells.length // the rival append wins the race, landing first
const OWN_COL = cells.length + 1 // our append lands just after it
const MORE_COL = OWN_COL + 1 // "…" cells: the log keeps going past our record
const rivalLeft = OX + RIVAL_COL * 64
const ownTailLeft = OX + OWN_COL * 64
const snapLeft = ownTailLeft + 28 - smHalf // snapshot stays pinned at our record's column

const palette: Record<string, string> = {
  teal: 'border-teal-400 bg-teal-400/15',
  amber: 'border-amber-400 bg-amber-400/15',
  fuchsia: 'border-fuchsia-400 bg-fuchsia-400/15',
  sky: 'border-sky-400 bg-sky-400/15',
}
const solidTeal = 'border-teal-400 bg-teal-400/15'
const grayed = 'border-gray-600 bg-gray-800/40'
const ring = 'ring-2 ring-teal-300 scale-110'

const showSM = computed(() => c.value >= 1)
const filtered = computed(() => c.value >= 2)
const reading = computed(() => c.value >= 3)
const showAppend = computed(() => c.value >= 5) // our staged/committed record
const committed = computed(() => c.value >= 6)
const showAppendArrow = computed(() => c.value === 5)
const showRival = computed(() => c.value >= 5)
const rivalLanded = computed(() => c.value >= 6)
const duplicated = computed(() => c.value >= 10)
const advanced = computed(() => c.value >= 11)

function cellClass(i: number) {
  if (!filtered.value) return palette[cells[i]]
  return cells[i] === highlight ? palette[highlight] : grayed
}

// Which column the read head sits under at each click (-1 = centered, idle).
const readCol = computed(() => {
  switch (c.value) {
    case 3: return 0
    case 4:
    case 5:
    case 6: return 4 // reading the second record while it stages + commits
    case 7: return 6
    case 8: return RIVAL_COL // the rival's record came first
    case 9:
    case 10: return OWN_COL
    case 11: return MORE_COL + 1 // advance on toward more of the log
    default: return -1
  }
})

const smLeft = computed(() =>
  readCol.value < 0 ? W / 2 - smHalf : OX + readCol.value * 64 + 28 - smHalf,
)
const smRight = computed(() => smLeft.value + smW)
const pendingLeft = computed(() => smRight.value + 64)

// Our appended record: staged beside the SM, or committed at the tail.
const ownLeft = computed(() => (committed.value ? ownTailLeft : pendingLeft.value))
const ownTop = computed(() => (committed.value ? TAPE_TOP : smTop))
</script>

<template>
  <div class="relative mx-auto mt-4 font-mono" :style="{ width: `${W}px`, height: `${H}px` }">
    <!-- the log -->
    <div class="absolute flex gap-2" :style="{ left: `${OX}px`, top: `${TAPE_TOP}px` }">
      <div
        v-for="(kind, i) in cells"
        :key="i"
        class="w-14 h-14 flex items-center justify-center text-xl text-gray-300 border-2 rounded transition-all duration-300"
        :class="[cellClass(i), reading && i === readCol ? ring : '']"
      >
        {{ labels[i] }}
      </div>
    </div>

    <!-- a rival append drops in from above and lands first -->
    <div
      v-if="showRival"
      class="absolute w-14 h-14 flex items-center justify-center text-teal-300 text-2xl leading-none border-2 rounded transition-all duration-500"
      :class="
        rivalLanded
          ? [solidTeal, readCol === RIVAL_COL ? ring : '']
          : 'border-dashed border-teal-400'
      "
      :style="{ left: `${rivalLeft}px`, top: `${rivalLanded ? TAPE_TOP : 0}px` }"
    >
      {{ rivalLabel }}
    </div>
    <div
      v-if="showRival && !rivalLanded"
      class="absolute text-center text-2xl leading-none text-teal-400"
      :style="{ left: `${rivalLeft}px`, width: '56px', top: '56px' }"
    >
      ↓
    </div>

    <!-- our appended record: staged (dashed, beside SM) → committed (in the tape) -->
    <div
      v-if="showAppend"
      class="absolute w-14 h-14 flex items-center justify-center text-teal-300 text-2xl leading-none border-2 rounded transition-all duration-500"
      :class="
        committed
          ? [solidTeal, readCol === OWN_COL ? ring : '']
          : 'border-dashed border-teal-400'
      "
      :style="{ left: `${ownLeft}px`, top: `${ownTop}px` }"
    >
      ✳
    </div>
    <div
      v-if="showAppendArrow"
      class="absolute text-2xl leading-none text-teal-400 text-center rotate-90"
      :style="{ left: `${smRight}px`, width: '64px', top: `${smTop + 18}px` }"
    >
      ↑
    </div>

    <!-- read-head arrow, riding on top of the state machine -->
    <div
      class="absolute text-center text-2xl leading-none text-teal-400 transition-all duration-500"
      :class="{ 'opacity-0': !reading }"
      :style="{ left: `${smLeft}px`, top: `${readHeadTop}px`, width: `${smW}px` }"
    >
      ↑
    </div>

    <!-- the state machine -->
    <div
      class="absolute w-36 h-16 flex items-center justify-center border-2 border-teal-400 rounded-lg bg-teal-400/10 text-teal-200 text-sm text-center transition-all duration-500"
      :style="{ left: `${smLeft}px`, top: `${smTop}px`, opacity: showSM ? 1 : 0 }"
    >
      state machine
    </div>

    <!-- more of the log: the stream keeps going past our record -->
    <template v-if="advanced">
      <div
        class="absolute w-14 h-14 border-2 border-dashed border-gray-600 rounded opacity-50"
        :style="{ left: `${OX + MORE_COL * 64}px`, top: `${TAPE_TOP}px` }"
      />
      <div
        class="absolute w-14 h-14 flex items-center justify-center text-gray-500 text-2xl border-2 border-dashed border-gray-600 rounded opacity-50"
        :style="{ left: `${OX + (MORE_COL + 1) * 64}px`, top: `${TAPE_TOP}px` }"
      >
        …
      </div>
    </template>

    <!-- snapshot copy, pinned at our record's stream position -->
    <div
      v-if="duplicated"
      class="absolute w-36 h-16 flex items-center justify-center border-2 border-teal-400/50 rounded-lg bg-teal-400/5 text-teal-200/70 text-sm transition-all duration-500"
      :style="{ left: `${snapLeft}px`, top: `${smTop + smH + 12}px` }"
    >
      snapshot
    </div>
    <!-- the snapshot's own dim read head, anchored to its stream position -->
    <div
      v-if="advanced"
      class="absolute text-center text-2xl leading-none text-teal-400 opacity-40"
      :style="{ left: `${snapLeft}px`, top: `${smTop + smH - 14}px`, width: `${smW}px` }"
    >
      ↑
    </div>
  </div>
</template>
