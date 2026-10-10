/* The Circle Companion v2: a small glass circle that lives in the corner of the app.
   Shared by the Budget Manager and the Goal Manager. No libraries. Respects "reduce motion".
   Look: clear glass body, light-refracting rim, two slow orbit rings, a soft aura. The face, limbs and outline
   use "adaptive ink": dark on light screens, white on dark screens (read from the app's real text colour).
   API:  const c = GCompanion.create(element, { pos: 'header' | 'float', onTap })
         c.mood('calm' | 'happy' | 'proud' | 'curious' | 'concerned' | 'thoughtful' | 'reassuring' | 'content' | 'sleepy' | 'surprised')
         c.pose('cheer' | 'notes' | 'insight' | 'point' | 'heart' | 'wave' | 'laptop' | 'coffee', ms)
         c.say(text, ms) ; c.sayQuiet(text)   // quiet = at most four lines a day
         c.setPos('header' | 'float') ; c.resetPos() ; c.show(bool) ; c.wake()
   Floating mode can be dragged anywhere; it settles against the nearest side and remembers the place.
   Older names still work: setMood, perform, respondToBudgetEvent, respondToMilestone, reset (also at window.CircleCompanion). */
(function (root) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const still = () => reduced() || !!(document.body && document.body.classList.contains('still')) || document.documentElement.classList.contains('lite');

    // ---- what each mood looks like (numbers are blended smoothly from one mood to the next)
    //  eo = open eyes, eh = happy arcs, ec = closed arcs, ry = eye height, gx/gy = where it looks, mc = mouth curve, mw = mouth width, mx = mouth shift
    //  sc = size, tilt = degrees, lift = up/down, glow = light, brow = worried brows
    const BASE = { eo: 1, eh: 0, ec: 0, ry: 3.4, gx: 0, gy: 0, mc: 0.25, mw: 8, mx: 0, mo: 0, sc: 1, tilt: 0, lift: 0, glow: 0.55, brow: 0 };
    const MOODS = {
        calm: {},
        happy: { eo: 0, eh: 1, mc: 0.95, mw: 11, lift: -2, glow: 0.85 },
        proud: { eo: 0, eh: 1, mc: 0.75, mw: 10, lift: -4, sc: 1.04, glow: 0.9 },
        curious: { ry: 4, gx: 1, gy: -0.6, mc: 0.1, mw: 5, tilt: 6, glow: 0.65 },
        concerned: { ry: 3, gy: 0.8, mc: -0.45, mw: 7, sc: 0.94, tilt: -4, glow: 0.35, brow: 1 },
        thoughtful: { gx: -1, gy: -0.9, mc: 0, mw: 6, mx: 3, tilt: 5, glow: 0.5 },
        reassuring: { eo: 1, eh: 0, mc: 0.55, mw: 9, sc: 1.02, glow: 0.7 },
        content: { eo: 0, ec: 1, mc: 0.45, mw: 8, glow: 0.6 },
        sleepy: { eo: 0, ec: 1, mc: 0.05, mw: 4, sc: 0.97, tilt: 8, glow: 0.25 },
        surprised: { ry: 4.6, mc: 0, mw: 3, mo: 1, lift: -3, glow: 0.8 }
    };
    // ---- limbs: hand targets (x, y) for the left and right arm, 0 = tucked in
    const POSES = {
        none: { L: null, R: null, props: {} },
        cheer: { L: [-40, -34], R: [40, -34], props: { sparks: 1 }, mood: 'happy' },
        notes: { L: [-14, 33], R: [16, 31], props: { book: 1, pen: 1 }, mood: 'calm' },
        insight: { L: null, R: [35, -14], props: { mag: 1 }, mood: 'curious' },
        point: { L: null, R: [43, -4], props: { chart: 1 }, mood: 'calm' },
        heart: { L: [-13, 31], R: [13, 31], props: { heart: 1 }, mood: 'happy' },
        wave: { L: null, R: [40, -30], props: {}, mood: 'happy', wag: 'R' },
        laptop: { L: [-13, 36], R: [13, 36], props: { laptop: 1 }, mood: 'thoughtful', type: 1 },
        coffee: { L: null, R: [31, 27], props: { coffee: 1 }, mood: 'content' }
    };
    // names used by the older prototype map onto the moods above
    const ALIAS = { thinking: 'thoughtful', concern: 'concerned', reassured: 'reassuring', pride: 'proud', surprise: 'surprised', sadness: 'concerned' };
    const ACTION = { rest: 'calm', listen: 'curious', analyse: 'thoughtful', reassure: 'reassuring', celebrate: 'proud', concern: 'concerned', surprise: 'surprised', sad: 'concerned' };
    const EVENT = { approaching: 'thoughtful', over: 'concerned', saved: 'happy', goal: 'proud', unusual: 'surprised', 'savings-added': 'happy', 'savings-withdrawn': 'thoughtful' };
    const SH = { L: [-28, 6], R: [28, 6] };           // shoulders
    const INK = 'currentColor';

    function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---- adaptive ink: read the app's real text colour; light text means a dark screen, so the ink turns white
    function rgbOf(v) {
        v = (v || '').trim(); let m = v.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i); if (m) return [+m[1], +m[2], +m[3]];
        m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return null; let s = m[1]; if (s.length === 3) s = s.split('').map(c => c + c).join('');
        return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    }
    function updateInk() {
        try {
            const r = document.documentElement, cs = getComputedStyle(r);
            const c = rgbOf(cs.getPropertyValue('--text-main')) || rgbOf(document.body ? getComputedStyle(document.body).color : '') || rgbOf(cs.color);
            if (!c) return; r.setAttribute('data-gc-ink', (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 > 0.58 ? 'white' : 'dark');
        } catch (e) {}
    }
    let inkWatching = false;
    function watchInk() {
        if (inkWatching) return; inkWatching = true; updateInk();
        try { new MutationObserver(updateInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] }); } catch (e) {}
        if (root.matchMedia) { const q = root.matchMedia('(prefers-color-scheme: dark)'); if (q.addEventListener) q.addEventListener('change', () => setTimeout(updateInk, 30)); }
        root.addEventListener('pageshow', updateInk);
    }

    function injectCss() {
        if (document.getElementById('gc-css')) return;
        const s = document.createElement('style'); s.id = 'gc-css';
        s.textContent = `
.gc { --gc-ink: #1b2430; position: relative; z-index: 25; width: 52px; height: 52px; flex-shrink: 0; color: var(--gc-ink); }
html[data-gc-ink="white"] .gc { --gc-ink: #ffffff; }
.gc svg { position: absolute; left: 50%; top: 50%; width: 104px; height: 104px; margin: -52px 0 0 -52px; overflow: visible; pointer-events: none; filter: none !important; }
.gc .gc-glass { position: absolute; inset: 1px; border-radius: 50%; pointer-events: none; -webkit-backdrop-filter: blur(1px) saturate(1.5); backdrop-filter: blur(1px) saturate(1.5); }
html.lite .gc .gc-glass { -webkit-backdrop-filter: none; backdrop-filter: none; }
.gc .gc-hit { position: absolute; inset: 4px; border-radius: 50%; cursor: pointer; background: none; border: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
.gc .gc-hit:focus-visible { outline: 2px solid var(--blue-a, #1fb8f5); outline-offset: 3px; }
.gc.float { position: fixed; right: 2px; bottom: calc(92px + env(safe-area-inset-bottom)); width: 56px; height: 56px; z-index: 25; }
.gc.float svg { width: 108px; height: 108px; margin: -54px 0 0 -54px; }
.gc.float .gc-hit { inset: 0; cursor: grab; touch-action: none; }
.gc.float.drag .gc-hit { cursor: grabbing; }
.gc.float.settle { transition: left .32s cubic-bezier(.2,.9,.3,1), top .32s cubic-bezier(.2,.9,.3,1); }
.gc-bubble { position: absolute; right: 54px; top: 50%; transform: translateY(-50%) scale(0.9); transform-origin: right center; max-width: 220px; width: max-content; padding: 9px 13px; border-radius: 16px; font-size: 0.95rem; line-height: 1.4; color: var(--text-main); background: var(--glass-hi, rgba(255,255,255,.8)); border: 1px solid var(--glass-line, rgba(255,255,255,.6)); -webkit-backdrop-filter: blur(var(--glass-blur, 20px)); backdrop-filter: blur(var(--glass-blur, 20px)); box-shadow: 0 8px 24px rgba(30,20,60,.18); opacity: 0; pointer-events: none; transition: opacity .4s ease, transform .4s cubic-bezier(.2,.9,.3,1.2); z-index: 40; }
.gc.float .gc-bubble { right: 62px; left: auto; bottom: 6px; top: auto; transform: scale(0.9); transform-origin: right bottom; }
.gc.float.at-left .gc-bubble { left: 62px; right: auto; transform-origin: left bottom; }
.gc.float.at-top .gc-bubble { top: 6px; bottom: auto; transform-origin: right top; }
.gc.float.at-top.at-left .gc-bubble { transform-origin: left top; }
.gc-bubble.on { opacity: 1; transform: translateY(-50%) scale(1); }
.gc.float .gc-bubble.on { transform: scale(1); }
.gc .spark { animation: gcspark 1.1s ease-out infinite; transform-origin: center; }
@keyframes gcspark { 0% { opacity: 0; transform: scale(.4); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.3); } }
@media (prefers-reduced-motion: reduce) { .gc .spark { animation: none; opacity: .8; } .gc.float.settle { transition: none; } }
`;
        document.head.appendChild(s);
    }

    let current = null;
    function create(host, opts) {
        injectCss(); watchInk(); opts = opts || {};
        host.classList.add('gc'); host.innerHTML = '';
        const glassDiv = document.createElement('div'); glassDiv.className = 'gc-glass'; host.appendChild(glassDiv);
        const svg = el('svg', { viewBox: '-60 -60 120 120', 'aria-hidden': 'true' }, host);
        const uid = 'gc' + Math.floor(Math.random() * 1e6);
        const defs = el('defs', {}, svg);
        const grad = (tag, id, at, stops) => { const g = el(tag, Object.assign({ id: uid + id }, at), defs); stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, g)); return g; };
        // clear glass: almost empty in the middle, light gathers near the edge
        grad('radialGradient', 'g', { cx: '50%', cy: '50%', r: '50%' }, [['0', '#ffffff', 0.05], ['.55', '#bff3ee', 0.1], ['.86', '#9fe4ea', 0.22], ['1', '#ffffff', 0.34]]);
        grad('radialGradient', 's', { cx: '40%', cy: '38%', r: '62%' }, [['.62', '#0b3a5c', 0], ['1', '#0b3a5c', 0.22]]);
        grad('radialGradient', 'w', { cx: '72%', cy: '84%', r: '48%' }, [['0', '#ffd27a', 0.36], ['1', '#ffd27a', 0]]);
        grad('radialGradient', 'c', { cx: '24%', cy: '30%', r: '52%' }, [['0', '#7fe0cf', 0.4], ['1', '#7fe0cf', 0]]);
        grad('radialGradient', 'sp', { cx: '50%', cy: '50%', r: '50%' }, [['0', '#ffffff', 0.95], ['1', '#ffffff', 0]]);
        const rim = grad('linearGradient', 'r', { x1: '0', y1: '0', x2: '1', y2: '1' }, [['0', '#ffd98a'], ['.5', '#8fe3d3'], ['1', '#ffd98a']]);
        grad('linearGradient', 'o', { x1: '0', y1: '0', x2: '1', y2: '0' }, [['0', '#7fe0e8'], ['.5', '#ffffff'], ['1', '#f5d29a']]);
        grad('radialGradient', 'ht', { cx: '50%', cy: '50%', r: '50%' }, [['.45', '#7fe0e8', 0.5], ['1', '#7fe0e8', 0]]);
        grad('radialGradient', 'hg', { cx: '50%', cy: '50%', r: '50%' }, [['.45', '#ffd98a', 0.4], ['1', '#ffd98a', 0]]);

        const shadow = el('ellipse', { cx: 0, cy: 41, rx: 18, ry: 2.6, fill: 'currentColor', opacity: 0.1 }, svg);
        const auraT = el('circle', { cx: -5, cy: -3, r: 48, fill: `url(#${uid}ht)` }, svg), auraG = el('circle', { cx: 8, cy: 9, r: 42, fill: `url(#${uid}hg)` }, svg);
        const ring = (rx, ry) => { const g = el('g', {}, svg); el('ellipse', { cx: 0, cy: 0, rx, ry, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.28 }, g); el('ellipse', { cx: 0, cy: 0, rx, ry, fill: 'none', stroke: `url(#${uid}o)`, 'stroke-width': 0.8, opacity: 0.75 }, g); return g; };
        const orb1 = ring(47, 17), orb2 = ring(43, 24);
        const sp1 = el('circle', { r: 1.3, fill: '#fff' }, svg), sp2 = el('circle', { r: 1, fill: '#ffe2a8' }, svg);
        const root_ = el('g', {}, svg), body = el('g', {}, root_), limbs = el('g', {}, root_);
        // props and limbs are drawn in front of the body
        const props = el('g', {}, limbs);
        const book = el('g', { opacity: 0 }, props);
        el('path', { d: 'M-22 36 L0 40 L22 36 L22 46 L0 50 L-22 46 Z', fill: '#fff8ea', stroke: INK, 'stroke-width': 1.3, 'stroke-linejoin': 'round' }, book); el('path', { d: 'M0 40 L0 50', stroke: INK, 'stroke-width': 1.1 }, book);
        el('path', { d: 'M-16 41 L-4 43 M-16 44 L-4 46 M4 43 L16 41 M4 46 L16 44', stroke: '#c9b88f', 'stroke-width': 1, fill: 'none' }, book);
        const pen = el('path', { d: 'M16 31 L26 21', stroke: '#c58b2a', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 }, props);
        const mag = el('g', { opacity: 0 }, props);
        el('circle', { cx: 44, cy: -26, r: 9, fill: 'rgba(255,255,255,.3)', stroke: '#c58b2a', 'stroke-width': 2.4 }, mag); el('path', { d: 'M37.5 -19.5 L35 -14', stroke: '#c58b2a', 'stroke-width': 3, 'stroke-linecap': 'round' }, mag);
        el('path', { d: 'M40 -29 Q43 -32 47 -30', stroke: '#fff', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', opacity: .8 }, mag);
        const chart = el('g', { opacity: 0 }, props);
        el('rect', { x: 46, y: -22, width: 4.2, height: 9, rx: 1, fill: '#8fe3d3' }, chart); el('rect', { x: 52.5, y: -29, width: 4.2, height: 16, rx: 1, fill: '#ffd98a' }, chart); el('rect', { x: 59, y: -36, width: 4.2, height: 23, rx: 1, fill: '#7fd0c0' }, chart);
        const heart = el('path', { d: 'M0 40 C-14 29 -6 21 0 28 C6 21 14 29 0 40 Z', fill: '#ffb347', stroke: '#e58a1f', 'stroke-width': 1, opacity: 0 }, props);
        const laptop = el('g', { opacity: 0 }, props);
        el('rect', { x: -19, y: 30, width: 38, height: 17, rx: 2.2, fill: 'rgba(190,243,234,.55)', stroke: INK, 'stroke-width': 1.3 }, laptop);
        el('path', { d: 'M-12 35 H8 M-12 39 H12 M-12 43 H2', stroke: INK, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.55 }, laptop);
        el('path', { d: 'M-25 49.5 H25', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, laptop);
        const coffee = el('g', { opacity: 0 }, props);
        el('path', { d: 'M25 18 H39 L37.5 32 Q37 34 35 34 H29 Q27 34 26.5 32 Z', fill: '#fff8ea', stroke: INK, 'stroke-width': 1.3, 'stroke-linejoin': 'round' }, coffee);
        el('path', { d: 'M39 21 Q44 21 43.5 26 Q43 30 38 30', fill: 'none', stroke: INK, 'stroke-width': 1.3 }, coffee);
        const steam = el('g', {}, coffee);
        const st1 = el('path', { d: 'M29 14 Q27 10 29 6', fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.5 }, steam), st2 = el('path', { d: 'M34 14 Q36 10 34 6', fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.5 }, steam);
        const sparks = el('g', { opacity: 0 }, props);
        [[-34, -42, -20], [0, -50, 0], [34, -42, 20], [-46, -20, -50], [46, -20, 50]].forEach(([x, y, r], i) => { const sg = el('g', { transform: `translate(${x} ${y}) rotate(${r})` }, sparks); const s = el('path', { d: 'M0 -5 L0 5', stroke: ['#ffd98a', '#8fe3d3', '#ffb347'][i % 3], 'stroke-width': 2, 'stroke-linecap': 'round', class: 'spark' }, sg); s.style.animationDelay = (i * 0.17) + 's'; });
        const armL = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.9, 'stroke-linecap': 'round', opacity: 0 }, limbs), armR = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.9, 'stroke-linecap': 'round', opacity: 0 }, limbs);
        const handL = el('circle', { r: 2.5, fill: INK, opacity: 0 }, limbs), handR = el('circle', { r: 2.5, fill: INK, opacity: 0 }, limbs);

        // ---- the glass circle
        el('circle', { cx: 0, cy: 0, r: 30, fill: `url(#${uid}g)` }, body);
        el('circle', { cx: 0, cy: 0, r: 30, fill: `url(#${uid}c)` }, body); el('circle', { cx: 0, cy: 0, r: 30, fill: `url(#${uid}w)` }, body);
        el('circle', { cx: 0, cy: 0, r: 30, fill: `url(#${uid}s)` }, body);
        const rimC = el('circle', { cx: 0, cy: 0, r: 29.3, fill: 'none', stroke: `url(#${uid}r)`, 'stroke-width': 1.6, opacity: 0.9 }, body);
        el('circle', { cx: 0, cy: 0, r: 30.2, fill: 'none', stroke: INK, 'stroke-width': 0.55, opacity: 0.6 }, body);
        el('circle', { cx: 0, cy: 0, r: 27.6, fill: 'none', stroke: '#fff', 'stroke-width': 0.6, opacity: 0.55 }, body);
        el('ellipse', { cx: -11, cy: -17, rx: 11, ry: 5.5, fill: `url(#${uid}sp)`, transform: 'rotate(-28 -11 -17)' }, body);
        el('path', { d: 'M12 24 Q19 19 23 11', fill: 'none', stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.5 }, body);
        const face = el('g', {}, body);
        const browL = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.5, 'stroke-linecap': 'round' }, face), browR = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.5, 'stroke-linecap': 'round' }, face);
        const eyeL = el('ellipse', { fill: INK }, face), eyeR = el('ellipse', { fill: INK }, face);
        const happyL = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, face), happyR = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, face);
        const closeL = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, face), closeR = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, face);
        const mouth = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, face), mouthO = el('ellipse', { fill: INK }, face);

        const hit = document.createElement('button'); hit.type = 'button'; hit.className = 'gc-hit'; hit.setAttribute('aria-label', 'Companion'); host.appendChild(hit);
        const bubble = document.createElement('div'); bubble.className = 'gc-bubble'; host.appendChild(bubble);

        // ---- state
        const KEYS = ['armL', 'armR', 'book', 'pen', 'mag', 'chart', 'heart', 'sparks', 'laptop', 'coffee'];
        const P = Object.assign({}, BASE, { blink: 0, hxL: 0, hyL: 0, hxR: 0, hyR: 0 }); KEYS.forEach(k => P[k] = 0);
        let T = Object.assign({}, BASE), base = 'calm', poseName = 'none', poseTimer = null, flip = -1, running = false, last = 0, t0 = performance.now();
        let blinkAt = t0 + 2500, blinkUntil = 0, gazeAt = t0 + 3000, gzx = 0, gzy = 0, bubbleTimer = null, shown = true, mode = 'header';
        let ks = 0, kv = 0, pgx = 0, pgy = 0, ptAt = 0, ptx = 0, pty = 0;
        const rnd = (a, b) => a + Math.random() * (b - a);

        function target() {
            const m = Object.assign({}, BASE, MOODS[base] || {});
            const p = POSES[poseName] || POSES.none;
            if (p.mood && poseName !== 'none') Object.assign(m, MOODS[p.mood] || {});
            T = m;
            T.armL = p.L ? 1 : 0; T.armR = p.R ? 1 : 0;
            if (p.L) { T.hxL = p.L[0]; T.hyL = p.L[1]; } if (p.R) { T.hxR = p.R[0]; T.hyR = p.R[1]; }
            KEYS.slice(2).forEach(k => T[k] = (p.props && p.props[k]) ? 1 : 0);
        }
        function draw(time, still_) {
            const s = time / 1000, pose = POSES[poseName] || POSES.none;
            // a life of its own: several slow waves that never line up, so nothing repeats exactly
            const breath = Math.sin(s * 1.5) * 0.018 + Math.sin(s * 0.63 + 1) * 0.008;
            const float = Math.sin(s * 0.7) * 1.4 + Math.sin(s * 1.13 + 2) * 0.7, drift = Math.sin(s * 0.41 + 3) * 1.6 + Math.sin(s * 0.97) * 0.8;
            const sc = P.sc * (1 + breath), tilt = P.tilt + drift, ly = P.lift + float;
            const sqx = 1 - ks * 0.09, sqy = 1 + ks * 0.09;
            root_.setAttribute('transform', `translate(0 ${ly.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${(sc * sqx).toFixed(4)} ${(sc * (1 - breath * 0.6) * sqy).toFixed(4)})`);
            shadow.setAttribute('rx', (18 - ly * 0.6).toFixed(1)); shadow.setAttribute('opacity', (0.1 + ly * 0.006).toFixed(3));
            const gl = P.glow * (0.8 + 0.2 * Math.sin(s * 1.1));
            auraT.setAttribute('opacity', gl.toFixed(2)); auraG.setAttribute('opacity', (gl * 0.85).toFixed(2));
            auraT.setAttribute('r', (44 + P.glow * 6).toFixed(1)); auraG.setAttribute('r', (38 + P.glow * 6).toFixed(1));
            rim.setAttribute('gradientTransform', `rotate(${((s * 12) % 360).toFixed(1)} .5 .5)`);
            orb1.setAttribute('transform', `rotate(${(-28 + s * 8).toFixed(2)})`); orb2.setAttribute('transform', `rotate(${(52 - s * 5.5).toFixed(2)})`);
            const a1 = s * 0.6, a2 = s * 0.43 + 2;
            sp1.setAttribute('cx', (Math.cos(a1) * 40).toFixed(1)); sp1.setAttribute('cy', (Math.sin(a1) * 15 - 8).toFixed(1)); sp1.setAttribute('opacity', (0.35 + 0.6 * Math.max(0, Math.sin(s * 1.3))).toFixed(2));
            sp2.setAttribute('cx', (Math.cos(a2) * 36).toFixed(1)); sp2.setAttribute('cy', (Math.sin(a2) * 20 + 10).toFixed(1)); sp2.setAttribute('opacity', (0.3 + 0.6 * Math.max(0, Math.sin(s * 0.9 + 1.7))).toFixed(2));
            limbs.setAttribute('transform', `scale(${flip} 1)`);
            // face
            const gx = P.gx + gzx + pgx * 0.9, gy = P.gy + gzy + pgy * 0.7; face.setAttribute('transform', `translate(${(gx * 2.6).toFixed(2)} ${(gy * 2).toFixed(2)})`);
            const open = Math.max(0, P.eo * (1 - P.blink)), ry = Math.max(0.2, P.ry * (1 - P.blink * 0.92));
            [[eyeL, -9], [eyeR, 9]].forEach(([e, x]) => { e.setAttribute('cx', x); e.setAttribute('cy', -3); e.setAttribute('rx', 2.3); e.setAttribute('ry', ry.toFixed(2)); e.setAttribute('opacity', open.toFixed(2)); });
            const hp = x => `M${x - 3.8} -1 Q${x} -6.2 ${x + 3.8} -1`, cp = x => `M${x - 3.6} -3.2 Q${x} 0.6 ${x + 3.6} -3.2`;
            happyL.setAttribute('d', hp(-9)); happyR.setAttribute('d', hp(9)); happyL.setAttribute('opacity', P.eh.toFixed(2)); happyR.setAttribute('opacity', P.eh.toFixed(2));
            const cl = Math.min(1, P.ec + P.blink * P.eo); closeL.setAttribute('d', cp(-9)); closeR.setAttribute('d', cp(9)); closeL.setAttribute('opacity', cl.toFixed(2)); closeR.setAttribute('opacity', cl.toFixed(2));
            const b = P.brow; browL.setAttribute('d', `M-13 -9 L-5.5 ${-9 - 2.6 * b}`); browR.setAttribute('d', `M5.5 ${-9 - 2.6 * b} L13 -9`); browL.setAttribute('opacity', b.toFixed(2)); browR.setAttribute('opacity', b.toFixed(2));
            const mw = P.mw / 2, my = 9, mc = P.mc * 6;
            mouth.setAttribute('d', `M${(-mw + P.mx).toFixed(1)} ${my} Q${P.mx.toFixed(1)} ${(my + mc).toFixed(1)} ${(mw + P.mx).toFixed(1)} ${my}`); mouth.setAttribute('opacity', (1 - P.mo).toFixed(2));
            mouthO.setAttribute('cx', P.mx.toFixed(1)); mouthO.setAttribute('cy', 10); mouthO.setAttribute('rx', 2.2); mouthO.setAttribute('ry', 2.8); mouthO.setAttribute('opacity', P.mo.toFixed(2));
            // limbs grow out of the circle and go back in
            const typing = pose.type && !still_ ? Math.sin(s * 15) * 0.9 : 0, wag = (pose.wag && !still_) ? Math.sin(s * 6.5) * 4 : 0;
            const arm = (path, hand, a, hx, hy, side) => {
                const sh = SH[side]; hx += pose.wag === side ? wag : 0; hy += pose.type ? (side === 'L' ? typing : -typing) : 0;
                const x = lerp(sh[0], hx, a), y = lerp(sh[1], hy, a);
                path.setAttribute('d', `M${sh[0]} ${sh[1]} Q${((sh[0] + x) / 2 + (side === 'L' ? -5 : 5) * a).toFixed(1)} ${((sh[1] + y) / 2 + 6 * a).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
                path.setAttribute('opacity', Math.min(1, a * 1.6).toFixed(2)); hand.setAttribute('cx', x.toFixed(1)); hand.setAttribute('cy', y.toFixed(1)); hand.setAttribute('opacity', Math.min(1, a * 1.6).toFixed(2));
            };
            arm(armL, handL, P.armL, P.hxL, P.hyL, 'L'); arm(armR, handR, P.armR, P.hxR, P.hyR, 'R');
            book.setAttribute('opacity', P.book.toFixed(2)); pen.setAttribute('opacity', P.pen.toFixed(2)); mag.setAttribute('opacity', P.mag.toFixed(2)); chart.setAttribute('opacity', P.chart.toFixed(2)); heart.setAttribute('opacity', P.heart.toFixed(2)); sparks.setAttribute('opacity', P.sparks.toFixed(2));
            laptop.setAttribute('opacity', P.laptop.toFixed(2)); coffee.setAttribute('opacity', P.coffee.toFixed(2));
            st1.setAttribute('opacity', (0.25 + 0.35 * Math.sin(s * 1.7)).toFixed(2)); st2.setAttribute('opacity', (0.25 + 0.35 * Math.sin(s * 1.7 + 2)).toFixed(2));
            mag.setAttribute('transform', `translate(0 ${(Math.sin(s * 2) * 1.2).toFixed(2)})`);
            chart.setAttribute('transform', `scale(1 ${(0.6 + 0.4 * P.chart).toFixed(2)})`); chart.style.transformOrigin = '55px -13px';
            pen.setAttribute('transform', `translate(${(Math.sin(s * 5) * 1.2).toFixed(2)} 0)`);
        }
        function frame(now) {
            if (!running) return;
            const dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
            if (document.hidden || !shown) { requestAnimationFrame(frame); return; }
            const st = still(), k = 1 - Math.exp(-dt * 6.5);
            for (const key in T) if (typeof T[key] === 'number') P[key] = lerp(P[key], T[key], k);
            for (const key of KEYS) P[key] = lerp(P[key], T[key], 1 - Math.exp(-dt * 5));
            // tap: a small springy squash
            kv += (-ks * 150 - kv * 9) * dt; ks += kv * dt;
            // eyes follow a finger or pointer that is close, then relax
            const near = now - ptAt < 2200; pgx = lerp(pgx, near ? ptx : 0, 1 - Math.exp(-dt * 4)); pgy = lerp(pgy, near ? pty : 0, 1 - Math.exp(-dt * 4));
            if (!st) {
                if (now > blinkAt) { blinkUntil = now + rnd(110, 170); blinkAt = now + rnd(2600, 7200); if (Math.random() < 0.18) blinkAt = now + 380; }
                if (now > gazeAt) { gazeAt = now + rnd(2800, 8000); const r = Math.random(); if (r < 0.45) { gzx = 0; gzy = 0; } else { gzx = rnd(-1, 1); gzy = rnd(-0.6, 0.5); } }
            }
            P.blink = now < blinkUntil ? 1 : lerp(P.blink, 0, 1 - Math.exp(-dt * 25));
            draw(st ? 1000 : now - t0, st);
            requestAnimationFrame(frame);
        }
        function start() { if (running) return; if (reduced()) { snap(); return; } running = true; last = performance.now(); requestAnimationFrame(frame); }
        function snap() { Object.keys(T).forEach(k => { if (typeof T[k] === 'number') P[k] = T[k]; }); draw(1000, true); }
        document.addEventListener('pointermove', e => {
            if (document.hidden || !shown) return; const r = host.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
            if (Math.hypot(dx, dy) > 260) return; ptAt = performance.now(); ptx = clamp(dx / 110, -1, 1); pty = clamp(dy / 110, -1, 1);
        }, { passive: true });

        // ---- floating mode: drag anywhere, settle to the nearest side, remember the place
        const POSK = 'gc_pos';
        function bubbleSide() { const r = host.getBoundingClientRect(); host.classList.toggle('at-left', r.left + r.width / 2 < innerWidth / 2); host.classList.toggle('at-top', r.top + r.height / 2 < innerHeight / 2); }
        function limits() { const r = host.getBoundingClientRect(), cs = getComputedStyle(document.documentElement); return { w: r.width, h: r.height, minX: 2, maxX: innerWidth - r.width - 2, minY: 8, maxY: innerHeight - r.height - 8 }; }
        function place(x, y) { const L = limits(); host.style.left = clamp(x, L.minX, L.maxX) + 'px'; host.style.top = clamp(y, L.minY, L.maxY) + 'px'; host.style.right = 'auto'; host.style.bottom = 'auto'; bubbleSide(); }
        function savePos(x, y) { try { const L = limits(); localStorage.setItem(POSK, JSON.stringify({ fx: L.maxX > L.minX ? (x - L.minX) / (L.maxX - L.minX) : 1, fy: L.maxY > L.minY ? (y - L.minY) / (L.maxY - L.minY) : 1 })); } catch (e) {} }
        function restorePos() {
            if (mode !== 'float') return; let o = null; try { o = JSON.parse(localStorage.getItem(POSK) || 'null'); } catch (e) {}
            if (o && isFinite(o.fx) && isFinite(o.fy)) { const L = limits(); place(L.minX + clamp(o.fx, 0, 1) * (L.maxX - L.minX), L.minY + clamp(o.fy, 0, 1) * (L.maxY - L.minY)); } else bubbleSide();
        }
        let ds = null, dragged = false;
        hit.addEventListener('pointerdown', e => {
            if (mode !== 'float' || (e.button !== undefined && e.button !== 0)) return;
            const r = host.getBoundingClientRect(); ds = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, id: e.pointerId }; dragged = false;
            try { hit.setPointerCapture(e.pointerId); } catch (_) {}
        });
        hit.addEventListener('pointermove', e => {
            if (!ds || ds.id !== e.pointerId) return; const dx = e.clientX - ds.x, dy = e.clientY - ds.y;
            if (!dragged && Math.hypot(dx, dy) < 7) return;
            if (!dragged) { dragged = true; host.classList.remove('settle'); host.classList.add('drag'); api.mood('curious'); }
            place(ds.l + dx, ds.t + dy); if (e.cancelable) e.preventDefault();
        });
        const endDrag = e => {
            if (!ds || (e && ds.id !== e.pointerId)) return; ds = null; host.classList.remove('drag');
            if (dragged) { const r = host.getBoundingClientRect(), L = limits(); const tx = r.left + r.width / 2 < innerWidth / 2 ? L.minX : L.maxX, ty = clamp(r.top, L.minY, L.maxY); host.classList.add('settle'); place(tx, ty); savePos(tx, ty); setTimeout(() => host.classList.remove('settle'), 400); setTimeout(() => api.mood('calm'), 700); setTimeout(() => { dragged = false; }, 60); }
        };
        hit.addEventListener('pointerup', endDrag); hit.addEventListener('pointercancel', endDrag);
        root.addEventListener('resize', () => { if (mode === 'float') restorePos(); });

        const reactSeen = new Map();
        function reactOnce(key, mood, win) { const now = Date.now(); if (now - (reactSeen.get(key) || 0) < win) return false; reactSeen.set(key, now); api.mood(mood); clearTimeout(api._rt); api._rt = setTimeout(() => api.mood('calm'), 3600); return true; }
        const api = {
            mood(m) { m = ALIAS[m] || m; base = MOODS[m] ? m : 'calm'; target(); if (reduced()) snap(); },
            pose(name, ms) { clearTimeout(poseTimer); poseName = POSES[name] ? name : 'none'; target(); if (reduced()) snap(); if (ms) poseTimer = setTimeout(() => api.pose('none'), ms); },
            say(text, ms, message) { if (!text) return; bubble.textContent = text; bubble.classList.add('on'); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove('on'), ms || 4200); },
            sayQuiet(text, ms) {   // it does not talk all day: at most four unprompted lines a day
                let c = 0, d = new Date().toDateString(); try { const o = JSON.parse(localStorage.getItem('gc_say') || '{}'); c = o.d === d ? o.c : 0; if (c >= 4) return false; localStorage.setItem('gc_say', JSON.stringify({ d, c: c + 1 })); } catch (e) {}
                api.say(text, ms); return true;
            },
            setPos(p) { mode = p === 'float' ? 'float' : 'header'; host.classList.toggle('float', mode === 'float'); if (mode === 'float') restorePos(); else { ['left', 'top', 'right', 'bottom'].forEach(k => host.style[k] = ''); host.classList.remove('at-left', 'at-top'); } },
            resetPos() { try { localStorage.removeItem(POSK); } catch (e) {} ['left', 'top', 'right', 'bottom'].forEach(k => host.style[k] = ''); bubbleSide(); },
            show(v) { shown = v !== false; host.style.display = shown ? '' : 'none'; },
            wake() { api.mood('sleepy'); snap(); setTimeout(() => api.mood('curious'), 700); setTimeout(() => api.mood('calm'), 2600); },
            state() { return { base, poseName, pos: mode, ink: document.documentElement.getAttribute('data-gc-ink') }; },
            // names from the earlier prototype
            setMood(name, message) { api.mood(name); if (message) api.say(message, 3600); },
            perform(action) { api.mood(ACTION[action] || 'calm'); },
            respondToBudgetEvent(ev) { return reactOnce(String(ev), EVENT[ev] || 'curious', 15000); },
            respondToMilestone(key, name) { return reactOnce('m:' + key, name || 'proud', 86400000); },
            reset() { api.mood('calm'); api.pose('none'); },
            get moodName() { return base; }
        };
        hit.addEventListener('click', () => { if (dragged) return; kv = -3.2; if (opts.onTap) opts.onTap(api); });
        target(); snap(); start();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); } });
        api.setPos(opts.pos || 'header');
        current = api; root.CircleCompanion = api;
        return api;
    }
    root.GCompanion = { create };
})(typeof window !== 'undefined' ? window : this);
