/* Circle Companion: art. 33 body shapes (the spectre molds into these) and lifelike props.
   Shapes are outlines; the body morphs between them like a fluid. Glyphs are the details drawn on a shape.
   Pure data and drawing helpers. Used by companion.js. */
(function (root) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const N = 56;                                       // points around every body outline
    const INK = 'currentColor';

    // ---------- outline helpers
    const circle = (r, cx, cy) => Array.from({ length: 72 }, (_, i) => { const a = i / 72 * Math.PI * 2 - Math.PI / 2; return [(cx || 0) + Math.cos(a) * r, (cy || 0) + Math.sin(a) * r]; });
    function chaikin(pts, n) { for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } pts = o; } return pts; }
    function dense(pts, M) {                            // evenly spaced points along a closed polyline
        const L = [0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
        const tot = L[pts.length], out = []; let j = 0;
        for (let k = 0; k < M; k++) { const d = tot * k / M; while (L[j + 1] < d) j++; const a = pts[j], b = pts[(j + 1) % pts.length], t = (d - L[j]) / ((L[j + 1] - L[j]) || 1); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
        return out;
    }
    function outline(sh) {                              // N points, clockwise, starting at the top centre
        if (sh._o) return sh._o;
        let pts = typeof sh.pts === 'function' ? sh.pts() : sh.pts; if (sh.round) pts = chaikin(pts, sh.round);
        const M = 560; let d = dense(pts, M), A = 0; d.forEach((p, i) => { const q = d[(i + 1) % M]; A += p[0] * q[1] - q[0] * p[1]; }); if (A < 0) d.reverse();
        let cy = 0; d.forEach(p => cy += p[1]); cy /= M; let best = 0, bs = 1e9; d.forEach((p, i) => { if (p[1] < cy) { const s = Math.abs(p[0]) * 4 + p[1] * 0.02; if (s < bs) { bs = s; best = i; } } });
        const out = []; for (let k = 0; k < N; k++) out.push(d[(best + Math.round(k * M / N)) % M]);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; out.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
        sh._o = out; sh._b = { x0, x1, y0, y1 }; return out;
    }
    const ghostPts = () => { const p = []; for (let i = 0; i <= 28; i++) { const a = Math.PI + i / 28 * Math.PI; p.push([Math.cos(a) * 29, -3 + Math.sin(a) * 29]); } for (let i = 1; i <= 24; i++) { const x = 29 - i * (58 / 24); p.push([x, 27 + 4.5 * Math.cos(i / 24 * Math.PI * 5)]); } return p; };
    const heartPts = () => Array.from({ length: 90 }, (_, i) => { const t = i / 90 * Math.PI * 2; return [1.9 * 16 * Math.pow(Math.sin(t), 3) * 0.95, -1.9 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.95 + 2]; });
    const starPts = () => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 15 : 34; return [Math.cos(a) * r, Math.sin(a) * r + 2]; });
    const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
    const bulbPts = () => arc(0, -8, 25, 125, 415, 40).concat([[11, 12], [10, 26], [6, 32], [-6, 32], [-10, 26], [-11, 12]]);
    const lockPts = () => [[-26, -4], [-15, -4], [-15, -14]].concat(arc(0, -14, 15, 180, 360, 14), [[15, -4], [26, -4], [26, 34], [-26, 34]]);
    const magPts = () => arc(-8, -8, 22, 60, 390, 40).concat([[34, 26], [26, 34]]);
    const umbPts = () => arc(0, -6, 32, 180, 360, 24).concat([[22, -3], [11, -6], [0, -3], [-11, -6], [-22, -3]]);
    const moonPts = () => {
        const ic = [14, -6], ir = 24, o = [], q = [];
        for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; const p = [Math.cos(a) * 30, Math.sin(a) * 30]; if (Math.hypot(p[0] - ic[0], p[1] - ic[1]) >= ir) o.push({ a, p }); }
        let k0 = 0; for (let i = 0; i < o.length; i++) { const prev = o[(i + o.length - 1) % o.length]; if (((o[i].a - prev.a + 2 * Math.PI) % (2 * Math.PI)) > 0.2) { k0 = i; break; } }
        const outer = o.slice(k0).concat(o.slice(0, k0)).map(x => x.p);
        for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; const p = [ic[0] + Math.cos(a) * ir, ic[1] + Math.sin(a) * ir]; if (Math.hypot(p[0], p[1]) <= 30) q.push(p); }
        const last = outer[outer.length - 1], d0 = Math.hypot(last[0] - q[0][0], last[1] - q[0][1]), d1 = Math.hypot(last[0] - q[q.length - 1][0], last[1] - q[q.length - 1][1]);
        return outer.concat(d1 < d0 ? q.reverse() : q);
    };

    // ---------- tiny drawing helpers
    function mk(tag, a, parent) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
    const H = g => ({
        p: (d, a) => mk('path', Object.assign({ d, fill: 'none' }, a || {}), g),
        c: (cx, cy, r, a) => mk('circle', Object.assign({ cx, cy, r }, a || {}), g),
        e: (cx, cy, rx, ry, a) => mk('ellipse', Object.assign({ cx, cy, rx, ry }, a || {}), g),
        r: (x, y, w, h, rx, a) => mk('rect', Object.assign({ x, y, width: w, height: h, rx: rx || 0 }, a || {}), g),
        g: a => mk('g', a || {}, g)
    });
    const ink = (w, o) => ({ stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: o === undefined ? 1 : o });
    const wh = w => ({ stroke: '#fff', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const F = (o, x, y, s) => ({ o, x, y, s });
    const FACE = F(1, 0, 0, 1), NOFACE = F(0, 0, 0, 1);

    // ---------- the 33 shapes. glyph(h) draws details; it may return {tick(s)} to animate them.
    const SHAPES = {
        circle: { label: 'Circle', pts: () => circle(30), face: FACE },
        ghost: { label: 'Ghost', pts: ghostPts, round: 1, face: F(1, 0, -2, 1), skirt: 1 },
        cube: { label: 'Cube', pts: [[0, -33], [29, -17], [29, 17], [0, 33], [-29, 17], [-29, -17]], round: 2, face: F(1, -9, 9, .62), tint: [120, 190, 255, .2],
            glyph: h => { h.p('M-29 -17 L0 0 L29 -17 M0 0 L0 33', ink(1, .4)); h.p('M0 -33 L29 -17 L0 0 L-29 -17Z', { fill: '#fff', opacity: .22 }); } },
        notepad: { label: 'Notepad', pts: [[-25, -31], [25, -31], [25, 31], [-25, 31]], round: 2, face: F(1, 3, 12, .8), tint: [255, 250, 225, .3],
            glyph: h => { for (let i = -15; i <= 15; i += 10) h.c(i, -31, 2.3, Object.assign({ fill: 'none' }, ink(1.2, .8))); for (let y = -14; y <= 26; y += 9) h.p(`M-17 ${y} H18`, ink(.9, .3)); h.p('M-19 -26 V28', { stroke: '#e06c6c', 'stroke-width': 1, opacity: .6 }); } },
        calculator: { label: 'Calculator', pts: [[-22, -31], [22, -31], [22, 31], [-22, 31]], round: 2, face: NOFACE, tint: [60, 80, 95, .5],
            glyph: h => { h.r(-17, -26, 34, 16, 3, { fill: '#22343a', opacity: .85 }); h.r(-4, -19, 18, 3, 1.5, { fill: '#9bf5c8' }); h.r(10, -14, 4, 1.6, .8, { fill: '#9bf5c8', opacity: .6 });
                for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) h.r(-17 + i * 12.5, -4 + j * 8.8, 9, 6.4, 2, { fill: i === 2 ? '#ffb347' : '#fff', opacity: i === 2 ? .9 : .5 }); } },
        macbook: { label: 'Laptop', pts: [[-30, -30], [30, -30], [30, 9], [36, 21], [-36, 21], [-30, 9]], round: 1, face: F(1, 0, -10, .8), tint: [190, 200, 215, .35],
            glyph: h => { h.r(-26, -26, 52, 31, 3, { fill: '#10243a', opacity: .5 }); h.p('M-36 21 H36', ink(1, .5)); h.p('M-6 17 H6', ink(1.4, .4)); h.p('M-29 12 H29', ink(.8, .25)); } },
        signboard: { label: 'Sign board', pts: [[-30, -34], [30, -34], [30, -5], [4, -5], [4, 34], [-4, 34], [-4, -5], [-30, -5]], round: 1, face: NOFACE, tint: [255, 200, 70, .6],
            glyph: h => { h.r(-27, -31, 54, 23, 3, Object.assign({ fill: 'none' }, ink(1, .5))); h.p('M-17 -26 V-18', ink(3.4, .85)); h.c(-17, -13.2, 1.9, { fill: INK, opacity: .85 }); h.p('M-6 -25 H19 M-6 -19 H14 M-6 -13 H18', ink(1.4, .45)); } },
        question: { label: 'Question mark', pts: () => circle(30), face: NOFACE, tint: [70, 130, 255, .62],
            glyph: h => { h.p('M-8 -9 C-8 -21 9 -21 9 -9 C9 -2 0 -3 0 5', wh(5.5)); h.c(0, 15, 3.2, { fill: '#fff' }); } },
        tick: { label: 'Tick mark', pts: () => circle(30), face: NOFACE, tint: [50, 195, 115, .72], glyph: h => { h.p('M-14 2 L-4 12 L15 -11', wh(6.5)); } },
        danger: { label: 'Danger mark', pts: [[0, -34], [34, 26], [-34, 26]], round: 3, face: NOFACE, tint: [255, 175, 40, .8], glyph: h => { h.p('M0 -12 V6', { stroke: '#3a2a00', 'stroke-width': 5, 'stroke-linecap': 'round' }); h.c(0, 14, 3, { fill: '#3a2a00' }); } },
        hourglass: { label: 'Wait mark', pts: [[-22, -32], [22, -32], [22, -26], [4, 0], [22, 26], [22, 32], [-22, 32], [-22, 26], [-4, 0], [-22, -26]], round: 1, face: NOFACE, tint: [255, 195, 85, .38],
            glyph: h => { h.p('M-14 -24 H14 L3 -4 H-3Z', { fill: '#ffc247', opacity: .9 }); h.p('M-3 8 H3 L14 26 H-14Z', { fill: '#ffc247', opacity: .9 }); const s = h.p('M0 -4 V8', ink(1.2, .6)); return { tick: t => s.setAttribute('opacity', (.4 + .3 * Math.sin(t * 6)).toFixed(2)) }; } },
        cross: { label: 'Cross mark', pts: () => circle(30), face: NOFACE, tint: [235, 75, 75, .74], glyph: h => { h.p('M-12 -12 L12 12 M12 -12 L-12 12', wh(6.5)); } },
        exclamation: { label: 'Notice mark', pts: () => circle(30), face: NOFACE, tint: [255, 160, 40, .7], glyph: h => { h.p('M0 -17 V6', wh(6)); h.c(0, 16, 3.6, { fill: '#fff' }); } },
        heart: { label: 'Heart', pts: heartPts, round: 1, face: F(1, 0, -3, .78), tint: [255, 105, 150, .55], glyph: h => { h.p('M-22 -14 Q-20 -22 -12 -22', Object.assign({}, wh(2.4), { opacity: .7 })); } },
        star: { label: 'Star', pts: starPts, round: 3, face: F(1, 0, 3, .66), tint: [255, 205, 70, .65] },
        coin: { label: 'Coin', pts: () => circle(30), face: NOFACE, tint: [255, 195, 55, .75],
            glyph: h => { h.c(0, 0, 24, Object.assign({ fill: 'none' }, { stroke: '#6b4a00', 'stroke-width': 1, opacity: .45 })); h.p('M-9 -13 H10 M-9 -6 H10 M-9 -13 C6 -13 6 1 -9 1 L6 15', { stroke: '#6b4a00', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); } },
        wallet: { label: 'Wallet', pts: [[-31, -18], [31, -18], [31, 22], [-31, 22]], round: 2, face: F(1, -4, -7, .62), tint: [130, 100, 210, .5],
            glyph: h => { h.p('M-31 -2 Q0 8 31 -2', ink(1.2, .55)); h.c(21, 8, 4.2, Object.assign({ fill: 'none' }, ink(1.2, .6))); h.p('M-26 16 H-8 M0 16 H18', Object.assign({}, ink(.8, .3), { 'stroke-dasharray': '2 2' })); } },
        jar: { label: 'Savings jar', pts: [[-14, -34], [14, -34], [14, -26], [24, -20], [24, 30], [-24, 30], [-24, -20], [-14, -26]], round: 2, face: F(1, 0, -6, .7), tint: [150, 220, 255, .28],
            glyph: h => { [[-12, 22], [2, 24], [13, 21], [-5, 15], [8, 11], [-14, 9]].forEach(([x, y]) => { h.c(x, y, 6, { fill: '#ffc247', stroke: '#c98a14', 'stroke-width': .8, opacity: .92 }); }); h.p('M-14 -30 H14', ink(1.2, .5)); h.p('M-6 -33 H6', ink(1.4, .6)); } },
        chart: { label: 'Bar chart', pts: [[-29, -25], [29, -25], [29, 25], [-29, 25]], round: 2, face: NOFACE, tint: [90, 180, 255, .38],
            glyph: h => { h.p('M-21 -18 V19 H23', ink(1.2, .55)); h.r(-14, 5, 8, 14, 1.5, { fill: '#7fe0cf' }); h.r(-2, -3, 8, 22, 1.5, { fill: '#ffd98a' }); h.r(10, -13, 8, 32, 1.5, { fill: '#7fd0c0' }); h.p('M-16 0 L-2 -8 L8 -4 L20 -17', ink(1.5, .6)); } },
        calendar: { label: 'Calendar', pts: [[-28, -29], [28, -29], [28, 29], [-28, 29]], round: 2, face: NOFACE, tint: [255, 255, 255, .22],
            glyph: h => { h.p('M-28 -15 H28', ink(1, .4)); h.r(-28, -29, 56, 14, 5, { fill: '#e65a5a', opacity: .82 }); h.c(-13, -29, 2.4, { fill: '#fff', stroke: INK, 'stroke-width': .8 }); h.c(13, -29, 2.4, { fill: '#fff', stroke: INK, 'stroke-width': .8 });
                for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) h.r(-20 + i * 11, -7 + j * 12, 7, 7, 1.5, { fill: INK, opacity: .22 }); h.c(13, 5, 6.5, { fill: 'none', stroke: '#ffb347', 'stroke-width': 2 }); } },
        clock: { label: 'Clock', pts: () => circle(30), face: NOFACE, tint: [255, 255, 255, .14],
            glyph: h => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; h.p(`M${(Math.sin(a) * 25).toFixed(1)} ${(-Math.cos(a) * 25).toFixed(1)} L${(Math.sin(a) * 21.5).toFixed(1)} ${(-Math.cos(a) * 21.5).toFixed(1)}`, ink(i % 3 ? 1 : 1.8, .6)); }
                const hr = h.p('M0 0 V-13', ink(3, .85)), mn = h.p('M0 0 V-19', ink(2, .85)); h.c(0, 0, 2.2, { fill: '#ffb347' });
                return { tick: () => { const d = new Date(); hr.setAttribute('transform', `rotate(${((d.getHours() % 12) * 30 + d.getMinutes() / 2).toFixed(1)})`); mn.setAttribute('transform', `rotate(${(d.getMinutes() * 6).toFixed(1)})`); } }; } },
        bulb: { label: 'Idea bulb', pts: bulbPts, round: 1, face: F(1, 0, -10, .76), tint: [255, 225, 100, .58],
            glyph: h => { h.p('M-5 16 L-3 8 L0 12 L3 8 L5 16', ink(1.2, .55)); h.p('M-9 22 H9 M-8 27 H8', ink(1.2, .45)); } },
        bell: { label: 'Bell', pts: [[0, -33], [10, -28], [18, -14], [22, 6], [30, 20], [30, 24], [-30, 24], [-30, 20], [-22, 6], [-18, -14], [-10, -28]], round: 2, face: F(1, 0, -2, .76), tint: [255, 200, 80, .58],
            glyph: h => { h.c(0, 30, 4.4, { fill: '#e8a92a', stroke: INK, 'stroke-width': .8, opacity: .9 }); h.p('M-14 -16 Q-18 -4 -16 6', Object.assign({}, wh(2.2), { opacity: .6 })); } },
        lock: { label: 'Lock', pts: lockPts, round: 1, face: NOFACE, tint: [140, 155, 180, .5],
            glyph: h => { h.c(0, 14, 4.6, { fill: INK, opacity: .75 }); h.p('M0 16 V25', ink(3, .75)); h.p('M-9 -14 A9 9 0 0 1 9 -14', Object.assign({}, wh(2), { opacity: .45 })); } },
        shield: { label: 'Shield', pts: [[-28, -26], [0, -34], [28, -26], [28, 2], [18, 22], [0, 34], [-18, 22], [-28, 2]], round: 2, face: F(1, 0, -3, .8), tint: [70, 175, 205, .5],
            glyph: h => { h.p('M-22 -20 L0 -27 L22 -20 V1 L14 17 L0 27 L-14 17 L-22 1Z', ink(1, .4)); } },
        magnifier: { label: 'Magnifier', pts: magPts, round: 1, face: F(1, -8, -8, .7), tint: [160, 230, 255, .26],
            glyph: h => { h.p('M7 8 L30 31', ink(5.5, .7)); h.p('M-22 -14 Q-18 -24 -6 -25', Object.assign({}, wh(2.2), { opacity: .7 })); } },
        book: { label: 'Book', pts: [[-32, -20], [0, -14], [32, -20], [32, 26], [0, 32], [-32, 26]], round: 1, face: NOFACE, tint: [120, 200, 160, .4],
            glyph: h => { h.p('M0 -14 V32', ink(1.2, .5)); for (let y = -6; y <= 14; y += 7) { h.p(`M-25 ${y - 1} H-7`, ink(1, .3)); h.p(`M7 ${y - 1} H25`, ink(1, .3)); } h.p('M16 -17 V-3 L19 -6 L22 -3 V-18', { fill: '#e65a5a', opacity: .85 }); } },
        gift: { label: 'Gift', pts: [[-30, -20], [-12, -20], [-14, -32], [-4, -33], [0, -24], [4, -33], [14, -32], [12, -20], [30, -20], [30, -8], [26, -8], [26, 30], [-26, 30], [-26, -8], [-30, -8]], round: 2, face: NOFACE, tint: [255, 115, 170, .55],
            glyph: h => { h.r(-4, -22, 8, 52, 0, { fill: '#ffd25a', opacity: .88 }); h.p('M-30 -8 H30', ink(1, .45)); h.c(-6, -26, 5, { fill: 'none', stroke: '#ffd25a', 'stroke-width': 3 }); h.c(6, -26, 5, { fill: 'none', stroke: '#ffd25a', 'stroke-width': 3 }); } },
        trophy: { label: 'Trophy', pts: [[-20, -32], [20, -32], [20, -14], [12, 2], [6, 8], [6, 20], [14, 24], [14, 32], [-14, 32], [-14, 24], [-6, 20], [-6, 8], [-12, 2], [-20, -14]], round: 2, face: F(1, 0, -12, .56), tint: [255, 205, 70, .7],
            glyph: h => { h.p('M-20 -26 C-35 -26 -33 -8 -15 -3', { stroke: '#e8a92a', 'stroke-width': 3, 'stroke-linecap': 'round' }); h.p('M20 -26 C35 -26 33 -8 15 -3', { stroke: '#e8a92a', 'stroke-width': 3, 'stroke-linecap': 'round' }); h.r(-14, 25, 28, 7, 2, { fill: '#b9801b', opacity: .6 }); } },
        flag: { label: 'Flag', pts: [[-20, -34], [-14, -34], [28, -24], [-14, -12], [-14, 34], [-20, 34]], round: 1, face: F(1, 2, -23, .4), tint: [90, 200, 130, .66] },
        rocket: { label: 'Rocket', pts: [[0, -36], [10, -22], [12, 6], [20, 24], [8, 20], [6, 30], [-6, 30], [-8, 20], [-20, 24], [-12, 6], [-10, -22]], round: 2, face: F(1, 0, -10, .42), tint: [205, 228, 255, .5],
            glyph: h => { h.c(0, -10, 8.5, { fill: '#10243a', opacity: .3, stroke: INK, 'stroke-width': 1 }); h.p('M-11 8 H11', { stroke: '#eb5a5a', 'stroke-width': 4, opacity: .85 }); const f = h.p('M-4 31 Q0 46 4 31Z', { fill: '#ff9d3a', opacity: .95 }); return { tick: t => f.setAttribute('transform', `scale(1 ${(0.8 + 0.4 * Math.sin(t * 22)).toFixed(2)})`) }; } },
        cloud: { label: 'Cloud', pts: [[-30, 12], [-34, 2], [-26, -6], [-20, -8], [-14, -20], [-2, -24], [8, -20], [14, -10], [26, -8], [34, 2], [30, 12], [26, 18], [-26, 18]], round: 3, face: F(1, 0, 0, .9), tint: [185, 210, 240, .46],
            glyph: h => { const ds = [-14, 0, 14].map((x, i) => h.e(x, 26, 1.4, 3, { fill: '#6db8ff', opacity: .8 })); return { tick: t => ds.forEach((d, i) => { const u = (t * 1.3 + i * .33) % 1; d.setAttribute('cy', (24 + u * 14).toFixed(1)); d.setAttribute('opacity', (.85 * (1 - u)).toFixed(2)); }) }; } },
        moon: { label: 'Moon', pts: moonPts, round: 1, face: F(1, -10, 1, .7), tint: [255, 230, 150, .42], glyph: h => { h.c(-8, -14, 2.4, { fill: INK, opacity: .12 }); h.c(-4, 14, 3.2, { fill: INK, opacity: .12 }); } },
        umbrella: { label: 'Umbrella', pts: umbPts, round: 2, face: F(1, 0, -16, .55), tint: [255, 120, 145, .56],
            glyph: h => { h.p('M0 -38 V-3 M-20 -26 L-11 -5 M20 -26 L11 -5', ink(1, .35)); h.p('M0 -3 V26 Q0 33 -7 33 Q-12 33 -12 28', ink(3, .8)); } }
    };
    const ORDER = ['cube', 'notepad', 'calculator', 'macbook', 'signboard', 'question', 'tick', 'danger', 'hourglass', 'cross', 'exclamation', 'heart', 'star', 'coin', 'wallet', 'jar', 'chart', 'calendar', 'clock', 'bulb', 'bell', 'lock', 'shield', 'magnifier', 'book', 'gift', 'trophy', 'flag', 'rocket', 'cloud', 'moon', 'umbrella'];
    // speech bubble is the 33rd
    SHAPES.speech = { label: 'Speech bubble', pts: [[-30, -24], [30, -24], [30, 16], [2, 16], [-18, 32], [-12, 16], [-30, 16]], round: 2, face: NOFACE, tint: [200, 230, 255, .34],
        glyph: h => { const d = [-10, 0, 10].map(x => h.c(x, -4, 3, { fill: INK, opacity: .65 })); return { tick: t => d.forEach((c, i) => c.setAttribute('cy', (-4 - Math.max(0, Math.sin(t * 5 - i * .8)) * 4).toFixed(1))) }; } };
    ORDER.push('speech');

    // ---------- lifelike props. layer: back (behind the body) or front. a = ground/anchor for the pop-in scale.
    function grads(defs, uid) {
        const g = (id, tag, at, st) => { const e = mk(tag, Object.assign({ id: uid + id }, at), defs); st.forEach(([o, c, a]) => mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, e)); return `url(#${uid}${id})`; };
        return {
            silver: g('sv', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#f4f6f9'], [.5, '#cfd5de'], [1, '#aab2bf']]),
            dark: g('dk', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#4c5666'], [1, '#232a36']]),
            screen: g('sc', 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 1 }, [[0, '#8fe3ff'], [1, '#4f7dff']]),
            wood: g('wd', 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#d9a066'], [.5, '#c28450'], [1, '#9a6538']]),
            woodV: g('wv', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#dca86f'], [1, '#a8713f']]),
            cream: g('cr', 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 1 }, [[0, '#ffffff'], [1, '#e9e2d2']]),
            page: g('pg', 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#fffdf4'], [.85, '#f6efd9'], [1, '#e6dcc0']]),
            cover: g('cv', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#2f8f94'], [1, '#1c5f66']]),
            pillow: g('pl', 'radialGradient', { cx: '40%', cy: '35%', r: '75%' }, [[0, '#ffffff'], [1, '#d5e4f3']]),
            blanket: g('bl', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#7fc4d6'], [1, '#4f95b0']]),
            disc: g('ds', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#fbfdff'], [1, '#c2d4e6']]),
            discSide: g('dss', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#b2c4d8'], [1, '#8097b0']]),
            coffee: g('cf', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#7a4a2a'], [1, '#4a2a14']])
        };
    }
    const sh = (h, x, y, rx, ry, o) => h.e(x, y, rx, ry, { fill: '#1b2430', opacity: o === undefined ? .16 : o });

    const PROPS = {
        platform: { layer: 'back', a: [0, 41], build(h, G) { sh(h, 0, 49, 34, 5, .18); h.p('M-30 41 V47 A30 7 0 0 0 30 47 V41Z', { fill: G.discSide }); h.e(0, 41, 30, 7, { fill: G.disc, stroke: '#fff', 'stroke-width': 1, opacity: .95 }); h.e(0, 41, 30, 7, { fill: 'none', stroke: '#8fe3d3', 'stroke-width': 1, opacity: .7 }); } },
        chair: { layer: 'both', a: [0, 52],
            back(h, G) { sh(h, 0, 54, 30, 4); h.r(-23, 12, 5, 40, 2.5, { fill: G.woodV }); h.r(18, 12, 5, 40, 2.5, { fill: G.woodV }); h.r(-23, 10, 46, 6, 3, { fill: G.woodV }); },
            front(h, G) { h.r(-26, 37, 52, 7, 3, { fill: G.wood }); h.r(-24, 36, 48, 3, 1.5, { fill: '#ffe2b8', opacity: .55 }); h.r(-24, 44, 5, 8, 2, { fill: G.woodV }); h.r(19, 44, 5, 8, 2, { fill: G.woodV }); } },
        bed: { layer: 'both', a: [0, 52],
            back(h, G) { sh(h, 0, 54, 46, 4); h.r(-46, 8, 8, 44, 4, { fill: G.woodV }); h.r(-46, 8, 8, 6, 3, { fill: '#ffe2b8', opacity: .5 }); h.r(-44, 36, 90, 10, 3, { fill: G.wood }); h.r(40, 36, 6, 16, 2, { fill: G.woodV }); h.r(-41, 24, 84, 14, 5, { fill: G.page }); h.e(-28, 26, 15, 8, { fill: G.pillow, stroke: '#9fb6cf', 'stroke-width': .8 }); h.p('M-38 26 Q-28 22 -18 26', ink(.7, .25)); },
            front(h, G) { h.p('M-14 28 Q-14 24 -8 24 H38 Q43 24 43 29 V40 H-14Z', { fill: G.blanket }); h.p('M-14 28 Q-14 24 -8 24 H38', { stroke: '#e6f6fb', 'stroke-width': 2, fill: 'none', opacity: .7 }); h.p('M2 28 V40 M18 28 V40', ink(.8, .18)); } },
        pillow: { layer: 'front', a: [-26, 26], build(h, G) { h.p('M-40 16 Q-26 10 -12 16 Q-8 24 -12 34 Q-26 40 -40 34 Q-44 24 -40 16Z', { fill: G.pillow, stroke: '#9fb6cf', 'stroke-width': .9 }); h.p('M-36 24 Q-26 20 -16 24', ink(.8, .3)); h.p('M-34 20 Q-30 17 -24 17', Object.assign({}, wh(1.6), { opacity: .8 })); } },
        notebook: { layer: 'front', a: [0, 48], build(h, G) { sh(h, 0, 52, 30, 3.4); h.p('M-28 34 L28 34 L31 51 L-31 51Z', { fill: G.cover }); h.p('M-25 35 L-1 37.5 L-1 49 L-26 47Z', { fill: G.page, stroke: '#d6cba8', 'stroke-width': .5 }); h.p('M25 35 L1 37.5 L1 49 L26 47Z', { fill: G.page, stroke: '#d6cba8', 'stroke-width': .5 });
            [40, 43, 46].forEach(y => { h.p(`M-22 ${y - 1.5} L-4 ${y - .5}`, { stroke: '#8aa6c8', 'stroke-width': .6, opacity: .7 }); h.p(`M22 ${y - 1.5} L4 ${y - .5}`, { stroke: '#8aa6c8', 'stroke-width': .6, opacity: .7 }); }); h.p('M0 37.5 V49', ink(.8, .35)); [-2.5, 0, 2.5].forEach(() => 0); h.p('M-13 39 Q-9 37.5 -6 39.5', { stroke: '#2b2550', 'stroke-width': .9, opacity: .75 }); } },
        calculator: { layer: 'front', a: [0, 50], build(h, G) { sh(h, 0, 52, 15, 2.6); h.r(-14, 28, 28, 24, 4, { fill: G.dark, stroke: '#0f1620', 'stroke-width': .8 }); h.r(-11, 31, 22, 8, 2, { fill: '#9bf5c8', opacity: .9 }); h.r(1, 33, 8, 1.8, .9, { fill: '#1d6b4d' }); h.r(5, 36, 4, 1.4, .7, { fill: '#1d6b4d', opacity: .7 });
            for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) h.r(-11 + i * 5.6, 41 + j * 3.6, 4.2, 2.8, 1, { fill: i === 3 ? '#ffb347' : '#e9eef6', opacity: .92 }); h.p('M-12 29.5 H12', Object.assign({}, wh(.8), { opacity: .45 })); } },
        pen: { layer: 'front', a: [20, 30], build(h, G) { h.p('M13 36 L27 16', { stroke: '#1f2f6a', 'stroke-width': 3.6, 'stroke-linecap': 'round' }); h.p('M14.4 34 L28.2 14.6', { stroke: '#5b78d6', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: .8 }); h.p('M13 36 L10.6 39.5', { stroke: '#d9a93a', 'stroke-width': 2.4, 'stroke-linecap': 'round' }); h.p('M22 21 L24.5 22.6', { stroke: '#d9a93a', 'stroke-width': 1.6, 'stroke-linecap': 'round' });} },
        macbook: { layer: 'front', a: [0, 52], build(h, G) { sh(h, 0, 54, 32, 3); h.p('M-24 26 L24 26 L24 44 L-24 44Z', { fill: G.dark }); h.r(-22, 28, 44, 14.5, 1.6, { fill: G.screen }); h.p('M-22 28 L22 28 L22 33 L-22 36Z', { fill: '#fff', opacity: .18 }); h.p('M-15 33 H4 M-15 37 H10', Object.assign({}, wh(1.1), { opacity: .6 }));
            h.p('M-27 46 L27 46 L31 52 L-31 52Z', { fill: G.silver, stroke: '#8a93a1', 'stroke-width': .7 }); h.p('M-22 48 H22', { stroke: '#8a93a1', 'stroke-width': 1.3, 'stroke-dasharray': '1.6 1.1', opacity: .8 }); h.p('M-5 50.6 H5', { stroke: '#8a93a1', 'stroke-width': 1, opacity: .7 }); h.p('M-24 44 H24', { stroke: '#dfe5ee', 'stroke-width': 1 }); } },
        chart: { layer: 'front', a: [48, 4], build(h, G) { h.p('M42 6 L36 36 M54 6 L60 36', { stroke: G.wood, 'stroke-width': 2.4, 'stroke-linecap': 'round' }); h.r(33, -30, 31, 38, 3, { fill: '#fdfdf8', stroke: '#9aa6b6', 'stroke-width': 1 }); h.p('M38 -24 V-1 H59', { stroke: '#7a8696', 'stroke-width': 1, fill: 'none' }); h.r(41, -9, 5, 8, 1, { fill: '#7fe0cf' }); h.r(48, -16, 5, 15, 1, { fill: '#ffd98a' }); h.r(55, -22, 4, 21, 1, { fill: '#7fd0c0' }); h.p('M40 -12 L49 -19 L57 -26', { stroke: '#e65a5a', 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' }); } },
        stick: { layer: 'front', a: [32, 30], build(h, G) { h.p('M32 34 L54 -30', { stroke: '#8b5a2b', 'stroke-width': 3.2, 'stroke-linecap': 'round' }); h.p('M33 33 L54.5 -29', { stroke: '#d9a066', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: .8 }); h.p('M52.6 -25 L54.4 -30.5', { stroke: '#e65a5a', 'stroke-width': 3.6, 'stroke-linecap': 'round' }); } },
        coffee: { layer: 'front', a: [32, 34], build(h, G) { sh(h, 32, 37, 11, 2.2); h.e(32, 34, 10.5, 2.8, { fill: G.cream, stroke: '#cfc6b2', 'stroke-width': .6 }); h.p('M25 20 H39 L37.6 32 Q37 34.4 34.6 34.4 H29.4 Q27 34.4 26.4 32Z', { fill: G.cream, stroke: '#cfc6b2', 'stroke-width': .6 }); h.e(32, 20, 7, 1.8, { fill: G.coffee }); h.p('M39 22 Q44.5 22 43.8 27 Q43 31 37.6 30', { fill: 'none', stroke: '#e3dac6', 'stroke-width': 1.8 });
            const a = h.p('M29 16 Q27 12 29 8', Object.assign({}, ink(1, .5))), b = h.p('M34 16 Q36 12 34 8', Object.assign({}, ink(1, .5))); return { tick: t => { a.setAttribute('opacity', (.2 + .35 * Math.sin(t * 1.7)).toFixed(2)); b.setAttribute('opacity', (.2 + .35 * Math.sin(t * 1.7 + 2)).toFixed(2)); } }; } },
        mag: { layer: 'front', a: [40, -20], build(h) { h.c(44, -26, 9, { fill: 'rgba(255,255,255,.28)', stroke: '#c58b2a', 'stroke-width': 2.4 }); h.p('M37.5 -19.5 L35 -14', { stroke: '#8b5a2b', 'stroke-width': 3.2, 'stroke-linecap': 'round' }); h.p('M40 -29 Q43 -32 47 -30', Object.assign({}, wh(1.5), { opacity: .8 })); } },
        heart: { layer: 'front', a: [0, 34], build(h) { h.p('M0 42 C-14 31 -6 23 0 30 C6 23 14 31 0 42Z', { fill: '#ffb347', stroke: '#e58a1f', 'stroke-width': 1 }); h.p('M-6 30 Q-4 27 -1 28', Object.assign({}, wh(1.2), { opacity: .8 })); } },
        sparks: { layer: 'front', a: [0, 0], build(h) { const out = []; [[-34, -42, -20], [0, -50, 0], [34, -42, 20], [-46, -20, -50], [46, -20, 50]].forEach(([x, y, r], i) => { const g = h.g({ transform: `translate(${x} ${y}) rotate(${r})` }); const s = mk('path', { d: 'M0 -5 L0 5', stroke: ['#ffd98a', '#8fe3d3', '#ffb347'][i % 3], 'stroke-width': 2, 'stroke-linecap': 'round' }, g); out.push(s); }); return { tick: t => out.forEach((s, i) => { const u = (t * .9 + i * .17) % 1; s.setAttribute('opacity', (Math.sin(u * Math.PI)).toFixed(2)); s.setAttribute('transform', `scale(${(.5 + u).toFixed(2)})`); }) }; } },
        zzz: { layer: 'front', a: [20, -20], build(h) { const z = [0, 1, 2].map(i => h.p(`M${24 + i * 9} ${-18 - i * 9} h${6 + i * 2} l-${6 + i * 2} ${6 + i * 2} h${6 + i * 2}`, { stroke: INK, 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })); return { tick: t => z.forEach((e, i) => { const u = (t * .45 + i * .33) % 1; e.setAttribute('opacity', Math.sin(u * Math.PI).toFixed(2)); e.setAttribute('transform', `translate(${(u * 5).toFixed(1)} ${(-u * 8).toFixed(1)})`); }) }; } },
        ball: { layer: 'front', a: [-30, 40], build(h) { h.e(-30, 47, 8, 1.8, { fill: '#1b2430', opacity: .14 }); h.c(-30, 39, 8, { fill: '#fff', stroke: '#d0d8e4', 'stroke-width': .6 }); h.p('M-30 31 A8 8 0 0 1 -22 39 L-30 39Z', { fill: '#ff7b7b' }); h.p('M-38 39 A8 8 0 0 1 -30 31 L-30 39Z', { fill: '#ffd25a' }); h.p('M-22 39 A8 8 0 0 1 -30 47 L-30 39Z', { fill: '#5fb8ff' }); h.p('M-30 47 A8 8 0 0 1 -38 39 L-30 39Z', { fill: '#6fe0a8' }); h.c(-32, 36, 2, { fill: '#fff', opacity: .6 }); } },
        notes: { layer: 'front', a: [34, -10], build(h) { const n = [0, 1].map(i => { const g = h.g(); mk('ellipse', { cx: 38 + i * 12, cy: -8 - i * 8, rx: 3.2, ry: 2.4, fill: INK, transform: `rotate(-20 ${38 + i * 12} ${-8 - i * 8})` }, g); mk('path', { d: `M${40.8 + i * 12} ${-9 - i * 8} V${-21 - i * 8} q4 1 4 6`, fill: 'none', stroke: INK, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g); return g; }); return { tick: t => n.forEach((g, i) => { const u = (t * .5 + i * .5) % 1; g.setAttribute('opacity', Math.sin(u * Math.PI).toFixed(2)); g.setAttribute('transform', `translate(${(Math.sin(t * 2 + i) * 3).toFixed(1)} ${(-u * 8).toFixed(1)})`); }) }; } },
        ripple: { layer: 'front', a: [0, 0], build(h) { const r = [0, 1, 2].map(() => h.c(0, 0, 30, Object.assign({ fill: 'none' }, ink(1.2, 0)))); return { tick: t => r.forEach((c, i) => { const u = (t * 1.1 + i * .33) % 1; c.setAttribute('r', (32 + u * 20).toFixed(1)); c.setAttribute('opacity', (.55 * (1 - u)).toFixed(2)); }) }; } },
        confetti: { layer: 'front', a: [0, 0], build(h) { const cols = ['#ffd98a', '#8fe3d3', '#ff9bb8', '#8fb7ff', '#ffb347'], c = Array.from({ length: 14 }, (_, i) => h.r(-2, -1, 4, 2, .6, { fill: cols[i % 5] })); return { tick: t => c.forEach((e, i) => { const u = (t * .7 + i * .071) % 1, x = (i / 14 - .5) * 100 + Math.sin(t * 2 + i) * 6; e.setAttribute('transform', `translate(${x.toFixed(1)} ${(-52 + u * 100).toFixed(1)}) rotate(${(t * 140 + i * 50) % 360})`); e.setAttribute('opacity', Math.sin(u * Math.PI).toFixed(2)); }) }; } }
    };

    root.GCArt = { SHAPES, ORDER, PROPS, N, outline, grads, mk, H, INK };
})(typeof window !== 'undefined' ? window : this);
