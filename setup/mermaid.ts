import { defineMermaidSetup } from '@slidev/types'
// Import the *same* mermaid singleton instance Slidev renders with, so that
// registering the ELK layout loader here affects the renderer.
import mermaid from 'mermaid/dist/mermaid.esm.mjs'
import elkLayouts from '@mermaid-js/layout-elk'

// Register once at module load. ELK gives us the layered, model-ordered layout
// the diagrams were designed around (ported from the reveal.js deck).
mermaid.registerLayoutLoaders(elkLayouts)

// Brighter accents pulled from the LogTape components (Tailwind 400/300 shades).
// Higher contrast than a muted terminal palette, which reads better projected.
const green = { base: '#4ade80', fill: '#4ade801f' } // green-400 + ~12% tint
const blue = '#60a5fa' // blue-400

// Deck-specific tones.
const nodeBg = '#272822' // node fill — reads as a dark card on the ~#121212 slide
const clusterBkg = '#1b1b1b' // muted panel, just above the ~#121212 slide bg

// Semantic roles.
const client = green // clients (`:::client`): producers/consumers
const special = blue // core Aria nodes (`:::core`, `:::primary`, `box*`)
const specialFill = '#60a5fa1f' // blue-400 ~12% tint
const ink = '#e5e7eb' // edges, node borders, text (bright neutral)
const dim = '#6b7280'
const net = '#fb923c' // orange-400 — network node + replication (distinct from green/blue)
const netFill = '#fb923c1f'

// Exported so AnimatedMermaid can initialize the singleton itself. Slidev only
// applies this config when *it* renders a mermaid block, which may not have
// happened yet on a fresh load — so a component rendering directly would get
// unstyled output until the first navigation.
export const mermaidConfig = {
  layout: 'elk',
  elk: {
    // dpatti: It's not clear which of these are actually working; the
    // mermaid elk integration seems to be questionable.
    // nodePlacementStrategy: 'BRANDES_KOEPF',
    // nodePlacementAlignment: 'NONE',
    cycleBreakingStrategy: 'GREEDY_MODEL_ORDER',
    considerModelOrder: 'PREFER_NODES',
    forceNodeModelOrder: true,
  },
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  themeCSS: `
    .edge-pattern-solid { stroke-width: 2px; }
    .edge-pattern-dotted { stroke-width: 2px; }
    [id*="box"] > rect, [id*="box"] > .basic { stroke: ${special}; stroke-width: 2px; }
    .disk .nodeLabel { display: inline-block; min-width: 40px; }
    .primary .nodeLabel { font-weight: bold; }
    .core rect, .core .basic, .core path, .core polygon,
    .primary rect, .primary .basic, .primary path, .primary polygon { stroke: ${special}; fill: ${specialFill}; }
    .client rect, .client .basic, .client path, .client polygon { stroke: ${client.base}; fill: ${client.fill}; }
    .net rect, .net .basic, .net path, .net polygon { stroke: ${net}; fill: ${netFill}; }
    .inactive { opacity: 0.3; }
  `,
  themeVariables: {
    darkMode: true,
    background: nodeBg,

    primaryColor: nodeBg,
    primaryTextColor: ink,
    primaryBorderColor: ink,
    lineColor: ink,

    secondaryColor: nodeBg,
    secondaryBorderColor: ink,

    tertiaryColor: nodeBg,

    clusterBkg,
    clusterBorder: '#9ca3af',
    edgeLabelBackground: nodeBg,
    fontSize: '24px',
  },
}

export default defineMermaidSetup(() => mermaidConfig)
