<script setup lang="ts">
// Click-through of node failure + failover, built on AnimatedMermaid's `frames`
// mode. Each node renders in one of four modes; only its classes/edges change:
//   0 healthy cluster (node-1 is the active sequencer)
//   1 node-2 goes offline
//   2 node-2 recovers, node-1 (the active!) goes offline
//   3 node-3 is promoted to active
//   4 reset, but node-1 and node-3 are both active at once (split brain)
// Connections fail over to a healthy node; the old path stays as a dim line.
type Role = 'active' | 'replica' | 'promoted'
type Spec = { role: Role; offline?: boolean }

const faultEdges: Record<number, [string, string, string]> = {
  1: ['e2', 'e3', 'e4'],
  2: ['e8', 'e9', 'e10'],
  3: ['e11', 'e12', 'e13'],
}

// Inner nodes/edges are styled by role. When `offline`, the live (non-inactive)
// parts turn red (border + fill); dim parts stay dim. The subgraph box gets a
// red border separately (see faultGraph).
function faultNode(n: number, role: Role, offline?: boolean) {
  const blue = role === 'active' || role === 'promoted'
  let inj = blue ? 'core' : 'inactive'
  let seq = blue ? 'primary' : 'inactive'
  let pub = blue ? 'inactive' : 'core' // the active writer's publishers are idle
  let dsk = 'core'
  const [a, b, d] = faultEdges[n]
  const fwdArrow = blue ? '-->' : '-.->'
  let fwdClass: string | null = role === 'promoted' ? 'active-edge' : role === 'active' ? null : 'inactive-edge'
  const dpArrow = pub === 'core' ? '-->' : '-.->'
  let dpClass: string | null = pub === 'core' ? null : 'inactive-edge'

  if (offline) {
    const red = (cls: string) => (cls === 'inactive' ? 'inactive' : 'down')
    inj = red(inj)
    seq = red(seq)
    pub = red(pub)
    dsk = 'down'
    fwdClass = fwdClass === 'inactive-edge' ? 'inactive-edge' : 'offline-edge'
    dpClass = dpClass === 'inactive-edge' ? 'inactive-edge' : 'offline-edge'
  }

  const lines = [
    `    subgraph node-${n} [" "]`,
    `      injectors-${n}:::${inj}@{ shape: st-rect, label: "injectors" }`,
    `      sequencer-${n}:::${seq}@{ shape: rect, label: "sequencer-${n}" }`,
    `      publishers-${n}:::${pub}@{ shape: st-rect, label: "publishers" }`,
    `      disk-${n}:::disk@{ shape: cyl, label: " " }`,
    `      class disk-${n} ${dsk}`,
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
    .map((n) => `  style node-${n} stroke:#f87171,stroke-width:2px`)
  const readPub = spec[2].offline ? 'publishers-3' : 'publishers-2'
  // A promoted node-3 becomes the writer, so its publishers go idle and the
  // consumers it served move to node-2.
  const tailPub = spec[3].role === 'promoted' ? 'publishers-2' : 'publishers-3'

  const conns = [
    `  ${readPub} --> producers & consumers-1`,
    `  ${tailPub} --> consumers-2`,
    '  publishers-1 ~~~ producers',
  ]
  const dimLines: string[] = []
  const dimIds: string[] = []

  // Producer writes: a line to node-1 always, and to node-3 once it's promoted.
  // Each is solid when that node is a live (active + healthy) writer, dim
  // otherwise — so a downed/superseded writer keeps a faded line, and in the
  // split brain both live writers get a solid one.
  const live = (n: number) =>
    (spec[n].role === 'active' || spec[n].role === 'promoted') && !spec[n].offline
  const writeTo = spec[3].role === 'promoted' ? [1, 3] : [1]
  let w = 0
  for (const n of writeTo) {
    if (live(n)) {
      conns.push(`  producers --> injectors-${n}`)
    } else {
      const id = `ew${++w}`
      dimLines.push(`  producers ${id}@--> injectors-${n}`)
      dimIds.push(id)
    }
  }

  // Reads fail over to a healthy node; the old path stays as a dim dashed line.
  const oldLine = (from: string, id: string, to: string) => {
    dimLines.push(`  ${from} ${id}@-.-> ${to}`)
    dimIds.push(id)
  }
  if (readPub !== 'publishers-2') {
    oldLine('publishers-2', 'eo2', 'producers')
    oldLine('publishers-2', 'eo3', 'consumers-1')
  }
  if (tailPub !== 'publishers-3') oldLine('publishers-3', 'eo4', 'consumers-2')
  if (dimIds.length) dimLines.push(`  class ${dimIds.join(',')} dead-edge`)

  return [
    'graph LR',
    '  classDef inactive-edge opacity:0.2',
    '  classDef dead-edge stroke:#f87171,opacity:0.2',
    '  classDef active-edge stroke:#60a5fa,stroke-width:2px',
    '  classDef net-edge stroke:#fb923c,stroke-width:2px',
    '  classDef offline-edge stroke:#f87171,stroke-width:2px',
    '  producers:::client@{ shape: st-rect, label: "clients" }',
    '  consumers-1:::client@{ shape: st-rect, label: "clients" }',
    '  consumers-2:::client@{ shape: st-rect, label: "clients" }',
    '  subgraph aria [" "]',
    faultNode(1, spec[1].role, spec[1].offline),
    faultNode(2, spec[2].role, spec[2].offline),
    faultNode(3, spec[3].role, spec[3].offline),
    '  end',
    '  style aria fill:none,stroke:none',
    ...offlineBoxes,
    ...conns,
    ...dimLines,
    '  network:::net@{ shape: hex, label: "network" }',
    '  network en1@-.- node-1',
    '  network en2@-.- node-2',
    '  network en3@-.- node-3',
    '  class en1,en2,en3 net-edge',
  ].join('\n')
}

// Needs `clicks: 4` on the slide (one fewer than the number of frames).
const faultFrames = [
  faultGraph({ 1: { role: 'active' }, 2: { role: 'replica' }, 3: { role: 'replica' } }),
  faultGraph({ 1: { role: 'active' }, 2: { role: 'replica', offline: true }, 3: { role: 'replica' } }),
  faultGraph({ 1: { role: 'active', offline: true }, 2: { role: 'replica' }, 3: { role: 'replica' } }),
  faultGraph({ 1: { role: 'active', offline: true }, 2: { role: 'replica' }, 3: { role: 'promoted' } }),
  // Reset, but oops — node-1 and node-3 are both active at once (split brain).
  faultGraph({ 1: { role: 'active' }, 2: { role: 'replica' }, 3: { role: 'promoted' } }),
]
</script>

<template>
  <!-- Scale on AnimatedMermaid's own root; an extra flex wrapper makes the
       svg (width:100%) collapse to a tiny size inside nested flex. -->
  <AnimatedMermaid :frames="faultFrames" class="transform scale-90 origin-top" />
</template>
