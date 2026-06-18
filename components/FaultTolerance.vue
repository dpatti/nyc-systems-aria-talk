<script setup lang="ts">
// Click-through of node failure + failover, built on AnimatedMermaid's `frames`
// mode. Each node renders in one of four modes; only its classes/edges change:
//   0 healthy cluster (node-1 is the active sequencer)
//   1 node-2 goes offline
//   2 node-2 recovers, node-1 (the active!) goes offline
//   3 node-3 is promoted to active
type Role = 'active' | 'replica' | 'promoted'
type Spec = { role: Role; offline?: boolean }

const faultEdges: Record<number, [string, string, string]> = {
  1: ['e2', 'e3', 'e4'],
  2: ['e8', 'e9', 'e10'],
  3: ['e11', 'e12', 'e13'],
}

// Inner nodes/edges are styled by role only; `offline` reddens the whole
// subgraph box (see faultGraph), not the contents.
function faultNode(n: number, role: Role) {
  const blue = role === 'active' || role === 'promoted'
  const inj = blue ? 'core' : 'inactive'
  const seq = blue ? 'primary' : 'inactive'
  const pub = n === 1 ? 'inactive' : 'core'
  const [a, b, d] = faultEdges[n]
  const fwdArrow = blue ? '-->' : '-.->'
  const fwdClass = role === 'promoted' ? 'active-edge' : role === 'active' ? null : 'inactive-edge'
  const dpArrow = pub === 'core' ? '-->' : '-.->'
  const dpClass = pub === 'core' ? null : 'inactive-edge'
  const lines = [
    `    subgraph node-${n} [" "]`,
    `      injectors-${n}:::${inj}@{ shape: st-rect, label: "injectors" }`,
    `      sequencer-${n}:::${seq}@{ shape: rect, label: "sequencer-${n}" }`,
    `      publishers-${n}:::${pub}@{ shape: st-rect, label: "publishers" }`,
    `      disk-${n}:::disk@{ shape: cyl, label: " " }`,
    `      class disk-${n} core`,
    `      injectors-${n} ${a}@${fwdArrow} sequencer-${n}`,
    `      sequencer-${n} ${b}@${fwdArrow} disk-${n}`,
    `      disk-${n} ${d}@${dpArrow} publishers-${n}`,
  ]
  if (fwdClass) lines.push(`      class ${a},${b} ${fwdClass}`)
  if (dpClass) lines.push(`      class ${d} ${dpClass}`)
  lines.push('    end')
  return lines.join('\n')
}

function faultGraph(spec: Record<number, Spec>) {
  const offlineBoxes = [1, 2, 3]
    .filter((n) => spec[n].offline)
    .map((n) => `  style node-${n} fill:#7f1d1d,stroke:#f87171,stroke-width:2px`)
  return [
    'graph LR',
    '  classDef inactive-edge opacity:0.2',
    '  classDef active-edge stroke:#60a5fa,stroke-width:2px',
    '  classDef net-edge stroke:#fb923c,stroke-width:2px',
    '  producers:::client@{ shape: st-rect, label: "clients" }',
    '  consumers-1:::client@{ shape: st-rect, label: "clients" }',
    '  consumers-2:::client@{ shape: st-rect, label: "clients" }',
    '  subgraph aria [" "]',
    faultNode(1, spec[1].role),
    faultNode(2, spec[2].role),
    faultNode(3, spec[3].role),
    '  end',
    '  style aria fill:none,stroke:none',
    ...offlineBoxes,
    '  producers e1@--> injectors-1',
    '  publishers-1 ~~~ producers',
    '  publishers-2 --> producers & consumers-1',
    '  publishers-3 --> consumers-2',
    '  network:::net@{ shape: hex, label: "network" }',
    '  network en2@-.-> node-2',
    '  network en3@-.-> node-3',
    '  node-1 en1@-.-> network',
    '  class en1,en2,en3 net-edge',
  ].join('\n')
}

// Needs `clicks: 3` on the slide (one fewer than the number of frames).
const faultFrames = [
  faultGraph({ 1: { role: 'active' }, 2: { role: 'replica' }, 3: { role: 'replica' } }),
  faultGraph({ 1: { role: 'active' }, 2: { role: 'replica', offline: true }, 3: { role: 'replica' } }),
  faultGraph({ 1: { role: 'active', offline: true }, 2: { role: 'replica' }, 3: { role: 'replica' } }),
  faultGraph({ 1: { role: 'active', offline: true }, 2: { role: 'replica' }, 3: { role: 'promoted' } }),
]
</script>

<template>
  <!-- Scale on AnimatedMermaid's own root; an extra flex wrapper makes the
       svg (width:100%) collapse to a tiny size inside nested flex. -->
  <AnimatedMermaid :frames="faultFrames" class="transform scale-90 origin-top" />
</template>
