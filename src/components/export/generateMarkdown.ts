import type { Project, Screen, CanvasElement, ScreenStateType } from '@/types';
import { DEVICE_DIMENSIONS } from '@/types';

type ExportTarget = 'react-tailwind' | 'html-css' | 'nextjs';

// ─── Spatial layout engine ─────────────────────────────────

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

// ─── Element inventory ─────────────────────────────────────

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

// ─── Component mapping suggestions ─────────────────────────

function getComponentSuggestion(
  type: CanvasElement['type'],
  target: ExportTarget,
  semanticTag: CanvasElement['semanticTag'],
): string {
  if (target === 'html-css') {
    switch (type) {
      case 'container': return '<section>';
      case 'heading': return '<h1>–<h6>';
      case 'body': return '<p>';
      case 'cta': return semanticTag === 'destructive-action' ? '<button class="destructive">' : '<button>';
      case 'textfield': return '<input type="text">';
      case 'image': return '<figure> + <img>';
      case 'card': return '<article>';
      case 'topnav': return '<nav>';
      case 'tabbar': return '<nav role="tablist">';
      case 'bottomsheet': return '<dialog> or <div role="dialog">';
      case 'list': return '<ul> or <ol>';
      default: return '<div>';
    }
  }

  // React + Tailwind / Next.js
  switch (type) {
    case 'container': return 'div with flex/grid layout';
    case 'heading': return 'h1–h6 with text-xl/2xl/3xl';
    case 'body': return 'p with text-sm/base';
    case 'cta': return semanticTag === 'destructive-action'
      ? 'shadcn/ui Button variant="destructive"'
      : 'shadcn/ui Button';
    case 'textfield': return 'shadcn/ui Input';
    case 'image': return 'next/image (Next.js) or <img>';
    case 'card': return 'shadcn/ui Card';
    case 'topnav': return 'shadcn/ui NavigationMenu';
    case 'tabbar': return 'shadcn/ui Tabs';
    case 'bottomsheet': return 'shadcn/ui Sheet or Dialog';
    case 'list': return 'map() with shadcn/ui Separator between items';
    default: return 'div';
  }
}

function renderComponentMap(
  screen: Screen,
  state: ScreenStateType,
  target: ExportTarget,
): string {
  const elements = screen.elements
    .filter((el) => el.screenState === state)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (elements.length === 0) return '';

  const lines = ['**Suggested Components:**'];
  // Deduplicate by type+semantic combo
  const seen = new Set<string>();
  elements.forEach((el) => {
    const key = `${el.type}:${el.semanticTag}`;
    if (seen.has(key)) return;
    seen.add(key);
    const suggestion = getComponentSuggestion(el.type, target, el.semanticTag);
    lines.push(`- ${typeLabel(el.type)} → \`${suggestion}\``);
  });

  return lines.join('\n');
}

// ─── Responsive hints ──────────────────────────────────────

function getResponsiveHints(project: Project): string {
  const dim = DEVICE_DIMENSIONS[project.device];
  const lines = ['**Responsive Breakpoints:**'];

  if (project.device === 'mobile') {
    lines.push(`- Base: ${dim.width}px (mobile — designed for)`);
    lines.push('- sm (640px): Stack → side-by-side where appropriate');
    lines.push('- md (768px): Increase padding, font sizes');
    lines.push('- lg (1024px): Max-width container, centered layout');
  } else if (project.device === 'tablet') {
    lines.push('- Below 768px: Collapse to single-column mobile layout');
    lines.push(`- Base: ${dim.width}px (tablet — designed for)`);
    lines.push('- lg (1024px): Expand grid columns, increase spacing');
  } else {
    lines.push('- Below 640px: Single column, stacked layout');
    lines.push('- md (768px): 2-column layout where applicable');
    lines.push(`- Base: ${dim.width}px (desktop — designed for)`);
  }

  lines.push('');
  lines.push('**Layout Strategy:**');

  // Analyze elements to give specific advice
  const allElements = project.screens.flatMap((s) => s.elements);
  const hasTopnav = allElements.some((el) => el.type === 'topnav');
  const hasTabbar = allElements.some((el) => el.type === 'tabbar');
  const hasBottomsheet = allElements.some((el) => el.type === 'bottomsheet');

  if (hasTopnav) {
    lines.push('- Top nav: Sticky on all breakpoints. Collapse to hamburger menu on mobile.');
  }
  if (hasTabbar) {
    lines.push('- Tab bar: Fixed bottom on mobile. Convert to sidebar tabs on desktop.');
  }
  if (hasBottomsheet) {
    lines.push('- Bottom sheet: Slide up on mobile. Render as side panel or modal on desktop.');
  }

  return lines.join('\n');
}

// ─── JSON element tree ─────────────────────────────────────

interface JsonTreeNode {
  type: string;
  label: string;
  semanticTag?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  annotation?: string;
  children?: JsonTreeNode[];
}

function layoutNodeToJson(node: LayoutNode): JsonTreeNode {
  const el = node.element;
  const result: JsonTreeNode = {
    type: el.type,
    label: el.label,
    position: { x: Math.round(el.x), y: Math.round(el.y) },
    size: { width: Math.round(el.width), height: Math.round(el.height) },
  };
  if (el.semanticTag !== 'none') result.semanticTag = el.semanticTag;
  if (el.annotation) result.annotation = el.annotation;
  if (node.children.length > 0) {
    result.children = node.children.map(layoutNodeToJson);
  }
  return result;
}

function renderJsonTree(
  screen: Screen,
  state: ScreenStateType,
): string {
  const elements = screen.elements.filter((el) => el.screenState === state);
  if (elements.length === 0) return '';

  const tree = buildLayoutTree(elements);
  const jsonNodes = tree.map(layoutNodeToJson);

  return '**JSON Element Tree:**\n```json\n' + JSON.stringify(jsonNodes, null, 2) + '\n```';
}

// ─── Target-specific instructions ──────────────────────────

function getTargetInstructions(target: ExportTarget): string {
  switch (target) {
    case 'react-tailwind':
      return `Generate a complete React + Tailwind CSS application from the blueprint above.
- Use functional components with hooks
- Use Tailwind CSS utility classes for all styling
- Use shadcn/ui components where appropriate (see Suggested Components sections)
- Handle all screen states (default, empty, error, loading)
- Respect semantic labels (Primary CTA, Trust Signal, etc.) in styling decisions
- Use the element inventory for exact component structure — the ASCII art shows layout only
- Use the JSON element tree for precise positioning and nesting
- Follow the responsive breakpoint guidance for adaptive layout
- Mobile-first, responsive design
- Add ARIA labels and accessibility attributes
- Do not add features not described in the blueprint`;
    case 'html-css':
      return `Generate semantic HTML5 + CSS from the blueprint above.
- Use semantic HTML elements (see Suggested Components sections)
- CSS with custom properties for theming
- Handle all screen states (default, empty, error, loading)
- Respect semantic labels in styling decisions
- Use the element inventory for exact component structure
- Use the JSON element tree for precise positioning and nesting
- Follow the responsive breakpoint guidance for adaptive layout
- Mobile-first, responsive design
- Add ARIA labels and accessibility attributes
- Do not add features not described in the blueprint`;
    case 'nextjs':
      return `Generate a complete Next.js application using App Router from the blueprint above.
- Use Next.js 14 App Router with file-based routing
- Use Tailwind CSS utility classes for all styling
- Use shadcn/ui components where appropriate (see Suggested Components sections)
- Build navigation routing between all screens (see Navigation Flow)
- Handle all screen states (default, empty, error, loading)
- Respect semantic labels (Primary CTA, Trust Signal, etc.) in styling decisions
- Use the element inventory for exact component structure — the ASCII art shows layout only
- Use the JSON element tree for precise positioning and nesting
- Follow the responsive breakpoint guidance for adaptive layout
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

  // Responsive hints
  md += getResponsiveHints(project) + '\n\n---\n\n';

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

      // Component mapping suggestions
      const componentMap = renderComponentMap(screen, state, target);
      if (componentMap) {
        md += componentMap + '\n\n';
      }

      // Annotations and semantic tags
      const annotations = renderAnnotations(screen, state);
      if (annotations) {
        md += annotations + '\n\n';
      }

      // JSON element tree
      const jsonTree = renderJsonTree(screen, state);
      if (jsonTree) {
        md += jsonTree + '\n\n';
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
