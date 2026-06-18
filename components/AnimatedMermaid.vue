<script setup lang="ts">
// Renders a mermaid diagram and animates its edges one-per-click, in the order
// the edge ids (e1, e2, ...) first appear in `code`. The diagram is declared
// once by the caller; we just append `eN@{ animate: true }` for the revealed
// edges and re-render. Edges are always declared, so layout is stable.
import { ref, watch, onMounted, onUnmounted, useId } from 'vue'
import { useSlideContext } from '@slidev/client'
import mermaid from 'mermaid/dist/mermaid.esm.mjs'
// Importing the setup module registers the ELK loader on this same singleton;
// initializing here applies our theme even if Slidev hasn't rendered a mermaid
// block yet (otherwise the first render on a fresh load is unstyled).
import { mermaidConfig } from '../setup/mermaid'

mermaid.initialize(mermaidConfig)

// `steps` groups edge ids per click; only the current group animates (previous
// ones turn off), so each click focuses on one segment. Without `steps`, edges
// reveal one-per-click cumulatively in the order their ids appear.
// `frames`: render a distinct full diagram per click (frames[$clicks]) — for
// step-throughs that restyle nodes, not just animate edges. Takes precedence
// over `code`/`steps`.
const props = defineProps<{ code?: string; steps?: string[][]; frames?: string[] }>()
const { $clicks } = useSlideContext()
const el = ref<HTMLDivElement>()
// Unique per instance: presenter mode mounts several AnimatedMermaids at once,
// and a shared render id collides on mermaid's singleton (missing/overlaid
// renders). useId() namespaces this instance; n disambiguates re-renders.
const uid = useId()
let n = 0

// Off-flow host for mermaid's temporary measurement <svg>. Without a container,
// mermaid appends it to <body>, which flashes and jitters the page on re-render
// (notably when [click] notes add re-renders). Fixed + hidden keeps it out of
// layout; staying outside the scaled slide keeps getBBox measurements correct
// (using `el` instead would mis-size fonts).
let host: HTMLDivElement | undefined

const DIM = '#6b7280' // gray-500 — non-animated edges while a segment is active

const edges = [...new Set([...(props.code ?? '').matchAll(/\b(e\d+)@/g)].map((m) => m[1]))]
// Tell the caller how many clicks this diagram needs.
defineExpose({ clicks: props.frames ? props.frames.length - 1 : (props.steps?.length ?? edges.length) })

// While any edge is animating, gray out the rest so the active segment stands
// out. Arrowhead markers are shared across edges, so we clone a dim variant and
// repoint the dimmed edges at it (CSS alone can't reach a single edge's marker).
function dimOthers(root: HTMLElement) {
  const animated = new Set(root.querySelectorAll('.edge-animation-fast, .edge-animation-slow'))
  if (!animated.size) return // nothing animating (e.g. click 0): leave defaults
  root.querySelectorAll<SVGPathElement>('.flowchart-link').forEach((path) => {
    if (animated.has(path)) return
    path.style.stroke = DIM
    const id = path.getAttribute('marker-end')?.match(/#([^)]+)\)/)?.[1]
    if (!id) return
    const dimId = `${id}-dim`
    if (!root.querySelector(`#${CSS.escape(dimId)}`)) {
      const marker = root.querySelector(`#${CSS.escape(id)}`)
      if (!marker) return
      const clone = marker.cloneNode(true) as Element
      clone.setAttribute('id', dimId)
      clone.querySelectorAll('path, polygon').forEach((p) => {
        p.setAttribute('fill', DIM)
        p.setAttribute('stroke', DIM)
      })
      marker.parentNode?.appendChild(clone)
    }
    path.setAttribute('marker-end', `url(#${dimId})`)
  })
}

async function render() {
  const c = $clicks.value ?? 0
  let code: string
  if (props.frames) {
    code = props.frames[Math.min(c, props.frames.length - 1)] ?? props.frames[0]
  } else {
    const active = props.steps ? (props.steps[c - 1] ?? []) : edges.slice(0, c)
    const anim = active.map((e) => `${e}@{ animate: true }`).join('\n')
    code = `${props.code ?? ''}\n${anim}`
  }
  const { svg } = await mermaid.render(`mermaid-${uid}-${n++}`, code, host)
  if (el.value) {
    el.value.innerHTML = svg
    dimOthers(el.value)
  }
}

onMounted(() => {
  host = document.createElement('div')
  host.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none'
  document.body.appendChild(host)
  render()
})
onUnmounted(() => host?.remove())
watch(() => $clicks.value, render)
</script>

<template>
  <div ref="el" class="flex justify-center" />
</template>
