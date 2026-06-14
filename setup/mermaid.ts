import { defineMermaidSetup } from '@slidev/types'
// Import the *same* mermaid singleton instance Slidev renders with, so that
// registering the ELK layout loader here affects the renderer.
import mermaid from 'mermaid/dist/mermaid.esm.mjs'
import elkLayouts from '@mermaid-js/layout-elk'

// Register once at module load. ELK gives us the layered, model-ordered layout
// the diagrams were designed around (ported from the reveal.js deck).
mermaid.registerLayoutLoaders(elkLayouts)

export default defineMermaidSetup(() => {
  return {
    layout: 'elk',
    elk: {
      // dpatti: It's not clear which of these are actually working; the
      // mermaid elk integration seems to be questionable.
      cycleBreakingStrategy: 'MODEL_ORDER',
      considerModelOrder: 'PREFER_NODES',
      forceNodeModelOrder: true,
    },
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    // Slidev renders mermaid into a Shadow DOM, so page-level CSS can't reach
    // the SVG. Anything the reveal deck did with global CSS for these diagrams
    // has to live in `themeCSS` (injected inside the SVG) instead.
    themeCSS: `
      .edge-pattern-solid { stroke-width: 2px; }
      .edge-pattern-dotted { stroke-width: 2px; }
      [id*="box"] > rect, [id*="box"] > .basic { stroke: #bf79db; stroke-width: 2px; }
      .disk .nodeLabel { display: inline-block; min-width: 40px; }
      .primary .nodeLabel { font-weight: bold; }
      .primary > rect, .primary > .basic { stroke-width: 4px; }
    `,
    themeVariables: {
      darkMode: true,
      background: '#272822',

      primaryColor: '#272822',
      primaryTextColor: '#ddd',
      primaryBorderColor: '#eee',
      lineColor: '#eee',

      secondaryColor: '#272822',
      secondaryBorderColor: '#ddd',

      tertiaryColor: '#272822',

      clusterBorder: '#666',
      edgeLabelBackground: '#272822',
      fontSize: '24px',
    },
  }
})
