import type { Project, Screen, CanvasElement, ScreenStateType } from '@/types';
import { DEVICE_DIMENSIONS } from '@/types';

type ExportTarget = 'react-tailwind' | 'html-css' | 'nextjs';

// ─── Spatial layout engine ─────────────────────────────────
// Converts pixel-positioned elements into a readable ASCII layout
// that preserves spatial relationships and nesting.

interface LayoutNode {
  element: CanvasElement;
  children: LayoutNode[];
  depth: number;
}

/** Check if element A fully contains element B */
function contains(a: CanvasElement, b: CanvasElement): boolean {
  return (
    b.x >= a.x &&
    b.y >= a.y &&
    b.x + b.width <= a.x + a.width &&
    b.y + b.height <= a.y + a.height
  );
}

/** Build a tree from flat elements based on spatial containment */
function buildLayoutTree(elements: CanvasElement[]): LayoutNode[] {
  // Sort by area descending — larger elements are potential parents
  const sorted = [...elements].sort(
    (a, b) => b.width * b.height - (a.width * a.height)
  );

  const nodes: Map<string, LayoutNode> = new Map();
  sorted.forEach((el) => nodes.set(el.id, { element: el, children: [], depth: 0 }));

  const roots: LayoutNode[] = [];

  for (let i = sorted.length - 1; i >= 0; i--) {
    const child = sorted[i];
    const childNode = nodes.get(child.id)!;
    let placed = false;

    // Find the smallest container that holds this element
    let bestParent: LayoutNode | null = null;
    let bestArea = Infinity;

    for (let j = 0; j < sorted.length; j++) {
      if (i === j) continue;
      const parent = sorted[j];
      const parentArea = parent.width * parent.height;
      if (
        contains(parent, child) &&
        parentArea < bestArea &&
        (parent.type === 'container' || parent.type === 'card' || parent.type === 'bottomsheet')
      ) {
        bestParent = nodes.get(parent.id)!;
        bestArea = parentArea;
        placed = true;
      }
    }

    if (bestParent) {
      childNode.depth = bestParent.depth + 1;
      bestParent.children.push(childNode);
    }

    if (!placed) {
      roots.push(childNode);
    }
  }

  // Sort children by Y then X within each parent
  function sortChildren(nodeList: LayoutNode[]) {
    nodeList.sort((a, b) => a.element.y - b.element.y || a.element.x - b.element.x);
    nodeList.forEach((n) => sortChildren(n.children));
  }
  sortChildren(roots);

  return roots;
}

// ─── ASCII rendering ───────────────────────────────────────

function typeLabel(type: CanvasElement['type']): string {
  switch (type) {
    case 'container': return 'Section';
    case 'heading': return 'Heading';
    case 'body': return 'Text';
    case 'cta': return 'Button';
    case 'textfield': return 'Input';
    case 'image': return 'Image';
    case 'card': return 'Card';
    case 'topnav': return 'Nav';
    case 'tabbar': return 'TabBar';
    case 'bottomsheet': return 'Sheet';
    case 'list': return 'List';
    default: return 'Element';
  }
}

function renderNodeAscii(node: LayoutNode, indent: number): string {
  const pad = '  '.repeat(indent);
  const el = node.element;
  const tag = typeLabel(el.type);
  const lines: string[] = [];

  switch (el.type) {
    case 'container':
    case 'card':
    case 'bottomsheet': {
      const border = el.type === 'card' ? '═' : '─';
      const tl = el.type === 'card' ? '╔' : '┌';
      const tr = el.type === 'card' ? '╗' : '┐';
      const bl = el.type === 'card' ? '╚' : '└';
      const br = el.type === 'card' ? '╝' : '┘';
      const side = el.type === 'card' ? '║' : '│';
      const w = 40;

      if (el.type === 'bottomsheet') {
        lines.push(`${pad}      ──────`);
      }
      lines.push(`${pad}${tl}${border.repeat(w)}${tr}  [${tag}: "${el.label}"]`);

      if (node.children.length > 0) {
        node.children.forEach((child) => {
          lines.push(renderNodeAscii(child, indent + 1));
        });
      } else {
        lines.push(`${pad}${side}${' '.repeat(w)}${side}`);
      }

      lines.push(`${pad}${bl}${border.repeat(w)}${br}`);
      break;
    }

    case 'heading':
      lines.push(`${pad}## ${el.label}`);
      break;

    case 'body':
      lines.push(`${pad}   ${el.label}`);
      break;

    case 'cta':
      lines.push(`${pad}   [ ${el.label} ]`);
      break;

    case 'textfield':
      lines.push(`${pad}   |_ ${el.label} ________________|`);
      break;

    case 'image':
      lines.push(`${pad}   ┌────────────────────────┐`);
      lines.push(`${pad}   │     ╲      ╱           │  [Image: "${el.label}"]`);
      lines.push(`${pad}   │       ╳                │`);
      lines.push(`${pad}   │     ╱      ╲           │`);
      lines.push(`${pad}   └────────────────────────┘`);
      break;

    case 'topnav':
      lines.push(`${pad}   [☰]  ${el.label}  ${'─'.repeat(20)}  [⋯]`);
      break;

    case 'tabbar':
      lines.push(`${pad}   ──────────────────────────────────`);
      lines.push(`${pad}    ${el.label}`);
      break;

    case 'list':
      lines.push(`${pad}   ├─ ${el.label} (item) ──────────┤`);
      lines.push(`${pad}   ├─ ${el.label} (item) ──────────┤`);
      lines.push(`${pad}   ├─ ${el.label} (item) ──────────┤`);
      break;

    default:
      lines.push(`${pad}   [${tag}: ${el.label}]`);
  }

  return lines.join('\n');
}

// ─── Screen state rendering ────────────────────────────────

function renderScreenState(
  screen: Screen,
  state: ScreenStateType,
): string {
  const elements = screen.elements.filter((el) => el.screenState === state);

  if (elements.length === 0) {
    return '  (no elements defined for this state)';
  }

  const tree = buildLayoutTree(elements);
  return tree.map((node) => renderNodeAscii(node, 0)).join('\n\n');
}

function renderAnnotations(screen: Screen, state: ScreenStateType): string {
  const annotated = screen.elements.filter(
    (el) => el.screenState === state && el.annotation
  );
  const tagged = screen.elements.filter(
    (el) => el.screenState === state && el.semanticTag !== 'none'
  );

  if (annotated.length === 0 && tagged.length === 0) return '';

  const lines: string[] = [];
  if (annotated.length > 0) {
    lines.push('**Annotations:**');
    annotated.forEach((el) => {
      lines.push(`- "${el.label}" (${typeLabel(el.type)}): ${el.annotation}`);
    });
  }
  if (tagged.length > 0) {
    lines.push('**Semantic Tags:**');
    tagged.forEach((el) => {
      lines.push(`- "${el.label}" (${typeLabel(el.type)}): [${el.semanticTag}]`);
    });
  }

  return lines.join('\n');
}

// ─── Element inventory (structured, not just ASCII art) ────

function renderElementInventory(
  screen: Screen,
  state: ScreenStateType,
): string {
  const elements = screen.elements
    .filter((el) => el.screenState === state)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (elements.length === 0) return '';

  const lines = ['**Element Inventory:**'];
  elements.forEach((el, i) => {
    let desc = `${i + 1}. **${typeLabel(el.type)}**: "${el.label}"`;
    desc += ` — position: (${Math.round(el.x)}, ${Math.round(el.y)})`;
    desc += `, size: ${Math.round(el.width)}×${Math.round(el.height)}`;
    if (el.semanticTag !== 'none') desc += ` [${el.semanticTag}]`;
    if (el.annotation) desc += ` — _${el.annotation}_`;
    lines.push(desc);
  });

  return lines.join('\n');
}

// ─── Target-specific instructions ──────────────────────────

function getTargetInstructions(target: ExportTarget): string {
  switch (target) {
    case 'react-tailwind':
      return `Generate a complete React + Tailwind CSS application from the blueprint above.
- Use functional components with hooks
- Use Tailwind CSS utility classes for all styling
- Use shadcn/ui components where appropriate
- Handle all screen states (default, empty, error, loading)
- Respect semantic labels (Primary CTA, Trust Signal, etc.) in styling decisions
- Use the element inventory for exact component structure — the ASCII art shows layout only
- Mobile-first, responsive design
- Add ARIA labels and accessibility attributes
- Do not add features not described in the blueprint`;
    case 'html-css':
      return `Generate semantic HTML5 + CSS from the blueprint above.
- Use semantic HTML elements (nav, main, section, article, etc.)
- CSS with custom properties for theming
- Handle all screen states (default, empty, error, loading)
- Respect semantic labels in styling decisions
- Use the element inventory for exact component structure
- Mobile-first, responsive design
- Add ARIA labels and accessibility attributes
- Do not add features not described in the blueprint`;
    case 'nextjs':
      return `Generate a complete Next.js application using App Router from the blueprint above.
- Use Next.js 14 App Router with file-based routing
- Use Tailwind CSS utility classes for all styling
- Use shadcn/ui components where appropriate
- Build navigation routing between all screens
- Handle all screen states (default, empty, error, loading)
- Respect semantic labels (Primary CTA, Trust Signal, etc.) in styling decisions
- Use the element inventory for exact component structure — the ASCII art shows layout only
- Mobile-first, responsive design
- Use Server Components by default, Client Components only when needed
- Add ARIA labels and accessibility attributes
- Do not add features not described in the blueprint`;
  }
}

// ─── Main export ───────────────────────────────────────────

export function generateMarkdown(project: Project, target: ExportTarget): string {
  const dim = DEVICE_DIMENSIONS[project.device];
  const states: ScreenStateType[] = ['default', 'empty', 'error', 'loading'];

  let md = `# ${project.name} — UI Blueprint\n\n`;
  md += `## Device: ${project.device.charAt(0).toUpperCase() + project.device.slice(1)} (${dim.width}×${dim.height}px)\n`;
  if (project.goal) {
    md += `## Goal: ${project.goal}\n`;
  }
  md += '\n---\n\n';

  // Screens
  project.screens.forEach((screen, idx) => {
    md += `### Screen ${idx + 1}: ${screen.name}\n`;
    if (screen.userGoal) {
      md += `**User Goal:** ${screen.userGoal}\n\n`;
    }

    states.forEach((state) => {
      const elems = screen.elements.filter((el) => el.screenState === state);
      if (elems.length === 0 && state !== 'default') return;

      const stateTitle = state.charAt(0).toUpperCase() + state.slice(1);
      md += `**${stateTitle} State:**\n\`\`\`\n`;
      md += renderScreenState(screen, state);
      md += '\n```\n\n';

      // Structured element inventory
      const inventory = renderElementInventory(screen, state);
      if (inventory) {
        md += inventory + '\n\n';
      }

      // Annotations and semantic tags
      const annotations = renderAnnotations(screen, state);
      if (annotations) {
        md += annotations + '\n\n';
      }
    });

    md += '---\n\n';
  });

  // Navigation flow
  if (project.arrows.length > 0) {
    md += '### Navigation Flow:\n';
    project.arrows.forEach((arrow) => {
      const from = project.screens.find((s) => s.id === arrow.fromScreenId);
      const to = project.screens.find((s) => s.id === arrow.toScreenId);
      if (from && to) {
        md += `- ${from.name} → ${to.name}: [Trigger: ${arrow.trigger}]\n`;
      }
    });
    md += '\n---\n\n';
  }

  // Global notes
  md += '### Global Notes:\n';
  md += `- Device target: ${project.device} (${dim.width}×${dim.height})\n`;
  if (project.goal) {
    md += `- Project intent: ${project.goal}\n`;
  }
  md += `- Total screens: ${project.screens.length}\n`;
  md += `- Total navigation paths: ${project.arrows.length}\n`;
  md += '\n---\n\n';

  // Prompt instructions
  md += '## Prompt Instructions for Code Generator:\n';
  md += getTargetInstructions(target);
  md += '\n';

  return md;
}
