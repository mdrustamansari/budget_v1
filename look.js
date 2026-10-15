/* Rustam's Goal Manager: the look. Aurora, Paper and nature themes, all driven from preferences. */
(function (root) {
    'use strict';
    const hex2 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    const rgba = (c, a) => `rgba(${c.join(',')},${a})`;
    const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

    /* ---- Paper options ---- */
    const PAPERS = [
        ['off', 'Off-white', '#f7f5ef', '#18181a'], ['white', 'White', '#ffffff', '#1a1b1e'], ['warm', 'Warm white', '#fbf1df', '#1e1913'],
        ['cool', 'Cool white', '#edf2f8', '#131920'], ['yellow', 'Yellowish', '#f9f1c6', '#1d1b0f'], ['green', 'Greenish white', '#ecf4e3', '#141b15'],
        ['rose', 'Rose white', '#fbeef0', '#1d1417'], ['cream', 'Cream', '#f6ecd2', '#1c1810'], ['parched', 'Parched paper', '#ecd9ae', '#251d10']
    ];
    const INKS = [['pencil', 'Pencil grey', [84, 84, 84]], ['blue', 'Blue-black', [40, 62, 118]], ['sepia', 'Sepia', [112, 78, 34]], ['green', 'Green', [50, 104, 72]], ['black', 'Black', [20, 20, 20]]];
    const MARGINS = [['red', 'Red', [214, 76, 76]], ['blue', 'Blue', [66, 108, 200]], ['green', 'Green', [52, 148, 96]], ['pink', 'Pink', [226, 100, 156]], ['pencil', 'Pencil', [116, 116, 116]], ['orange', 'Orange', [226, 128, 48]]];
    const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .35 0 0 0 0 .35 0 0 0 .16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
    const FIBRE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .30 0 0 0 0 .10 0 0 0 .30 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

    const PAPER_DEFAULTS = { paperColor: 'off', paperCustom: '#f7f5ef', pattern: 'dots', dotSize: 0.9, dotGap: 24, dotAlpha: 22, ink: 'pencil', texture: false,
        mStyle: 'single', mColor: 'red', mTop: true, mSide: true, mTopIn: 1.2 };

    function paperVars(p, dark) {
        const preset = PAPERS.find(x => x[0] === p.paperColor);
        let col = preset ? hex2(dark ? preset[3] : preset[2]) : hex2(p.paperCustom || '#f7f5ef');
        if (!preset && dark) col = mix(col, BLACK, 0.82);
        const ink = (INKS.find(x => x[0] === p.ink) || INKS[0])[2], inkC = dark ? mix(ink, WHITE, 0.78) : ink;
        return { col, inkC };
    }

    /* ---- Nature themes: each has a light and a dark palette and a scene ---- */
    const sil = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${body}</svg>`)}")`;
    const hills = (c1, c2, c3) => sil(400, 200, `<path d='M0 150 C80 110 140 130 210 112 S340 96 400 120 V200 H0Z' fill='${c1}'/><path d='M0 172 C70 140 150 168 230 150 S350 140 400 158 V200 H0Z' fill='${c2}'/><path d='M0 190 C90 172 170 190 260 178 S350 176 400 184 V200 H0Z' fill='${c3}'/>`);
    const waves = (c1, c2, c3) => sil(400, 200, `<path d='M0 120 Q50 98 100 120 T200 120 T300 120 T400 120 V200 H0Z' fill='${c1}'/><path d='M0 144 Q50 122 100 144 T200 144 T300 144 T400 144 V200 H0Z' fill='${c2}'/><path d='M0 170 Q50 150 100 170 T200 170 T300 170 T400 170 V200 H0Z' fill='${c3}'/>`);
    const dunes = (c1, c2, c3) => sil(400, 200, `<path d='M0 130 C60 90 120 120 200 108 S330 80 400 112 V200 H0Z' fill='${c1}'/><path d='M0 160 C80 120 160 164 250 140 S350 130 400 150 V200 H0Z' fill='${c2}'/><path d='M0 188 C100 168 200 192 300 176 S380 176 400 182 V200 H0Z' fill='${c3}'/>`);
    const pines = (c1, c2) => { let t = ''; for (let i = 0; i < 14; i++) { const x = i * 30 + (i % 3) * 5, h = 60 + (i * 37) % 50; t += `<path d='M${x} 200 L${x + 14} ${200 - h} L${x + 28} 200Z' fill='${i % 2 ? c1 : c2}'/>`; } return sil(400, 200, t + `<rect y='186' width='400' height='14' fill='${c2}'/>`); };
    const peaks = (c1, c2, c3) => sil(400, 200, `<path d='M0 200 V120 L60 60 L110 110 L170 40 L250 120 L300 80 L400 150 V200Z' fill='${c1}'/><path d='M0 200 V150 L80 100 L140 150 L220 90 L300 150 L360 120 L400 150 V200Z' fill='${c2}'/><path d='M0 200 V180 Q100 160 200 178 T400 176 V200Z' fill='${c3}'/>`);
    const acacia = (c1, c2) => sil(400, 200, `<path d='M0 170 Q100 160 200 168 T400 164 V200 H0Z' fill='${c2}'/><path d='M300 170 V130 M300 140 L280 124 M300 140 L322 122' stroke='${c1}' stroke-width='4' fill='none'/><ellipse cx='300' cy='118' rx='46' ry='10' fill='${c1}'/><ellipse cx='286' cy='112' rx='26' ry='7' fill='${c1}'/><path d='M0 188 Q120 176 240 186 T400 182 V200 H0Z' fill='${c1}'/>`);
    const fronds = (c1, c2) => sil(400, 200, `<path d='M0 200 V150 Q60 120 120 160 Q170 110 230 150 Q290 100 350 140 Q380 120 400 130 V200Z' fill='${c2}'/><path d='M0 200 V176 Q50 152 110 178 Q180 146 240 176 Q300 150 360 174 Q390 166 400 170 V200Z' fill='${c1}'/>`);
    const NATURE = {
        ocean:   { label: 'Ocean',          L: ['#c6ecf6', '#62bdd9', '#1fb2cc', '#1668b8', '#08283a', '#4a6e80'], D: ['#05202e', '#0a4a64', '#3bd0e2', '#3c8ee8', '#e5f6fb', '#8db3c4'], art: d => waves(d ? '#0d5c7a' : '#3aa0c4', d ? '#0a4a64' : '#2488b0', d ? '#07374c' : '#16709a') },
        desert:  { label: 'Desert dusk',    L: ['#f7d9b4', '#d98a6a', '#e07a4f', '#8a4fb0', '#3a1d14', '#7d5a4a'], D: ['#1d1020', '#5a2a3a', '#ff9a63', '#b07ae0', '#fff0e4', '#cfa898'], art: d => dunes(d ? '#4a2430' : '#c46a4a', d ? '#38182a' : '#a9533e', d ? '#2a1222' : '#8a3f33') },
        spring:  { label: 'Spring',         L: ['#fbeaf1', '#cfeec0', '#ef7fa8', '#58b95e', '#22351c', '#62785a'], D: ['#16201a', '#243a24', '#ff9cc0', '#7bd67f', '#effae8', '#a3bf9c'], art: d => hills(d ? '#2c4a2c' : '#a7dc92', d ? '#233d24' : '#86c874', d ? '#1a301c' : '#5fae5a') },
        summer:  { label: 'Summer',         L: ['#fff3b8', '#9fd8f2', '#ffc400', '#ff7a1a', '#3b2a00', '#7d6a2a'], D: ['#1b1604', '#073a52', '#ffd23a', '#ff8b2e', '#fff7d8', '#cbb77a'], art: d => hills(d ? '#5a4a10' : '#f2d768', d ? '#4a3c0c' : '#e2bb3c', d ? '#392e08' : '#c99c1c') },
        autumn:  { label: 'Autumn',         L: ['#fbe4c2', '#e9a566', '#e2711d', '#a8321e', '#3a1c0e', '#80604a'], D: ['#1d1108', '#4a2410', '#ff9a40', '#e0583a', '#ffeedd', '#cfa98c'], art: d => hills(d ? '#5a2c12' : '#d6803a', d ? '#481f0e' : '#b8561f', d ? '#38160a' : '#8e3a14') },
        snowfall:{ label: 'Snowfall',       L: ['#f4f9ff', '#cfe0f2', '#7ab0e8', '#4a70c8', '#14243c', '#5c7390'], D: ['#0b1424', '#1b2c46', '#8cc0ff', '#6a8cff', '#eef5ff', '#a0b4d0'], fx: 'snow', art: d => hills(d ? '#27385a' : '#ffffff', d ? '#1f2f4d' : '#e8f1fb', d ? '#18253f' : '#d6e5f6') },
        winter:  { label: 'Winter',         L: ['#e4eef7', '#a9bdd4', '#5f8fc0', '#3a5a96', '#14213a', '#586a82'], D: ['#080f1c', '#162540', '#7fb0e6', '#5f7fdc', '#e9f1fb', '#93a6c2'], art: d => peaks(d ? '#27385a' : '#f4f8fc', d ? '#1c2b4a' : '#c8d6e6', d ? '#142038' : '#9fb4cc') },
        tropical:{ label: 'Tropical forest',L: ['#d7f5cf', '#5fbf6a', '#1fa85a', '#0a6e46', '#0c2a14', '#4d6e50'], D: ['#04140a', '#0b3a1e', '#37d17a', '#1fa070', '#e4fbe9', '#8fbf9c'], art: d => fronds(d ? '#0e5a2c' : '#2e9a4e', d ? '#0a4422' : '#1c7a3c') },
        savannah:{ label: 'Savannah',       L: ['#fde8b6', '#f0b45a', '#e89a1a', '#a5551a', '#3a2408', '#7d6238'], D: ['#1c1206', '#4a2a0c', '#ffb53a', '#e0701f', '#fff1d6', '#cfb48a'], art: d => acacia(d ? '#120a04' : '#3b2412', d ? '#5a3a14' : '#d99a3a') },
        forest:  { label: 'Pine forest',    L: ['#e2f0d6', '#9ccb84', '#4fae52', '#1f7a43', '#14280f', '#546b4a'], D: ['#07140a', '#12301a', '#6fdc78', '#34b06a', '#e8f8e4', '#98b894'], art: d => pines(d ? '#0e3a1c' : '#2d7a3e', d ? '#082a14' : '#1d5e2c') },
        monsoon: { label: 'Monsoon',        L: ['#d9e0e6', '#8fa2b2', '#3f9a82', '#3c6a96', '#15232e', '#566878'], D: ['#0a1016', '#1a2a38', '#52c4a4', '#5b92c8', '#e8f0f6', '#9ab0c0'], fx: 'rain', art: d => hills(d ? '#1e3a30' : '#6aa090', d ? '#17302a' : '#4d8478', d ? '#102420' : '#356a5e') }
    };
    function natureVars(id, dark) {
        const n = NATURE[id]; if (!n) return null;
        const [top, bot, a, b, text, muted] = dark ? n.D : n.L;
        const A = hex2(a), B = hex2(b), T = hex2(top), M = mix(A, B, 0.5);
        const v = {
            '--blue-a': a, '--blue-b': b,
            '--ink-a': toHex(dark ? mix(A, WHITE, 0.25) : mix(A, BLACK, 0.42)), '--ink-b': toHex(dark ? mix(B, WHITE, 0.25) : mix(B, BLACK, 0.3)),
            '--on-accent': lum(M) > 0.58 ? '#1a1206' : '#ffffff', '--on-shadow': lum(M) > 0.58 ? 'none' : '0 1px 2px rgba(0,0,0,.3)',
            '--text-main': text, '--text-muted': muted, '--base': top, '--scrim': rgba(T, 0.42),
            '--scene': dark ? `${n.art(dark)} bottom / 100% 38% no-repeat, linear-gradient(180deg, ${top} 0%, ${bot} 100%)`
                // light themes: pale and muted. The sky is lightened, the gradient is short, and a soft white veil sits over the scenery so it reads as a quiet hint.
                : `linear-gradient(rgba(255,255,255,0.42), rgba(255,255,255,0.42)) bottom / 100% 38% no-repeat, ${n.art(dark)} bottom / 100% 38% no-repeat, linear-gradient(180deg, ${toHex(mix(T, WHITE, 0.55))} 0%, ${toHex(mix(hex2(bot), WHITE, 0.55))} 100%)`
        };
        if (!dark) { v['--base'] = toHex(mix(T, WHITE, 0.55)); v['--scrim'] = rgba(mix(T, WHITE, 0.55), 0.42); }
        if (dark) { v['--glass'] = 'rgba(14,24,34,0.50)'; v['--glass-hi'] = 'rgba(16,28,40,0.82)'; v['--glass-line'] = 'rgba(255,255,255,0.16)'; v['--sheen'] = 'rgba(255,255,255,0.12)'; v['--hairline'] = 'rgba(255,255,255,0.10)'; v['--track'] = 'rgba(255,255,255,0.13)'; v['--input-bg'] = 'rgba(255,255,255,0.08)'; v['--warning'] = '#ff7a6e'; }
        else { v['--warning'] = '#d63a34'; }
        return v;
    }

    /* ---- Fixed themes. Light stays light and dark stays dark: the phone's own dark setting never changes them. ---- */
    const FIXED = {
        flagship:  { label: 'Flagship Light', dark: false, sw: 'linear-gradient(135deg,#f6f7fa,#cfe2fb 70%,#5c9fe6)' },
        flagshipd: { label: 'Flagship Dark',  dark: true,  sw: 'linear-gradient(135deg,#2e323a,#17191d 60%,#3560bd)' },
        royal:     { label: 'Royal Gold',     dark: true,  sw: 'linear-gradient(135deg,#2a1c3c,#0e0b17 60%,#d9ad4c)' },
        midnight:  { label: 'Midnight Forest', dark: true, sw: 'linear-gradient(135deg,#123a2a,#07130e 60%,#2f9e6a)' },
        deepocean: { label: 'Deep Ocean',     dark: true,  sw: 'linear-gradient(135deg,#0c3a5a,#04121f 60%,#2b7fd6)' },
        ember:     { label: 'Ember Dusk',     dark: true,  sw: 'linear-gradient(135deg,#4a2420,#170c0b 60%,#e0523a)' },
        graphite:  { label: 'Graphite',       dark: true,  sw: 'linear-gradient(135deg,#3a3c40,#131415 60%,#8793a8)' }
    };
    const DEFAULT_LOOK = 'flagship';
    const isDarkLook = look => !!(FIXED[look] && FIXED[look].dark);
    // "Follow my phone": the phone says light or dark; we go to the last light or last dark theme used. The first dark is Flagship Dark when the light theme is Flagship, otherwise Graphite.
    function followTarget(prefs, phoneDark) {
        const cur = prefs.look || DEFAULT_LOOK;
        const ll = prefs.lastLight && !isDarkLook(prefs.lastLight) ? prefs.lastLight : (isDarkLook(cur) ? DEFAULT_LOOK : cur);
        const ld = prefs.lastDark && isDarkLook(prefs.lastDark) ? prefs.lastDark : ((ll === 'flagship' || ll === 'flagshipd') ? 'flagshipd' : 'graphite');
        return phoneDark ? ld : ll;
    }
    // remember the last light and the last dark theme the person used
    function remember(prefs) { const l = prefs.look || DEFAULT_LOOK; if (isDarkLook(l)) prefs.lastDark = l; else prefs.lastLight = l; }
    const FONTS = [['system', 'Phone default (San Francisco or Roboto)'], ['inter', 'Inter'], ['manrope', 'Manrope'], ['arial', 'Arial']];

    const set = new Set();
    function apply(prefs, o) {
        const rootEl = document.documentElement, dark = false, has = !!o.hasBg;   // only the fixed dark themes are dark; nothing else follows the phone
        const look = prefs.look || DEFAULT_LOOK, fixed = FIXED[look];
        // clear what an earlier look set
        set.forEach(k => rootEl.style.removeProperty(k)); set.clear();
        rootEl.setAttribute('data-look', NATURE[look] ? 'nature' : look);
        rootEl.setAttribute('data-scheme', fixed && fixed.dark ? 'dark' : 'light');
        if (look === 'flagship' || look === 'flagshipd') { rootEl.setAttribute('data-acc', prefs.accent === 'gold' ? 'gold' : 'sapphire'); rootEl.setAttribute('data-fl', FONTS.some(f => f[0] === prefs.flFont) ? prefs.flFont : 'system'); }
        else { rootEl.removeAttribute('data-acc'); rootEl.removeAttribute('data-fl'); }
        rootEl.classList.toggle('fl-glow', !!prefs.glow && !!fixed);
        // smooth backgrounds (nothing fine behind the cards): live blur of the card backdrop is invisible, so it is switched off to keep the phone cool
        // Paper and the nature themes: the blur would only hide a faint dot grid or soft hills, so a slightly more frosted tint does the same job without the cost
        if (!o.hasBg) rootEl.setAttribute('data-smooth', '1'); else rootEl.removeAttribute('data-smooth');
        if (!o.hasBg && !fixed && look !== 'aurora') { const gl = look === 'paper' ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.70)'; rootEl.style.setProperty('--glass', gl); set.add('--glass'); }
        const paper = document.getElementById('paper'), scene = document.getElementById('scene'), fx = document.getElementById('scene-fx');
        const bl = Math.max(0, +prefs.bgBlur || 0);
        rootEl.style.setProperty('--bg-blur', bl + 'px');
        paper.style.display = 'none'; scene.style.display = 'none'; fx.className = ''; fx.style.display = 'none';
        if (has || fixed) return;
        if (NATURE[look]) {
            const v = natureVars(look, dark); Object.keys(v).forEach(k => { rootEl.style.setProperty(k, v[k]); set.add(k); });
            scene.style.display = 'block'; scene.style.background = v['--scene'];
            const f = NATURE[look].fx; if (f && !o.lite) { fx.style.display = 'block'; fx.className = 'fx-' + f; }
        } else if (look === 'paper') {
            const p = Object.assign({}, PAPER_DEFAULTS, prefs.p || {}), { col, inkC } = paperVars(p, dark);
            paper.style.display = 'block'; paper.style.backgroundColor = toHex(col);
            const gap = Math.max(8, +p.dotGap || 24), a = Math.max(0.03, Math.min(0.9, (+p.dotAlpha || 22) / 100)), r = Math.max(0.3, +p.dotSize || 0.9);
            const topPx = p.mTop && p.mStyle !== 'none' ? Math.round((+p.mTopIn || 1.2) * 96) : 0;
            const pl = [], ps = [], pp = [];
            if (p.pattern === 'dots') { pl.push(`radial-gradient(circle, ${rgba(inkC, a)} ${r}px, transparent ${r + 0.55}px)`); ps.push(gap + 'px ' + gap + 'px'); pp.push((gap / 2) + 'px ' + (gap / 2) + 'px'); }
            else if (p.pattern === 'graph') { pl.push(`linear-gradient(${rgba(inkC, a)} 1px, transparent 1px)`, `linear-gradient(90deg, ${rgba(inkC, a)} 1px, transparent 1px)`); ps.push(gap + 'px ' + gap + 'px', gap + 'px ' + gap + 'px'); pp.push('0 0', '0 0'); }
            else if (p.pattern === 'ruled') { pl.push(`linear-gradient(${rgba(inkC, Math.min(0.9, a + 0.12))} 1px, transparent 1px)`); ps.push('100% ' + gap + 'px'); pp.push('0 0'); }
            const pat = paper.querySelector('.pm-pat');   // the pattern starts below the top margin line
            pat.style.top = topPx + 'px'; pat.style.backgroundImage = pl.join(','); pat.style.backgroundSize = ps.join(','); pat.style.backgroundPosition = pp.join(',');
            const layers = [], sizes = [], pos = [];
            if (p.texture) {
                if (p.paperColor === 'parched') { layers.push('radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(120,80,20,' + (dark ? 0.2 : 0.3) + ') 100%)'); sizes.push('100% 100%'); pos.push('0 0'); layers.push(FIBRE); sizes.push('260px 260px'); pos.push('0 0'); }
                else { layers.push(NOISE); sizes.push('240px 240px'); pos.push('0 0'); }
            }
            paper.style.backgroundImage = layers.join(','); paper.style.backgroundSize = sizes.join(','); paper.style.backgroundPosition = pos.join(',');
            const mc = (MARGINS.find(x => x[0] === p.mColor) || MARGINS[0])[2], ma = dark ? 0.5 : 0.55, line = rgba(mc, ma);
            const grad = p.mStyle === 'double' ? `linear-gradient(180deg, ${line} 0 1.5px, transparent 1.5px 4.5px, ${line} 4.5px 6px)` : `linear-gradient(180deg, ${line} 0 1.5px, transparent 1.5px)`;
            const gradV = p.mStyle === 'double' ? `linear-gradient(90deg, ${line} 0 1.5px, transparent 1.5px 4.5px, ${line} 4.5px 6px)` : `linear-gradient(90deg, ${line} 0 1.5px, transparent 1.5px)`;
            const top = paper.querySelector('.pm-top'), side = paper.querySelector('.pm-left');
            const showTop = p.mStyle !== 'none' && p.mTop, showSide = p.mStyle !== 'none' && p.mSide;
            top.style.display = showTop ? 'block' : 'none'; top.style.top = topPx + 'px'; top.style.backgroundImage = grad;
            side.style.display = showSide ? 'block' : 'none'; side.style.backgroundImage = gradV;
        }
    }
    root.GLook = { PAPERS, INKS, MARGINS, NATURE, PAPER_DEFAULTS, FIXED, FONTS, DEFAULT_LOOK, isDarkLook, followTarget, remember, apply, hex2 };
})(window);
