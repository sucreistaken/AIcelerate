/**
 * Custom SVG Mind-Map Renderer
 * Radial layout with organic bezier connections, gradient nodes, animated entrance.
 * Replaces Mermaid.js for a Lucidchart-quality visual.
 */

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

interface ParsedNode {
    id: string;
    text: string;
    emoji: string;
    children: ParsedNode[];
    depth: number;
    branchIndex: number; // -1 for root
}

interface LayoutNode extends ParsedNode {
    x: number;
    y: number;
    w: number;
    h: number;
    children: LayoutNode[];
}

// ═══════════════════════════════════════════════════════
//  Palette
// ═══════════════════════════════════════════════════════

const C = [
    { bg: '#6366f1', hi: '#818cf8', lo: '#4f46e5' }, // 0 Indigo
    { bg: '#0ea5e9', hi: '#38bdf8', lo: '#0284c7' }, // 1 Sky
    { bg: '#14b8a6', hi: '#2dd4bf', lo: '#0d9488' }, // 2 Teal
    { bg: '#f59e0b', hi: '#fbbf24', lo: '#d97706' }, // 3 Amber
    { bg: '#f43f5e', hi: '#fb7185', lo: '#e11d48' }, // 4 Rose
    { bg: '#a855f7', hi: '#c084fc', lo: '#9333ea' }, // 5 Purple
    { bg: '#22c55e', hi: '#4ade80', lo: '#16a34a' }, // 6 Emerald
    { bg: '#ec4899', hi: '#f472b6', lo: '#db2777' }, // 7 Pink
];

const FONT = "'DM Sans',system-ui,-apple-system,sans-serif";

// ═══════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════

const EMOJI_RE = /^([\p{Emoji_Presentation}\p{Extended_Pictographic}])\s*/u;
const EMOJI_FALLBACK = /^([📚❓🎯⚡💡📝🔗✅🔧🎓📖🧠💻🌐🔬📊🎨📋🏗️⭐🚀])\s*/;

function extractEmoji(text: string): { emoji: string; clean: string } {
    const m = text.match(EMOJI_RE) || text.match(EMOJI_FALLBACK);
    return m ? { emoji: m[1], clean: text.slice(m[0].length).trim() } : { emoji: '', clean: text.trim() };
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function f(v: number): string { return v.toFixed(1); }

// ═══════════════════════════════════════════════════════
//  Parser – Mermaid mindmap syntax → tree
// ═══════════════════════════════════════════════════════

function parse(code: string): ParsedNode {
    const lines = code.split('\n');
    let si = 0;
    if (lines[0]?.trim().toLowerCase() === 'mindmap') si = 1;

    // Locate root
    let rootText = 'Topic', rootIndent = 0;
    for (let i = si; i < lines.length; i++) {
        const m = lines[i].match(/root\(\((.+?)\)\)/);
        if (m) { rootText = m[1]; rootIndent = lines[i].search(/\S/); si = i + 1; break; }
    }

    const { emoji, clean } = extractEmoji(rootText);
    const root: ParsedNode = { id: 'root', text: clean, emoji, children: [], depth: 0, branchIndex: -1 };

    const stack: { node: ParsedNode; indent: number }[] = [{ node: root, indent: rootIndent }];
    let bi = 0;

    for (let i = si; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;
        const indent = line.search(/\S/);
        if (indent < 0) continue;

        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
        const parent = stack[stack.length - 1].node;
        const depth = parent.depth + 1;
        const isBranch = depth === 1;
        const { emoji: em, clean: cl } = extractEmoji(trimmed);

        const node: ParsedNode = {
            id: `n${i}`, text: cl, emoji: em, children: [], depth,
            branchIndex: isBranch ? bi : parent.branchIndex,
        };
        if (isBranch) bi++;
        parent.children.push(node);
        stack.push({ node, indent });
    }
    return root;
}

// ═══════════════════════════════════════════════════════
//  Layout – radial positioning
// ═══════════════════════════════════════════════════════

function measure(text: string, emoji: string, depth: number): { w: number; h: number } {
    const fs = depth === 0 ? 16 : depth === 1 ? 13 : 11;
    const display = emoji ? `${emoji}  ${text}` : text;
    const tw = display.length * fs * 0.52;
    const px = depth === 0 ? 40 : depth === 1 ? 26 : 20;
    const py = depth === 0 ? 18 : depth === 1 ? 13 : 10;
    return {
        w: Math.min(Math.max(tw + px * 2, depth === 0 ? 160 : depth === 1 ? 110 : 80), 250),
        h: fs + py * 2,
    };
}

function subtreeSize(node: ParsedNode): number {
    return 1 + node.children.reduce((sum, c) => sum + subtreeSize(c), 0);
}

function layout(root: ParsedNode): LayoutNode {
    const BASE = [0, 320, 215, 175]; // generous base distances

    function go(node: ParsedNode, x: number, y: number, angle: number): LayoutNode {
        const sz = measure(node.text, node.emoji, node.depth);
        const kids: LayoutNode[] = [];
        const nc = node.children.length;

        if (nc > 0) {
            const di = Math.min(node.depth + 1, 3);
            const dist = Math.max(BASE[di] || 140, (BASE[di] || 140) + Math.max(0, nc - 4) * 18);

            if (node.depth === 0) {
                // Weighted angular allocation: bigger subtrees get more space
                const weights = node.children.map(c => subtreeSize(c));
                const total = weights.reduce((a, b) => a + b, 0);
                let cur = -Math.PI / 2; // start from top
                for (let i = 0; i < nc; i++) {
                    const eq = 1 / nc;
                    const wt = weights[i] / total;
                    const frac = eq * 0.35 + wt * 0.65; // blend equal + weighted
                    const slice = frac * 2 * Math.PI;
                    const a = cur + slice / 2;
                    kids.push(go(node.children[i], x + dist * Math.cos(a), y + dist * Math.sin(a), a));
                    cur += slice;
                }
            } else {
                // Branch → fan out with generous spread
                const spread = Math.min(Math.PI * 0.75, nc * 0.40);
                for (let i = 0; i < nc; i++) {
                    const t = nc === 1 ? 0 : (i / (nc - 1)) - 0.5;
                    const a = angle + t * spread;
                    kids.push(go(node.children[i], x + dist * Math.cos(a), y + dist * Math.sin(a), a));
                }
            }
        }
        return { ...node, x, y, w: sz.w, h: sz.h, children: kids };
    }
    return go(root, 0, 0, 0);
}

function flat(node: LayoutNode): LayoutNode[] {
    return [node, ...node.children.flatMap(flat)];
}

/** Push overlapping nodes apart iteratively. Root stays fixed. */
function resolveOverlaps(nodes: LayoutNode[]): void {
    const gap = 14;
    for (let iter = 0; iter < 50; iter++) {
        let moved = false;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const ox = (a.w + b.w) / 2 + gap - Math.abs(a.x - b.x);
                const oy = (a.h + b.h) / 2 + gap - Math.abs(a.y - b.y);
                if (ox > 0 && oy > 0) {
                    let dx = b.x - a.x, dy = b.y - a.y;
                    if (!dx && !dy) dx = 1;
                    const len = Math.hypot(dx, dy) || 1;
                    const push = Math.min(ox, oy) * 0.3;
                    // Deeper nodes move more, root doesn't move
                    const wA = a.depth === 0 ? 0 : a.depth;
                    const wB = b.depth === 0 ? 0 : b.depth;
                    const tw = (wA + wB) || 1;
                    a.x -= (dx / len) * push * (wA / tw);
                    a.y -= (dy / len) * push * (wA / tw);
                    b.x += (dx / len) * push * (wB / tw);
                    b.y += (dy / len) * push * (wB / tw);
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }
}

// ═══════════════════════════════════════════════════════
//  Geometry – edge-points & bezier curves
// ═══════════════════════════════════════════════════════

function edge(cx: number, cy: number, w: number, h: number, tx: number, ty: number): [number, number] {
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const s = Math.min(
        Math.abs(dx) > 0 ? (w / 2) / Math.abs(dx) : 1e9,
        Math.abs(dy) > 0 ? (h / 2) / Math.abs(dy) : 1e9,
    );
    return [cx + dx * s, cy + dy * s];
}

function curve(p: LayoutNode, c: LayoutNode): string {
    const [sx, sy] = edge(p.x, p.y, p.w, p.h, c.x, c.y);
    const [ex, ey] = edge(c.x, c.y, c.w, c.h, p.x, p.y);
    const dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy);
    if (len < 1) return `M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}`;

    // Perpendicular offset → organic S-curve
    const nx = -dy / len, ny = dx / len, cv = len * 0.14;
    return `M${f(sx)} ${f(sy)} C${f(sx + dx * .35 + nx * cv)} ${f(sy + dy * .35 + ny * cv)},${f(sx + dx * .65 - nx * cv * .5)} ${f(sy + dy * .65 - ny * cv * .5)},${f(ex)} ${f(ey)}`;
}

// ═══════════════════════════════════════════════════════
//  SVG generation
// ═══════════════════════════════════════════════════════

function defs(): string {
    let d = '';
    C.forEach((c, i) => {
        d += `<linearGradient id="mg${i}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${c.hi}" stop-opacity=".92"/><stop offset="100%" stop-color="${c.bg}"/>
</linearGradient>
<filter id="ms${i}" x="-20%" y="-15%" width="140%" height="150%">
<feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="${c.bg}" flood-opacity=".28"/>
</filter>`;
    });
    d += `<linearGradient id="mgR" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${C[0].hi}" stop-opacity=".92"/><stop offset="100%" stop-color="${C[0].bg}"/>
</linearGradient>
<filter id="msR" x="-40%" y="-40%" width="180%" height="180%">
<feGaussianBlur in="SourceAlpha" stdDeviation="14" result="b"/>
<feFlood flood-color="${C[0].bg}" flood-opacity=".35" result="c"/>
<feComposite in="c" in2="b" operator="in" result="g"/>
<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;
    return `<defs>${d}</defs>`;
}

function connections(root: LayoutNode, anim: boolean): string {
    let s = '', idx = 0;
    function walk(p: LayoutNode) {
        for (const ch of p.children) {
            const bi = (ch.branchIndex < 0 ? 0 : ch.branchIndex) % C.length;
            const d = curve(p, ch);
            const sw = ch.depth === 1 ? 3 : 2;
            let a = '';
            if (anim) {
                const del = Math.min(.04 * idx, 1.5);
                a = ` stroke-dasharray="1000" stroke-dashoffset="1000" class="mm-anim-conn" style="animation:mm-line-draw .7s ${del.toFixed(2)}s ease-out forwards"`;
            }
            s += `<path d="${d}" stroke="${C[bi].bg}" stroke-width="${sw}" stroke-opacity=".6" stroke-linecap="round" fill="none"${a}/>`;
            idx++; walk(ch);
        }
    }
    walk(root);
    return s;
}

function nodes(root: LayoutNode, anim: boolean): string {
    let s = '', idx = 0;
    function walk(nd: LayoutNode) {
        const isR = nd.depth === 0;
        const bi = (nd.branchIndex < 0 ? 0 : nd.branchIndex) % C.length;
        const display = nd.emoji ? `${nd.emoji} ${nd.text}` : nd.text;
        const fs = isR ? 16 : nd.depth === 1 ? 13 : 11;
        const fw = isR ? 800 : nd.depth === 1 ? 600 : 500;
        const rx = isR ? 22 : nd.depth === 1 ? 16 : 12;
        const x = nd.x - nd.w / 2, y = nd.y - nd.h / 2;
        const gid = isR ? 'mgR' : `mg${bi}`;
        const fid = isR ? 'msR' : `ms${bi}`;
        const sk = isR ? 'rgba(99,102,241,.35)' : C[bi].lo;
        const sw = isR ? 2.5 : 1;
        const so = isR ? 1 : .15;

        let st = '';
        if (anim) {
            if (isR) {
                st = ' style="animation:mm-node-entrance .6s cubic-bezier(.34,1.56,.64,1) both,mm-root-breathe 3.5s .6s ease-in-out infinite;transform-box:fill-box;transform-origin:center"';
            } else {
                const del = Math.min(.06 * idx + .12 * Math.max(nd.branchIndex, 0), 2);
                st = ` style="animation:mm-node-entrance .5s ${del.toFixed(2)}s cubic-bezier(.34,1.56,.64,1) both;transform-box:fill-box;transform-origin:center"`;
            }
        } else if (isR) {
            st = ' style="animation:mm-root-breathe 3.5s ease-in-out infinite"';
        }

        s += `<g class="mindmap-node" data-node-name="${esc(nd.text)}" cursor="pointer">`;
        s += `<rect x="${f(x)}" y="${f(y)}" width="${f(nd.w)}" height="${f(nd.h)}" rx="${rx}" ry="${rx}" fill="url(#${gid})" filter="url(#${fid})" stroke="${sk}" stroke-width="${sw}" stroke-opacity="${so}"${st}/>`;
        s += `<text x="${f(nd.x)}" y="${f(nd.y + fs * .35)}" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="${fs}" font-weight="${fw}" style="text-shadow:0 1px 3px rgba(0,0,0,.25);pointer-events:none${isR ? ';letter-spacing:-.02em' : ''}">${esc(display)}</text>`;
        s += '</g>';
        idx++;
        for (const ch of nd.children) walk(ch);
    }
    walk(root);
    return s;
}

// ═══════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════

export function renderMindMapSVG(
    code: string,
    options?: { animate?: boolean },
): { svg: string; nodeNames: string[] } {
    const tree = parse(code);
    const root = layout(tree);
    const all = flat(root);
    resolveOverlaps(all); // push overlapping nodes apart
    const anim = options?.animate ?? true;

    // Bounding box
    const pad = 100;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const nd of all) {
        x1 = Math.min(x1, nd.x - nd.w / 2);
        y1 = Math.min(y1, nd.y - nd.h / 2);
        x2 = Math.max(x2, nd.x + nd.w / 2);
        y2 = Math.max(y2, nd.y + nd.h / 2);
    }
    x1 -= pad; y1 -= pad; x2 += pad; y2 += pad;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x1)} ${f(y1)} ${f(x2 - x1)} ${f(y2 - y1)}" style="max-width:100%;height:auto;min-width:800px;overflow:visible">
${defs()}
<g class="mm-connections">${connections(root, anim)}</g>
<g class="mm-nodes">${nodes(root, anim)}</g>
</svg>`;

    const nodeNames = all.filter(nd => nd.text.length > 1).map(nd => nd.text);
    return { svg, nodeNames };
}
