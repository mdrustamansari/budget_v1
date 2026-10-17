/* Rustam's Budget Manager, generation 2: screens, storage, security. The money rules live in engine.js. */
(function () {
    'use strict';
    const E = window.Engine;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAY = E.DAY;
    const $ = id => document.getElementById(id);
    // a screen is only rebuilt when what it shows has really changed: no needless repaint (and no re-blur of the glass) on the quiet minute refresh
    function put(el, h) { if (el.__h === h && el.firstChild) return false; el.__h = h; el.innerHTML = h; if (window.GSections) GSections.apply(el); return true; }
    const fmt = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const fmt2 = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const money = n => (n < 0 ? '-' : '') + '₹' + fmt(Math.abs(Math.round(n)));
    const mh = n => `<span class="priv">${money(n)}</span>`;
    const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    const fmtDay = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const fmtDT = ts => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const fx = n => { try { if (window.GFeel) GFeel.moment(n); } catch (e) {} };
    const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
    const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

    /* ---------- Storage: one event log + preferences ---------- */
    const K_EV = 'bm2_events', K_PREF = 'bm2_prefs', K_PIN = 'bm2_pin', K_BG = 'budgetApp_bg';
    const PREF_DEFAULT = () => ({
        theme: 'auto', look: 'flagship', accent: 'sapphire', glow: false, flFont: 'system', follow: false, lastLight: null, lastDark: null, p: {}, acc: [], bgBlur: 24, glassBlur: 20,
        introOn: true, greetOn: true, lineOn: true, smartOn: true, forecastOn: true, stripOn: true, animOn: true,
        remindOn: true, remindHour: 23, remindSnooze: null, lastBackup: null,
        lite: false, privacy: false, warnOn: true, dayCloseOn: true, waitOn: true, reviewOn: true, purchOn: true,
        autoLock: true, rememberPass: false, pass: '', pendingSeed: null, learnOn: true, orbMode: 'header'
    });
    let events = [], prefs = PREF_DEFAULT(), nextId = 1, D = null, screen = 'today', storageOK = true;

    function persist() {
        storageOK = save(K_EV, events) && save(K_PREF, prefs);
        if (!storageOK) toast('Could not save: the phone storage may be full');
    }
    function add(e, ts) {
        e.id = nextId++; e.ts = ts || Date.now();
        events.push(e); persist(); return e;
    }
    function refresh() { D = E.derive(events, Date.now()); return D; }
    function setEvents(list) {
        events = list.map(e => Object.assign({}, e));
        nextId = events.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1;
        events.forEach(e => { if (!e.id) e.id = nextId++; });
    }

    function firstRun() {
        const old = { state: load('budgetApp_state'), history: load('budgetApp_history'), purch: load('budgetApp_purch') };
        const om = load('budgetApp_meta');
        if (om && typeof om === 'object') {
            ['bgBlur', 'glassBlur'].forEach(k => { if (typeof om[k] === 'number') prefs[k] = om[k]; });
            ['introOn', 'greetOn', 'lineOn', 'animOn', 'remindOn'].forEach(k => { if (typeof om[k] === 'boolean') prefs[k] = om[k]; });
            if (om.theme === 'auto' || ['sky', 'marigold', 'dusk', 'forest'].indexOf(om.theme) >= 0) prefs.theme = om.theme;
            if (om.lastBackup) prefs.lastBackup = om.lastBackup;
        }
        let evs = [];
        if (old.state && Array.isArray(old.state.categories)) {
            evs = E.migrateV1(old, Date.now());
            const si = evs.findIndex(e => e.t === 'seed');
            if (si >= 0) { prefs.pendingSeed = evs[si]; evs.splice(si, 1); }
            prefs.migrated = true;
        } else evs = E.bootstrapEvents(Date.now());
        setEvents(evs.map((e, i) => Object.assign({ id: i + 1 }, e)));
        persist();
    }
    function initStore() {
        const ev = load(K_EV);
        const pf = load(K_PREF);
        if (pf && typeof pf === 'object') prefs = Object.assign(PREF_DEFAULT(), pf);
        // v2.13: the Flagship theme becomes the default once. An untouched Aurora or Paper look moves to it; a customised Paper page stays.
        if (!prefs.flagshipV) { prefs.flagshipV = 1; if (pf && (pf.look === 'aurora' || pf.look === 'paper' || !pf.look) && !(pf.p && Object.keys(pf.p).length)) prefs.look = 'flagship'; try { localStorage.setItem(K_PREF, JSON.stringify(prefs)); } catch (e) {} }
        if (Array.isArray(ev) && ev.length) setEvents(ev); else firstRun();
    }

    /* ---------- Themes ---------- */
    const THEMES = {
        sky: { label: 'Sky', part: 'Morning', mL: '#e3f5ff', mD: '#0a1322' },
        marigold: { label: 'Marigold', part: 'Afternoon', mL: '#fff6d6', mD: '#1a1305' },
        sunflower: { label: 'Sunflower', part: '', mL: '#fffbd0', mD: '#161305' },
        dusk: { label: 'Dusk', part: 'Evening', mL: '#efeafd', mD: '#0f0b22' },
        forest: { label: 'Parrot', part: '', mL: '#f1f8d8', mD: '#0c1405' }
    };
    function themeId() {
        if (THEMES[prefs.theme]) return prefs.theme;
        const h = new Date().getHours();
        return h >= 5 && h < 12 ? 'sky' : (h >= 12 && h < 17 ? 'marigold' : 'dusk');
    }
    function applyTheme() {
        const id = themeId(), root = document.documentElement;
        root.setAttribute('data-theme', id);
        const fx = GLook.FIXED[prefs.look], base = !fx ? null : ({ flagship: prefs.accent === 'gold' ? '#f7f6f2' : '#f6f7fa', flagshipd: prefs.accent === 'gold' ? '#18181a' : '#17191d', royal: '#0e0b17', midnight: '#07130e', deepocean: '#04121f', ember: '#170c0b', graphite: '#131415' })[prefs.look];
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', base || THEMES[id].mL));
        root.classList.toggle('lite', !!prefs.lite);
        root.classList.toggle('pm', !!prefs.privacy);
        root.style.setProperty('--glass-blur', prefs.glassBlur + 'px');
        applyBackground();
        try { GLook.apply(prefs, { hasBg: root.classList.contains('has-bg'), lite: !!prefs.lite }); } catch (e) {}
    }
    // "Follow my phone": only when the phone changes (or on switching it on, or at start) do we go to the last light or last dark theme used
    function phoneDark() { try { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; } }
    function followNow() {
        if (!prefs.follow) return; GLook.remember(prefs);
        const t = GLook.followTarget(prefs, phoneDark()); if (t !== prefs.look) { prefs.look = t; persist(); applyTheme(); if (D) render(); }
    }
    const hex2rgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mixRGB = (x, y, t) => x.map((v, i) => Math.round(v + (y[i] - v) * t));
    const rgb = (c, a) => a === undefined ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${a})`;
    function statusGrad(ratio) {
        let a = [31, 184, 245], b = [26, 100, 255], w = [224, 69, 63];
        try {
            const cs = getComputedStyle(document.documentElement), g = n => String(cs.getPropertyValue(n) || '').trim();
            if (/^#/.test(g('--blue-a'))) a = hex2rgb(g('--blue-a'));
            if (/^#/.test(g('--blue-b'))) b = hex2rgb(g('--blue-b'));
            if (/^#/.test(g('--warning'))) w = hex2rgb(g('--warning'));
        } catch (e) {}
        const t = Math.max(0, Math.min(1, (ratio - 0.5) / 0.5));
        const g1 = mixRGB(a, w, t), g2 = mixRGB(b, w, t);
        return { g1, g2, mid: mixRGB(g1, g2, 0.5) };
    }
    function applyBackground() {
        let data = null; try { data = localStorage.getItem(K_BG); } catch (e) {}
        const el = $('bg-layer'), root = document.documentElement;
        if (data) { el.style.backgroundImage = `url("${data}")`; el.style.filter = `blur(${prefs.bgBlur}px) saturate(1.2)`; root.classList.add('has-bg'); }
        else { el.style.backgroundImage = ''; root.classList.remove('has-bg'); }
    }
    function processWallpaper(file) {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => {
            let ok = false;
            for (const [max, q] of [[720, 0.75], [480, 0.65]]) {
                const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                try { localStorage.setItem(K_BG, c.toDataURL('image/jpeg', q)); ok = true; break; } catch (e) {}
            }
            URL.revokeObjectURL(url);
            if (ok) { applyBackground(); render(); toast('Background set'); } else toast('Could not save that photo');
        };
        img.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that image'); };
        img.src = url;
    }

    /* ---------- Toast and sheets ---------- */
    function toast(msg, undo) {
        if (window.GCompanion && typeof GC !== 'undefined' && GC && GC.respond && GCompanion.prefs.get().place !== 'off') { GC.respond(msg, { undo, tone: /^(Over|Blocked|Wrong|Enter|Could not|Too many|That is|More than|Encryption|A PIN|Open this)/i.test(msg) ? 'bad' : '' }); return; }
        const t = $('toast');
        t.innerHTML = `<span>${esc(msg)}</span>` + (undo ? '<button class="mini-btn" data-act="toast-undo">Undo</button>' : '');
        t.classList.toggle('act', !!undo);
        t._undo = undo || null;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), undo ? 6000 : 2600);
    }
    let sheetCloser = null;
    function sheet(html, onMount, opts) {
        const bg = $('sheet-bg'), box = $('sheet');
        box.innerHTML = html;
        bg.classList.add('show');
        box.scrollTop = 0;
        sheetCloser = (opts && opts.onClose) || null;
        if (onMount) onMount(box);
        const first = box.querySelector('[autofocus]'); if (first && !(opts && opts.noFocus)) setTimeout(() => { try { first.focus(); } catch (e) {} }, 60);
    }
    function closeSheet() { if (GC) GC.pose('none'); $('sheet-bg').classList.remove('show'); const f = sheetCloser; sheetCloser = null; if (f) f(); }
    // Icon-only Edit (Lucide square-pen) and Delete (Lucide trash-2): same size, tooltip and spoken label
    const ICO = { edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>', del: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>' };
    const icoBtn = (kind, attrs, what) => `<button type="button" class="ico-btn ico-${kind}" ${attrs} title="${kind === 'edit' ? 'Edit' : 'Delete'}" aria-label="${kind === 'edit' ? 'Edit' : 'Delete'} ${what}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[kind]}</svg></button>`;
    function confirmSheet(o) {
        return new Promise(res => {
            sheet(`<h2>${esc(o.title)}</h2><p>${esc(o.sub || '')}</p><div class="modal-actions"><button class="btn-secondary" data-r="0">${esc(o.cancel || 'Cancel')}</button><button class="${o.danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(o.ok || 'OK')}</button></div>`, box => {
                box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { sheetCloser = null; closeSheet(); res(b.dataset.r === '1'); });
            }, { onClose: () => res(false) });
        });
    }
    const val = (box, sel) => { const el = box.querySelector(sel); return el ? el.value : ''; };
    const numv = (box, sel) => { const v = parseFloat(val(box, sel)); return isFinite(v) ? v : NaN; };

    /* ---------- Daily lines ---------- */
    const LINES = {
        general: [
            ['A penny saved is a penny earned.', 'Proverb'],
            ['Waste not, want not.', 'Proverb'],
            ['Many a little makes a mickle.', 'Proverb'],
            ['Take care of the pennies, and the pounds will take care of themselves.', 'Proverb'],
            ['A small leak will sink a great ship.', 'Proverb'],
            ['Cut your coat according to your cloth.', 'Proverb'],
            ['Don\'t put all your eggs in one basket.', 'Proverb'],
            ['Don\'t count your chickens before they hatch.', 'Proverb'],
            ['Boond boond se sagar bharta hai: drop by drop, the ocean fills.', 'Hindi saying'],
            ['Apni chadar dekh kar pair phailao: stretch your feet only as far as your blanket reaches.', 'Hindi saying'],
            ['Enough is a blessing: ask for what feeds your family and the guest at your door.', 'After Kabir'],
            ['Contentment is the greatest wealth.', 'Old wisdom'],
            ['Rich is not having much; it is needing little.', 'Old wisdom'],
            ['Do not save what is left after spending; spend what is left after saving.', 'Old wisdom'],
            ['If you buy what you do not need, soon you will sell what you need.', 'Old wisdom'],
            ['The cheapest thing is the one you did not buy.', 'Old wisdom'],
            ['The best time to plant a tree was twenty years ago. The second best time is now.', 'Proverb'],
            ['Wealth is built in small steps, not in big leaps.', 'Old wisdom'],
            ['Spend less than you earn, and let time do the rest.', 'Old wisdom'],
            ['A budget is a promise to your future self.', 'Old wisdom'],
            ['Count it before you spend it, not after.', 'Old wisdom'],
            ['Save a little today; smile a lot tomorrow.', 'Old wisdom']
        ],
        tips: [
            ['Pay yourself first: set the saving aside before anything else.', 'Tip'],
            ['Try the 24-hour rule: wait a day before any non-essential purchase.', 'Tip'],
            ['Keep an emergency fund of three to six months of expenses.', 'Tip'],
            ['Needs first, wants later, and a little saved in between.', 'Tip'],
            ['Review your spending once a week; small corrections beat big repairs.', 'Tip'],
            ['When income rises, raise your savings before your lifestyle.', 'Tip'],
            ['Write wants on a list. Most of them fade within a week.', 'Tip'],
            ['Cash you can see leaving is easier to control than money you cannot feel.', 'Tip'],
            ['Every rupee gets a job: name it before you spend it.', 'Tip'],
            ['Avoid debt for things that lose value the moment you buy them.', 'Tip'],
            ['One simple split to start: half for needs, a third for wants, the rest for saving.', 'Tip'],
            ['Cook at home, carry water, walk when you can: small habits compound.', 'Tip']
        ],
        restrain: [
            ['Pause before you pay: is it a need, or a want in disguise?', 'Slow down'],
            ['Today\'s small yes can become next week\'s big no.', 'Slow down'],
            ['You are not behind; the next choice is a fresh start.', 'Slow down'],
            ['Before you buy, wait a day. Most wishes fade by morning.', 'Slow down'],
            ['Spending ahead of the calendar? Trim the small things first.', 'Slow down'],
            ['Cut your coat according to your cloth.', 'Proverb'],
            ['Waste not, want not.', 'Proverb']
        ],
        cheer: [
            ['Steady and under pace: this is how wealth is built.', 'Well done'],
            ['Every untouched rupee is a quiet win.', 'Well done'],
            ['Small, steady choices beat grand plans.', 'Well done'],
            ['Pay yourself first; then enjoy what remains without guilt.', 'Well done'],
            ['You are ahead of the calendar. Keep it gentle and keep it up.', 'Well done']
        ],
        cool: [
            ['The cheapest thing is the one you did not buy.', 'While you wait'],
            ['If the wish is real, it will still be there when the wait is over.', 'While you wait'],
            ['A waiting period is a gift: it turns an impulse into a decision.', 'While you wait']
        ]
    };
    let lineBump = 0;
    function lineContext() {
        if (!D.P) return 'general';
        if (D.P - D.cur.spent < 0 || (D.forecast.ready && D.forecast.free < 0)) return 'restrain';
        if (prefs.purchOn && D.cats.some(c => c.bucket.cool > 0) && new Date().getDate() % 4 === 0) return 'cool';
        if (D.forecast.ready && D.forecast.free > 0.08 * D.P) return 'cheer';
        return 'general';
    }
    function pickLine() {
        const now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / DAY), n = doy + lineBump;
        let ctx = lineContext();
        if (ctx === 'general' && n % 3 === 2) ctx = 'tips';
        const pool = LINES[ctx];
        return pool[((n % pool.length) + pool.length) % pool.length];
    }
    const greeting = () => { const h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', Rustam'; };

    /* ---------- Security: PIN and encrypted backups (WebCrypto) ---------- */
    const enc = new TextEncoder(), dec = new TextDecoder();
    const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const hasCrypto = () => !!(window.crypto && crypto.subtle);
    async function deriveKey(pass, salt, usage, iters) {
        const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usage);
    }
    async function encryptText(text, pass) {
        const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pass, salt, ['encrypt'], 200000);
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
        return { app: 'rustams-budget', v: 2, enc: true, kdf: 'PBKDF2-SHA256-200000', salt: b64(salt), iv: b64(iv), data: b64(ct) };
    }
    async function decryptText(obj, pass) {
        const key = await deriveKey(pass, unb64(obj.salt), ['decrypt'], 200000);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.data));
        return dec.decode(pt);
    }
    async function pinHash(pin, salt) {
        const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
        return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, 256));
    }
    async function setPin(pin) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        save(K_PIN, { salt: b64(salt), hash: await pinHash(pin, salt), len: pin.length });
    }
    async function checkPin(pin) {
        const p = load(K_PIN); if (!p) return true;
        return (await pinHash(pin, unb64(p.salt))) === p.hash;
    }
    const pinOn = () => !!load(K_PIN);

    let lockEntry = '', lockBusy = false, lockFails = 0, lockUntil = 0, lockResolve = null;
    function buildPad(el, onKey, dec) {
        el.innerHTML = ['1','2','3','4','5','6','7','8','9',dec ? '.' : '','0','⌫'].map(k => k === '' ? '<span></span>' : `<button type="button" data-k="${k}">${k}</button>`).join('');
        el.onclick = ev => { const b = ev.target.closest('[data-k]'); if (b) onKey(b.dataset.k); };
    }
    function drawDots() {
        const len = (load(K_PIN) || {}).len || 4;
        $('lock-dots').innerHTML = Array.from({ length: len }, (_, i) => `<i class="${i < lockEntry.length ? 'f' : ''}"></i>`).join('');
    }
    function showLock() {
        if (!pinOn() || !hasCrypto()) return Promise.resolve();
        if ($('lock').classList.contains('show')) return new Promise(r => { const f = lockResolve; lockResolve = () => { if (f) f(); r(); }; });
        lockEntry = ''; $('lock-msg').textContent = ''; drawDots();
        $('lock').classList.add('show');
        buildPad($('lock-pad'), async k => {
            if (lockBusy) return;
            if (Date.now() < lockUntil) { $('lock-msg').textContent = `Wait ${Math.ceil((lockUntil - Date.now()) / 1000)}s`; return; }
            if (k === '⌫') lockEntry = lockEntry.slice(0, -1); else if (lockEntry.length < 8) lockEntry += k;
            drawDots();
            const len = (load(K_PIN) || {}).len || 4;
            if (lockEntry.length >= len) {
                lockBusy = true;
                const ok = await checkPin(lockEntry);
                lockBusy = false;
                if (ok) { lockFails = 0; $('lock').classList.remove('show'); lockEntry = ''; const f = lockResolve; lockResolve = null; if (f) f(); render(); }
                else { lockFails++; lockEntry = ''; drawDots(); vibrate(80); $('lock-msg').textContent = 'Wrong PIN'; if (lockFails >= 5) { lockUntil = Date.now() + 30000; lockFails = 0; $('lock-msg').textContent = 'Too many tries. Wait 30 seconds.'; } }
            }
        });
        return new Promise(r => { lockResolve = r; });
    }

    /* ---------- Backups ---------- */
    function backupObject() {
        const p = Object.assign({}, prefs); delete p.pass; delete p.pendingSeed;
        return { app: 'rustams-budget', v: 2, exportedAt: new Date().toISOString(), events, prefs: p };
    }
    const backupBase = () => { const d = new Date(); return `budget-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    function markBackedUp() { prefs.lastBackup = Date.now(); prefs.remindSnooze = null; persist(); renderBanner(); if (screen === 'set') render(); }
    async function buildBackupText(pass) {
        const json = JSON.stringify(backupObject());
        if (!pass) return JSON.stringify(JSON.parse(json), null, 1);
        return JSON.stringify(await encryptText(json, pass));
    }
    function downloadText(text, name) {
        const blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    async function shareText(text, base) {
        let why = 'this browser cannot share files';
        if (navigator.share && typeof File === 'function') {
            for (const [name, type] of [[base + '.txt', 'text/plain'], [base + '.json', 'application/json']]) {
                let file; try { file = new File([text], name, { type }); } catch (e) { continue; }
                try { if (navigator.canShare && !navigator.canShare({ files: [file] })) { why = 'the phone would not accept the file'; continue; } } catch (e) {}
                try { await navigator.share({ files: [file], title: "Rustam's Budget Manager backup" }); return { ok: true }; }
                catch (e) { if (e && e.name === 'AbortError') return { cancelled: true }; why = (e && e.name) || 'an error'; }
            }
        }
        return { ok: false, why };
    }
    async function runBackup(mode, pass) {
        if (mode !== 'plain' && !hasCrypto()) { toast('Encryption needs the https page'); return; }
        const text = await buildBackupText(mode === 'plain' ? '' : pass);
        if (mode === 'download') { downloadText(text, backupBase() + '.json'); markBackedUp(); toast('Saved to your downloads'); return; }
        const r = await shareText(text, backupBase());
        if (r.cancelled) return;
        if (r.ok) { markBackedUp(); toast('Backup shared'); return; }
        downloadText(text, backupBase() + '.json'); markBackedUp();
        toast(`Share sheet could not open (${r.why}). Saved to Downloads; upload it from your Files app.`);
    }
    function backupSheet(mode) {
        const remembered = prefs.rememberPass && prefs.pass;
        if (mode === 'plain') { runBackup('plain'); return; }
        if (remembered && mode !== 'ask') { runBackup(mode || 'share', prefs.pass); return; }
        sheet(`<h2>Encrypted backup</h2><p>Choose a backup password. The file is locked with it, so Google Drive or Proton Drive only ever see scrambled data. Keep it safe: without it nobody can open the file, including you.</p>
            <label class="field"><span>Backup password</span><input type="password" id="bp" autocomplete="new-password" autofocus></label>
            <label class="field check"><input type="checkbox" id="bpr" ${prefs.rememberPass ? 'checked' : ''}><span>Remember it on this phone (faster daily backups)</span></label>
            <div class="error" id="bpe"></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="bpgo">Back up</button></div>`, box => {
            box.querySelector('#bpgo').onclick = async () => {
                const p = val(box, '#bp');
                if (p.length < 6) { box.querySelector('#bpe').textContent = 'Use at least 6 characters'; return; }
                prefs.rememberPass = box.querySelector('#bpr').checked; prefs.pass = prefs.rememberPass ? p : ''; persist();
                closeSheet(); await runBackup(mode === 'ask' ? 'share' : (mode || 'share'), p);
            };
        });
    }
    async function restoreFile(file) {
        let text; try { text = await file.text(); } catch (e) { toast('Could not read that file'); return; }
        let obj; try { obj = JSON.parse(text); } catch (e) { toast('That file is not a valid backup'); return; }
        let payload = null;
        if (obj && obj.enc && obj.app === 'rustams-budget') {
            if (!hasCrypto()) { toast('Open this on the https page to decrypt'); return; }
            sheet(`<h2>Backup password</h2><p>This backup is encrypted.</p><label class="field"><span>Password</span><input type="password" id="rp" autofocus></label><div class="error" id="rpe"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="rpgo">Unlock</button></div>`, box => {
                box.querySelector('#rpgo').onclick = async () => {
                    try { payload = JSON.parse(await decryptText(obj, val(box, '#rp'))); } catch (e) { box.querySelector('#rpe').textContent = 'Wrong password, or the file is damaged'; return; }
                    closeSheet(); applyRestore(payload);
                };
            });
        } else if (obj && obj.app === 'rustams-budget' && Array.isArray(obj.events)) applyRestore(obj);
        else if (obj && obj.app === 'minimal-budget' && obj.state) {
            const evs = E.migrateV1({ state: obj.state, history: obj.history, purch: obj.purch }, Date.now());
            applyRestore({ events: evs, old: true, exportedAt: obj.exportedAt });
        } else toast('That file is not a valid backup');
    }
    async function applyRestore(p) {
        const when = p.exportedAt ? fmtDay(new Date(p.exportedAt).getTime()) : 'an unknown date';
        if (!await confirmSheet({ title: 'Restore backup?', sub: `This replaces everything in the app now with the backup from ${when}.`, ok: 'Restore', danger: true })) return;
        let evs = p.events.slice();
        prefs.pendingSeed = null;
        if (p.old) { const si = evs.findIndex(e => e.t === 'seed'); if (si >= 0) { prefs.pendingSeed = evs[si]; evs.splice(si, 1); } evs = evs.map((e, i) => Object.assign({ id: i + 1 }, e)); }
        setEvents(evs);
        if (p.prefs) { const keep = { pass: prefs.pass, rememberPass: prefs.rememberPass }; prefs = Object.assign(PREF_DEFAULT(), p.prefs, keep); }
        persist(); applyTheme(); render(); toast('Backup restored');
    }

    /* ---------- Rendering helpers ---------- */
    const cd = d => d >= 60 ? `${Math.round(d / 30)} mo` : `${d}d`;
    function renderBanner() {
        const el = $('banner'), h = new Date().getHours(), out = [];
        if (D.pendingClose) out.push(`<div class="banner"><span>${MONTHS[D.pendingClose.m]} ended with ${mh(D.pendingClose.left)} unspent. Decide where it goes.</span><span class="b-act"><button class="on" data-act="close-month">Decide</button></span></div>`);
        if (D.needPlan) out.push(`<div class="banner"><span>Set up ${MONTHS[D.cur.m]} to start.</span><span class="b-act"><button class="on" data-act="plan">Set up</button></span></div>`);
        const due = prefs.remindOn && (h >= prefs.remindHour || h < 4) && !(prefs.lastBackup && Date.now() - prefs.lastBackup < 18 * 3600e3) && !(prefs.remindSnooze && Date.now() < prefs.remindSnooze);
        if (due) out.push(`<div class="banner"><span>🌙 It's late. Back up today's entries?</span><span class="b-act"><button data-act="b-later">Later</button><button class="on" data-act="b-now">Back up</button></span></div>`);
        el.innerHTML = out.join('');
    }
    // spoken details: tap a graphic and the Companion explains it in a sentence or two (no amounts when privacy mode is on)
    const tl = (text, tone) => ` data-tell="${esc(text)}"${tone ? ` data-tone="${tone}"` : ''}`;
    const mTell = v => prefs.privacy ? 'an amount you have hidden' : money(v);
    function ringSvg(ratio) {
        const r = Math.max(0, Math.min(1, ratio)), g = statusGrad(ratio);
        return `<div class="ring"><svg viewBox="0 0 80 80"><circle class="ring-track" cx="40" cy="40" r="36" fill="none" stroke-width="7"/><circle class="ring-arc" cx="40" cy="40" r="36" fill="none" stroke-width="7" stroke-linecap="round" stroke="${rgb(g.mid)}" stroke-dasharray="${(r * 226.2).toFixed(1)} 226.2"/></svg><div class="ring-center"><div class="ring-pct">${Math.round(ratio * 100)}%</div><div class="ring-cap">used</div></div></div>`;
    }
    const catTell = (c, ratio) => c.limit > 0 ? (prefs.privacy ? `${c.name} has used ${Math.round(ratio * 100)}% of its limit.` : `${c.name}: ${money(c.spent)} of ${money(c.limit)} used. ${c.spent > c.limit ? money(c.spent - c.limit) + ' over.' : money(c.limit - c.spent) + ' left.'}`) : `${c.name} has no limit set.`;
    function catCard(c, i) {
        const ratio = c.limit > 0 ? c.spent / c.limit : (c.spent > 0 ? 1 : 0), g = statusGrad(ratio), over = c.spent > c.limit && c.limit > 0;
        const left = c.limit - c.spent;
        const wait = prefs.purchOn && c.bucket.cool > 0 ? `<span class="cd-chip">wait ${cd(c.bucket.cool)}</span>` : '';
        return `<div class="cat-item2" data-id="${c.id}" data-act="entry" style="--i:${i};--g1:${rgb(g.g1)};--g2:${rgb(g.g2)};--glow:${rgb(g.mid, 0.35)}">
            <div class="cat-meta" style="min-width:0"><div class="cat-name"><span class="cat-ico">${esc(c.icon)}</span>${esc(c.name)}${wait}</div>
            <div class="cat-bar" data-tell-first="1"${tl(catTell(c, ratio), over ? 'bad' : '')}><div style="width:${Math.min(100, ratio * 100)}%"></div></div></div>
            <div class="cat-spent priv" style="${over ? 'color:var(--warning)' : ''}">${money(c.spent)}</div>
            <div class="cat-nums ${over ? 'over' : ''}"><span class="priv">${over ? money(-left) + ' over' : money(left) + ' left'} · ${money(c.limit)}</span></div>
            <button class="add-btn sm" data-act="${c.type === 'fixed' && c.price > 0 ? 'quick' : 'entry'}" data-id="${c.id}" aria-label="Add">+</button></div>`;
    }
    function avgPerDay() { const d = Math.max(1, D.today.day); return Math.round(D.cur.spent / d); }
    function overdrawnAmt() { return D.cats.reduce((t, c) => t + (c.limit > 0 && c.spent > c.limit ? c.spent - c.limit : 0), 0); }
    function paceLine() {
        const T = D.today, P = D.P, d = T.day;
        if (d < 3) return 'Early in the month: the pace estimate appears after day 3.';
        let lump = 0, rest = 0;
        D.cats.forEach(c => { if (c.type === 'fixed' && c.limit > 0 && c.price >= 0.5 * c.limit) lump += c.spent; else rest += c.spent; });
        const diff = P - (lump + rest / d * T.dm), r = Math.round(Math.abs(diff) / 10) * 10;
        return diff >= 0 ? `At this pace you'll finish with about ${mh(r)} to spare.` : `At this pace you'll overshoot the pool by about ${mh(r)}.`;
    }
    function ringTell(P, spent, left, pct, daysLeft) {
        if (left < 0) return prefs.privacy ? 'You have used more than this month\'s pool. No blame. Slow down for now.' : `You have gone ${money(-left)} past this month's pool. No blame. Slow down for now.`;
        return prefs.privacy ? `You have used ${Math.round(pct)}% of this month's pool, with ${plural(daysLeft, 'day')} to go.` : `You have used ${Math.round(pct)}% of the pool. ${money(left)} is left for ${plural(daysLeft, 'day')}.`;
    }
    function paceTell(pct, elapsed) {
        const d = pct - elapsed;
        return d > 8 ? 'The bar is your spending and the tick is the calendar. Spending is ahead, so slow down a little.' : d < -8 ? 'The bar is your spending and the tick is the calendar. You are well behind it, which is good.' : 'The bar is your spending and the tick is the calendar. They are close: a steady pace.';
    }
    function dashCard() {
        const T = D.today, P = D.P, spent = D.cur.spent, left = P - spent, ratio = P > 0 ? spent / P : 1, g = statusGrad(ratio);
        const pct = Math.max(0, Math.min(ratio * 100, 100)), elapsed = ((T.day - 1) + new Date().getHours() / 24) / T.dm * 100;
        const daysLeft = T.dm - T.day + 1, over = overdrawnAmt();
        const C = 2 * Math.PI * 36;
        const sorted = D.cats.slice().sort((a, b) => (b.count || 0) - (a.count || 0) || a.id - b.id).slice(0, 3);
        const chips = sorted.map(c => { const r = c.limit > 0 ? c.spent / c.limit : (c.spent > 0 ? 1 : 0); return `<div class="fchip" data-act="entry" data-id="${c.id}"><span class="dot" style="background:${rgb(statusGrad(r).mid)}"></span><span class="cat-ico">${esc(c.icon)}</span>${esc(c.name)}</div>`; }).join('');
        let pch = '';
        if (prefs.purchOn) {
            const bal = D.pool.bal, waiting = D.cats.filter(c => c.bucket && c.bucket.cool > 0).length, used = bal < (D.pool.min || 0);
            pch = `<div class="fchip pchip${used ? ' bad' : ''}" data-act="goto" data-s="mind"><span>🛍️ Big purchases · ${used ? 'pool used up this month' : mh(bal) + ' left this month'}${waiting ? ` · ${waiting} waiting` : ''}</span></div>`;
        }
        return `<div class="card panel"><div class="panel-top"><div class="label">Pool ${mh(P)}</div><div class="pill">${plural(daysLeft, 'day')} left</div></div>
            <div class="hero-row"><div><div class="total-remaining priv ${left < 0 ? 'bad' : ''}" id="safe-val">${left < 0 ? '-' : ''}${money(Math.abs(left))}</div><div class="hint">left this month</div></div>
            <div class="ring"${tl(ringTell(P, spent, left, pct, daysLeft))}><svg viewBox="0 0 84 84" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rgb(g.g1)}"/><stop offset="1" stop-color="${rgb(g.g2)}"/></linearGradient></defs><circle class="ring-track" cx="42" cy="42" r="36" fill="none" stroke-width="8"/><circle class="ring-arc" cx="42" cy="42" r="36" fill="none" stroke="url(#ringGrad)" stroke-width="8" stroke-linecap="${pct > 0 ? 'round' : 'butt'}" stroke-dasharray="${(pct / 100) * C} ${C}"/></svg><div class="ring-center"><div class="ring-pct">${Math.round(pct)}%</div><div class="ring-cap">used</div></div></div></div>
            <div class="pace"${tl(paceTell(pct, elapsed))}><div class="progress-container"><div class="progress-bar" style="width:${pct}%;background:linear-gradient(90deg,${rgb(g.g1)},${rgb(g.g2)})"></div></div><div class="pace-tick" style="left:${elapsed}%"></div></div>
            <div class="hint" style="margin-top:8px"${tl(`Today is day ${T.day} of ${T.dm}. ${plural(T.dm - T.day, 'day')} after today.`)}>Day ${T.day} of ${T.dm}</div>
            ${prefs.forecastOn ? `<div class="pace-note">${paceLine()}</div>` : ''}
            <div class="tiles"><div class="tile t1"${tl(`Spent is everything you have paid out this month: ${mTell(spent)}.`)}><div class="t-label">Spent</div><div class="t-val priv">${money(spent)}</div></div><div class="tile t2"${tl(`Per day is your average so far: ${mTell(avgPerDay())} a day.`)}><div class="t-label">Per day</div><div class="t-val priv">${money(avgPerDay())}</div></div><div class="tile t3${over > 0 ? ' bad' : ''}"${tl(over > 0 ? `Overdrawn adds up how far envelopes went past their limits: ${mTell(over)}.` : 'Overdrawn is zero. No envelope has gone past its limit.', over > 0 ? 'bad' : '')}><div class="t-label">Overdrawn</div><div class="t-val priv">${money(over)}</div></div></div>
            ${todayGauge()}
            <div class="freq">${chips}</div>${pch}</div>`;
    }
    // The five most used categories stay on top, in order of use. The rest rest under a small arrow.
    // ---- today against yesterday, and your last entry
    const dk = ts => { const d = new Date(ts); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };
    function dayTotal(ts) { const k = dk(ts); let t = 0; D.months.forEach(r => r.exps.forEach(e => { if (e.kind !== 'adjust' && dk(e.ts) === k) t += e.amt; })); return t; }
    const whenWords = ts => {
        const d = new Date(ts), t0 = new Date().setHours(0, 0, 0, 0), days = Math.round((t0 - new Date(ts).setHours(0, 0, 0, 0)) / 864e5);
        const tm = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
        const day = days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? 'on ' + d.toLocaleDateString('en-GB', { weekday: 'long' }) : 'on ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
        return `${day} at ${tm}`;
    };
    function tornStrip() {
        const next = () => { lineBump++; return pickLine(); };
        let last = null; D.months.forEach(r => r.exps.forEach(e => { if (e.kind !== 'adjust' && e.kind !== 'import' && (!last || e.ts > last.ts)) last = e; }));
        if (!last) return GBanner.html({ last: null, tips: prefs.lineOn, next });
        const txt = prefs.privacy ? `Your last entry was ${whenWords(last.ts)}.` : `Your last entry was <b class="priv">${money(last.amt)}</b> for <b>${esc(last.name)}</b>, ${whenWords(last.ts)}.`;
        return GBanner.html({ last: { html: txt, tell: prefs.privacy ? 'Your last entry.' : `${last.name}: ${money(last.amt)}, ${whenWords(last.ts)}.` }, tips: prefs.lineOn, next });
    }
    let moreOpen = false;
    function catsHTML() {
        const L = D.cats, TOP = 5;
        if (L.length <= TOP + 1) return L.map(catCard).join('');
        const top = L.slice(0, TOP), rest = L.slice(TOP);
        const unused = rest.filter(c => !c.uses).length;
        const hint = unused === rest.length ? 'not used lately' : 'used less';
        return top.map(catCard).join('') + `<div class="cat-more${moreOpen ? ' open' : ''}" id="cat-more"><button class="more-btn" data-act="more" aria-expanded="${moreOpen}"><i class="tri" aria-hidden="true"></i><span>${rest.length} more · ${hint}</span></button><div class="more-wrap"><div class="more-in">${rest.map((c, i) => catCard(c, i + TOP)).join('')}</div></div></div>`;
    }
    function renderToday() {
        const T = D.today, P = D.P, el = $('s-today');
        let h = '';
        if (!P) {
            h += `<div class="card"><h3>Welcome</h3><p class="hint">Tell the app your bank balance and this month's budget. Everything else follows from that.</p><button class="btn-line btn-accent" data-act="plan">Set up ${MONTHS[D.cur.m]}</button></div>`;
        } else {
            h += tornStrip() + dashCard();
        }
        if (prefs.dayCloseOn && P && new Date().getHours() >= 18 && !D.dayCloses.has(T.key)) h += `<div class="banner"><span>Close today? ${D.streak ? `Streak: ${plural(D.streak, 'day')}.` : ''}</span><span class="b-act"><button class="on" data-act="dayclose">Close day</button></span></div>`;
        else if (D.streak > 1) h += `<div class="streak" data-sec="today:streak" style="margin:0 0 10px 4px">🔥 ${plural(D.streak, 'day')} of closed days</div>`;
        h += `<div class="list-header"><span>Categories</span><span class="hint">tap + to add</span></div><div id="cats">${catsHTML()}</div>`;
        const before = {};
        if (prefs.animOn && !reduced()) el.querySelectorAll('.cat-item2').forEach(n => { before[n.dataset.id] = n.getBoundingClientRect().top; });
        put(el, h);
        if (prefs.animOn && !reduced() && Object.keys(before).length && el.animate !== undefined) {
            el.querySelectorAll('.cat-item2').forEach(n => {
                const b = before[n.dataset.id]; if (b === undefined) return;
                const dy = b - n.getBoundingClientRect().top; if (!dy) return;
                try { n.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 750, easing: 'cubic-bezier(0.22,0.8,0.25,1)' }); } catch (e) {}
            });
        }
    }

    // The ledger: every day with its total, then that day's entries. Each entry can be fixed or deleted (and both can be undone).
    let ledDays = 14, ledEdit = 0;
    const ledTime = ts => new Date(ts).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' am', ' am').replace(' pm', ' pm');
    function ledgerEntries() { const out = []; D.months.forEach(r => r.exps.forEach(e => { if (e.kind !== 'import') out.push(e); })); return out.sort((a, b) => b.ts - a.ts); }
    function monthLedger() {
        const all = ledgerEntries(); if (!all.length) return '<p class="hint">Nothing yet.</p>';
        const t0 = E.startOfDay(Date.now()), shown = all.filter(e => e.ts >= t0 - (ledDays - 1) * 864e5), older = all.length - shown.length;
        if (!shown.length) return `<p class="hint">Nothing in the last ${ledDays} days.</p><button type="button" class="btn-line" data-act="led-more">Show older (${older})</button>`;
        const days = []; shown.forEach(e => { const k = E.dateKey(e.ts); let d = days[days.length - 1]; if (!d || d.k !== k) { d = { k, ts: e.ts, list: [], sum: 0 }; days.push(d); } d.list.push(e); if (e.kind !== 'adjust') d.sum += e.amt; });
        const dn = ts => new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
        const row = e => {
            const meta = `${ledTime(e.ts)} · ${e.acct === 'cash' ? 'Cash' : 'Bank'}${e.note ? ' · ' + esc(e.note) : ''}${e.kind === 'adjust' ? ' · adjustment' : ''}`;
            if (ledEdit === e.id) return `<div class="ledger-row led-edit" data-id="${e.id}"><div style="min-width:0;flex:1"><div>${esc(e.icon)} ${esc(e.name)}</div>
                <div class="led-form"><input type="number" inputmode="decimal" step="any" id="led-amt" value="${e.amt}" aria-label="Amount"><select id="led-acct" aria-label="Paid from"><option value="bank"${e.acct !== 'cash' ? ' selected' : ''}>Bank</option><option value="cash"${e.acct === 'cash' ? ' selected' : ''}>Cash</option></select><input type="text" id="led-note" value="${esc(e.note || '')}" placeholder="Note" aria-label="Note"></div>
                <div class="led-btns"><button type="button" class="mini-btn btn-accent" data-act="led-save" data-id="${e.id}">Save</button><button type="button" class="mini-btn" data-act="led-cancel">Cancel</button></div></div></div>`;
            return `<div class="ledger-row" data-id="${e.id}"><div style="min-width:0"><div>${esc(e.icon)} ${esc(e.name)}${e.pur ? ' · big' : ''}</div><div class="meta">${meta}</div></div><div class="row" style="gap:6px"><b class="num priv">${money(e.amt)}</b>${icoBtn('edit', `data-act="led-edit" data-id="${e.id}"`, esc(e.name))}${icoBtn('del', `data-act="led-del" data-id="${e.id}"`, esc(e.name))}</div></div>`;
        };
        return days.map(d => `<div class="led-day"><span>${dn(d.ts)}</span><span class="priv">${money(d.sum)} · ${plural(d.list.length, 'entry').replace('entrys', 'entries')}</span></div>${d.list.map(row).join('')}`).join('')
            + (older > 0 ? `<button type="button" class="btn-line" data-act="led-more">Show older (${older})</button>` : '');
    }
    const ledFind = id => { let f = null; D.months.forEach(r => r.exps.forEach(e => { if (e.id === id) f = e; })); return f; };
    const ledCopy = (e, over) => { const c = Object.assign({}, e, over || {}); delete c.id; delete c.ts; return c; };
    function renderMonth() {
        const P = D.P, c = D.cur;
        let h = `<div class="card"><h3>${MONTHS[c.m]} ${c.y}</h3>`;
        if (P) h += `<div class="row"><span class="muted">Budget</span><b class="num">${mh(P)}</b></div><div class="row"><span class="muted">Spent</span><b class="num">${mh(c.spent)}</b></div><div class="row"><span class="muted">Left</span><b class="num ${P - c.spent < 0 ? 'bad' : ''}">${mh(P - c.spent)}</b></div>
            <div class="row"><span class="muted">Bank balance</span><b class="num priv ${D.accounts.bank < 0 ? 'bad' : ''}">${money(D.accounts.bank)}</b></div><div class="row"><span class="muted">Cash in hand</span><b class="num priv ${D.accounts.cash < 0 ? 'bad' : ''}">${money(D.accounts.cash)}</b></div>
            <div class="row"><span class="muted">Bank · Cash spent</span><span class="priv">${money(c.byAcct.bank)} · ${money(c.byAcct.cash)}</span></div>
            <div class="grid2 mt"><button class="btn-line" data-act="plan">Edit plan</button><button class="btn-line" data-act="check">Reality check</button></div>`;
        else h += `<button class="btn-line btn-accent" data-act="plan">Set up ${MONTHS[c.m]}</button>`;
        h += `</div><div class="card" data-sec="month:money-moves"><h3>Money moves</h3><p class="hint">Record cash you withdraw or deposit so Bank and Cash stay true.</p><div class="grid2"><button class="btn-line" data-act="xfer" data-dir="b2c">Bank → Cash</button><button class="btn-line" data-act="xfer" data-dir="c2b">Cash → Bank</button></div></div>`;
        h += `<div class="card" data-sec="month:savings"><h3>Savings</h3><div class="row"><b class="num" style="font-size:1.8rem">${mh(D.savings)}</b><span class="hint">stays in your bank</span></div><div class="grid2 mt"><button class="btn-line" data-act="sav" data-dir="in">Add</button><button class="btn-line" data-act="sav" data-dir="out">Withdraw</button></div>
            ${D.savLog.slice(-4).reverse().map(s => `<div class="ledger-row"><span class="meta">${fmtDay(s.ts)} · ${esc(s.note || (s.amt > 0 ? 'Deposit' : 'Withdrawal'))}</span><b class="priv">${money(s.amt)}</b></div>`).join('')}</div>`;
        h += `<div class="card"><h3>Envelopes</h3>${D.cats.map(k => { const r = k.limit > 0 ? k.spent / k.limit : 0, g = statusGrad(r); return `<div class="env"${tl(catTell(k, r), k.spent > k.limit ? 'bad' : '')}><div class="top"><span>${esc(k.icon)} ${esc(k.name)}</span><span class="priv ${k.spent > k.limit ? 'bad' : ''}">${money(k.spent)} / ${money(k.limit)}</span></div><div class="cat-bar"><div style="width:${Math.min(100, r * 100)}%;background:linear-gradient(90deg,${rgb(g.g1)},${rgb(g.g2)})"></div></div></div>`; }).join('')}</div>`;
        h += `<div class="card"><h3>Ledger</h3>${monthLedger()}</div>`;
        put($('s-month'), h);
    }

    function renderMind() {
        const p = D.pool;
        let h = `<div class="card"><h3>Big-purchase pool</h3><div class="row"><b class="num" style="font-size:2rem">${mh(p.bal)}</b><span class="hint">available now</span></div>
            <p class="hint mt">${mh(p.allow)} arrives each month. Unused money carries forward. Spending of ${mh(p.min)} or more counts as a big purchase and needs a reason. Used this month: ${mh(p.used)}.</p></div>`;
        const waits = D.cats.filter(c => c.bucket.allow > 0).sort((a, b) => b.bucket.cool - a.bucket.cool || b.bucket.bal - a.bucket.bal);
        h += `<div class="card" data-sec="mind:waiting-by-category"><h3>Waiting by category</h3>${waits.map(c => `<div class="ledger-row"><div><div>${esc(c.icon)} ${esc(c.name)}</div><div class="meta">${c.bucket.cool > 0 ? 'Opens ' + fmtDay(c.bucket.until) : 'Open now'} · grows ${money(c.bucket.allow)}/month</div></div><div class="right"><b class="num ${c.bucket.cool > 0 ? 'bad' : 'good'}">${c.bucket.cool > 0 ? plural(c.bucket.cool, 'day') : mh(c.bucket.bal)}</b></div></div>`).join('') || '<p class="hint">No category has an allowance yet.</p>'}</div>`;
        const wantCard = prefs.waitOn ? `<div class="card"><h3>Want list</h3><p class="hint">Write wants down. Each waits 24 hours before you can buy it.</p>${D.wants.filter(w => w.status === 'wait').map(w => { const left = w.ts + DAY - Date.now(); return `<div class="want"><div class="row"><span>${esc(w.name)}</span><b class="num priv">${money(w.price)}</b></div><div class="row mt"><span class="meta muted">${left > 0 ? 'Wait ' + Math.ceil(left / 3600e3) + 'h more' : 'Ready if you still want it'}</span><span><button class="mini-btn" data-act="want-drop" data-id="${w.wid}">Drop it</button> <button class="mini-btn" data-act="want-buy" data-id="${w.wid}" ${left > 0 ? 'disabled style="opacity:.4"' : ''}>Buy</button></span></div></div>`; }).join('') || '<p class="hint">Empty.</p>'}<button class="btn-line" data-act="want-add">Add a want</button></div>` : '';
        h += wantCard;
        if (prefs.reviewOn) {
            const due = D.purchases.filter(x => !x.review && Date.now() - x.ts >= 30 * DAY);
            if (due.length) h += `<div class="card"><h3>Still glad?</h3>${due.slice(0, 3).map(x => `<div class="want"><div class="row"><span>${esc(x.icon)} ${esc(x.catName)} · ${fmtDay(x.ts)}</span><b class="priv">${money(x.total)}</b></div><div class="p-reason">“${esc(x.reason)}”</div><div class="review-row"><button data-act="rev" data-id="${x.id}" data-v="yes">Yes</button><button data-act="rev" data-id="${x.id}" data-v="meh">Meh</button><button data-act="rev" data-id="${x.id}" data-v="no">No</button></div></div>`).join('')}</div>`;
        }
        h += `<div class="card"><h3>Purchases</h3>${D.purchases.slice(0, 30).map(x => `<div class="pitem"><div class="pi-top"><span>${esc(x.icon)} ${esc(x.catName)}</span><b class="priv">${money(x.total)}</b></div><div class="meta muted">${fmtDay(x.ts)}${x.emg ? ' · emergency' : ''}${x.review ? ' · ' + ({ yes: 'glad', meh: 'unsure', no: 'regret' })[x.review] : ''}</div>${x.reason ? `<div class="p-reason">“${esc(x.reason)}”</div>` : ''}</div>`).join('') || '<p class="hint">No big purchases yet.</p>'}</div>`;
        put($('s-mind'), h);
    }



    /* ================= Version 2.3: the Circle Companion and today's spending gauge ================= */
    let GC = null, lastScreen = null, prevLeft = null;
    // today's spend against your usual day: the average of this month's earlier days (today does not judge itself)
    function dayAvg() { const T = D.today; if (!D.P || T.day < 3) return null; return Math.max(0, (D.cur.spent - T.spent) / (T.day - 1)); }
    // a thin line on the gauge that shows what yesterday cost
    function yMark(avg) {
        const y = dayTotal(Date.now() - 864e5), p = Math.min(100, y / (2 * avg) * 100);
        return `<b class="tg-y" style="left:${p}%;--sh:${p < 16 ? '-10%' : p > 84 ? '-90%' : '-50%'}"><em class="priv">yesterday ${prefs.privacy ? '' : money(y)}</em></b>`;
    }
    function todayGauge() {
        const T = D.today, avg = dayAvg(), spent = T.spent;
        if (avg === null || avg < 1) return `<div class="tg"${tl('This shows today against your average day. The average appears after day 3.')}><div class="row"><span class="label">Today so far</span><span class="priv"><b>${money(spent)}</b></span></div><div class="hint">Yesterday: <span class="priv">${money(dayTotal(Date.now() - 864e5))}</span>. Your daily average appears after day 3.</div></div>`;
        const r = spent / avg, diff = Math.abs(spent - avg), pct = Math.min(100, spent / (2 * avg) * 100);
        const kind = r <= 1 ? 'down' : r <= 1.5 ? 'up' : 'high';
        const note = spent === 0 ? 'Nothing spent yet today.' : r <= 1 ? `▼ ${money(diff)} below your average` : `▲ ${money(diff)} above your average`;
        const say = spent === 0 ? 'You have spent nothing today.' : r <= 1 ? (prefs.privacy ? 'Today is below your usual day. Good.' : `Today you spent ${money(spent)}. That is below your usual ${money(avg)}.`) : (prefs.privacy ? 'Today is above your usual day.' : `Today you spent ${money(spent)}. Your usual day is ${money(avg)}.`);
        return `<div class="tg ${kind}"${tl(say + (prefs.privacy ? '' : ` Yesterday you spent ${money(dayTotal(Date.now() - 864e5))}. The thin line on the bar shows it.`), r > 1.5 ? 'bad' : '')}><div class="row"><span class="label">Today so far</span><span class="tg-note">${esc(note)}</span></div>
            <div class="tg-track" style="margin-top:18px"><i class="tg-fill grow" style="width:${pct}%"></i><b class="tg-mark" style="left:50%"></b>${yMark(avg)}</div>
            <div class="tg-scale"><span class="priv">${money(spent)} today</span><span>average ${mh(avg)}</span></div></div>`;
    }
    function budgetMood() {
        if (!D.P) return 'calm';
        const left = D.P - D.cur.spent, avg = dayAvg(), T = D.today, ratio = D.P > 0 ? D.cur.spent / D.P : 1, frac = (T.day - 1 + new Date().getHours() / 24) / T.dm;
        if (left < 0) return 'concerned';
        if (avg !== null && avg > 0 && T.spent > avg * 1.5) return 'thoughtful';
        if (ratio > frac + 0.2) return 'thoughtful';
        if (T.spent > 0 && avg !== null && T.spent <= avg && ratio < frac) return 'content';
        if (ratio < frac - 0.08) return 'happy';
        return 'calm';
    }
    function orbMessage() {
        if (!D.P) return 'Set up your month and I will keep you company.';
        const left = D.P - D.cur.spent, avg = dayAvg(), T = D.today;
        if (left < 0) return 'You are past this month\'s pool. No blame. Let us find a calm way forward.';
        if (avg !== null && avg > 0 && T.spent > avg * 1.5) return 'Today is well above your usual. A short pause may help.';
        if (avg !== null && T.spent > 0 && T.spent <= avg) return 'A light day so far. Nicely done.';
        return 'I am here. Nothing needs your attention right now.';
    }
    // a data-based tip for the Companion to say when poked or when it chooses to speak (null = it uses a proverb or tip instead)
    function orbTip() { const m = orbMessage(); return m.indexOf('I am here') === 0 ? null : m; }
    const SCREEN_ACT = { ins: 'present', month: 'read', mind: 'think', set: 'stand' };
    function renderCompanion() {
        if (!window.GCompanion || !$('orb')) return;
        if (!GC) GC = window.GCompanion.create($('orb'), { legacyPlace: prefs.orbMode, tip: orbTip, busy: () => $('sheet-bg').classList.contains('show') });
        GC.mood(budgetMood());
        if (screen !== lastScreen) { if (lastScreen && SCREEN_ACT[screen] && !GC.state().action) GC.do(SCREEN_ACT[screen]); lastScreen = screen; }
        const left = D.P ? D.P - D.cur.spent : null;
        if (left !== null && prevLeft !== null && prevLeft >= 0 && left < 0) { GC.pose('none'); fx('stop'); GC.do('warn', { force: true }); setTimeout(() => GC.say('You have gone past this month\'s pool. No blame. Let us look at what can ease.', 6000), 900); }
        prevLeft = left;
    }
    function companionReturns() {
        try {
            const last = +localStorage.getItem('gc_last') || 0; localStorage.setItem('gc_last', String(Date.now()));
            if (last && Date.now() - last > 6 * 3600e3 && GC && GCompanion.prefs.get().place !== 'off') { GC.wake(); setTimeout(() => GC.say('Welcome back.', 3200), 900); }
        } catch (e) {}
    }

    /* ================= Version 2.2: what the app learns from your own entries (on this phone only) ================= */
    // The amounts you really pay for a category. Newer entries count more. Needs the same amount at least twice.
    function quickAmounts(catId) {
        if (prefs.learnOn === false) return [];
        const now = Date.now(), score = new Map(), seen = new Map();
        D.months.forEach(m => m.exps.forEach(e => {
            if (e.cat !== catId || e.kind === 'import' || e.kind === 'adjust' || !(e.amt > 0) || e.ts < now - 180 * DAY) return;
            const a = Math.round(e.amt * 100) / 100, w = Math.pow(0.5, (now - e.ts) / (30 * DAY));
            score.set(a, (score.get(a) || 0) + w); seen.set(a, (seen.get(a) || 0) + 1);
        }));
        return [...score.keys()].filter(a => seen.get(a) >= 2).sort((x, y) => score.get(y) - score.get(x)).slice(0, 4);
    }
    function learnInsights() {
        if (prefs.learnOn === false) return `<div class="card"><h3>What the app has learned</h3><p class="hint">Learning is switched off in Settings.</p></div>`;
        const all = []; D.months.forEach(m => m.exps.forEach(e => { if (e.kind !== 'import' && e.kind !== 'adjust' && e.amt > 0) all.push(e); }));
        const span = all.length ? (Date.now() - Math.min.apply(null, all.map(e => e.ts))) / DAY : 0;
        if (all.length < 15 || span < 21) return `<div class="card"><h3>What the app has learned</h3><p class="hint">After about three weeks of entries, this card shows your spending habits in plain words. So far: ${(all.length === 1 ? '1 entry' : all.length + ' entries')}.</p></div>`;
        const out = [], DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        // days of the week
        { const S = E.weekdayStats(all, Date.now());
          if (S.ready && S.enough) {
            const av = S.days.map(r => r.avgEx), hi = av.indexOf(Math.max.apply(null, av)), lo = av.indexOf(Math.min.apply(null, av));
            if (av[hi] > av[lo] * 1.4) out.push(`Without very large purchases, you spend most on <b>${DN[hi]}s</b> (about ${mh(av[hi])}) and least on <b>${DN[lo]}s</b> (about ${mh(av[lo])}). This uses ${S.spanDays} days.`);
          } else if (S.ready) out.push(`Weekday patterns need at least 4 weeks of days. So far the app has counted ${S.spanDays} days, which is too few to say which day costs most.`); }
        // time of day
        { const P = [['morning', 5, 12, 0], ['afternoon', 12, 17, 0], ['evening', 17, 22, 0], ['night', 22, 29, 0]]; let n = 0;
          all.forEach(e => { let h = new Date(e.ts).getHours(); if (h < 5) h += 24; const b = P.find(x => h >= x[1] && h < x[2]); if (b) { b[3] += e.amt; n += e.amt; } });
          const top = P.slice().sort((a, b) => b[3] - a[3])[0]; if (n > 0 && top[3] / n > 0.4) out.push(`Most of your spending (${Math.round(top[3] / n * 100)}%) happens in the <b>${top[0]}</b>.`); }
        // categories that keep going over their limit
        const closed = D.months.filter(m => m.spent > 0).slice(-4, -1).concat([]);
        const prev = D.months.filter(m => m.spent > 0 && !(m.y === D.cur.y && m.m === D.cur.m)).slice(-3);
        if (prev.length >= 2) {
            const over = {}; prev.forEach(m => Object.keys(m.byCat || {}).forEach(id => { const lim = (m.limits || {})[id]; if (lim > 0 && m.byCat[id] > lim * 1.05) over[id] = (over[id] || 0) + 1; }));
            Object.keys(over).filter(id => over[id] >= 2).slice(0, 2).forEach(id => { const c = D.catsById[id]; if (c) out.push(`<b>${esc(c.name)}</b> went over its limit in ${over[id]} of the last ${prev.length} months. Raise the limit, or plan for it.`); });
        }
        // end of the month
        let early = 0, late = 0; prev.forEach(m => m.exps.forEach(e => { if (e.kind === 'import' || e.kind === 'adjust') return; const d = new Date(e.ts).getDate(); if (d <= 10) early += e.amt; else if (d >= 21) late += e.amt; }));
        if (early + late > 0 && late / (early + late) > 0.55) out.push('You spend more in the <b>last ten days</b> of the month than in the first ten. Spend a little less early on if you want to finish the month calmly.');
        const cheap = all.filter(e => e.amt <= 50 && e.ts >= Date.now() - 30 * DAY);
        if (cheap.length >= 15) out.push(`In the last 30 days you made <b>${cheap.length} small payments</b> of ₹50 or less, about ${mh(cheap.reduce((s, e) => s + e.amt, 0))} in all. Small payments add up quietly.`);
        return `<div class="card"><h3>What the app has learned</h3>${out.length ? out.map(t => `<div class="learn-row">${t}</div>`).join('') : '<p class="hint">Your spending looks steady. Nothing needs attention.</p>'}<div class="hint mt">These come from your own entries. They stay on this phone.</div></div>`;
    }
    function dataCard() {
        let kb = 0; try { kb = Math.round((localStorage.getItem(K_EV) || '').length / 1024); } catch (e) {}
        return `<div class="card"><h3>Your data</h3><p class="hint">Every entry is saved on this phone only: ${events.length} entries, about ${kb} KB. The app learns from them here. Nothing is sent anywhere. Use Backup to keep a safe copy.</p>${sw('learnOn', 'Learn from my entries', 'Shows your usual amounts as quick buttons and writes plain-word insights.')}</div>`;
    }
    function renderIns() {
        const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], order = [1, 2, 3, 4, 5, 6, 0];
        const allx = []; D.months.forEach(m => m.exps.forEach(x => allx.push(x)));
        const S = E.weekdayStats(allx, Date.now()), mx2 = v => `<span class="priv">₹${(Math.round(v * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2, maximumFractionDigits: 2 })}</span>`, sh = v => v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v);
        let h;
        if (!S.ready) h = `<div class="card" data-sec="ins:which-days-cost-most"><h3>Which days cost most</h3><p class="hint">No finished days with spending yet. This card appears after your first full day.</p></div>`;
        else {
            const mx = Math.max(1, ...S.days.map(r => r.avg)), fd = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            const bars = order.map(w => { const r = S.days[w], tot = Math.max(3, r.avg / mx * 62), inner = r.big.length ? Math.max(3, r.avgEx / mx * 62) : 0;
                return `<div${tl(`${WD[w]}: ${prefs.privacy ? 'average hidden' : 'average ' + money(r.avg)} over ${plural(r.n, WD[w])}. ${r.big.length ? 'One very large entry is included.' : ''}`)}><span class="priv">${sh(r.avg)}</span><b style="height:${tot}px;${r.big.length ? 'opacity:.45;position:relative' : ''}">${inner ? `<i style="position:absolute;left:0;right:0;bottom:0;height:${inner}px;border-radius:inherit;background:var(--blue-b);opacity:1"></i>` : ''}</b>${names[w]}<small style="display:block;font-size:.62rem;opacity:.6">${r.n}×</small></div>`; }).join('');
            const notes = S.days.filter(r => r.big.length).map(r => { const b = r.big.map(x => `${mx2(x.amt)} (${esc(x.name)}, ${fd(x.ts)})`).join(' and ');
                return `<div class="hint mt"><b>${WD[r.w]}:</b> the average is ${mx2(r.avg)} over ${plural(r.n, WD[r.w])}, but one very large entry, ${b}, is most of it. Without it the average is ${mx2(r.avgEx)}. ${r.n < 3 ? `Only ${plural(r.n, WD[r.w])} ${r.n === 1 ? 'is' : 'are'} counted, which ${r.n === 1 ? 'is' : 'are'} too few to show a pattern. Please do not read this as a habit.` : ''}</div>`; }).join('');
            const thin = S.days.filter(r => r.n < 3).length;
            h = `<div class="card" data-sec="ins:which-days-cost-most"><h3>Which days cost most</h3><p class="hint">Average spend on each weekday, ${fd(S.first)} to yesterday. ${plural(S.spanDays, 'day')} counted. A day with no spending counts as zero. The number under each letter shows how many of that weekday were counted. Pale bars include a very large entry; the dark part is the average without it.</p><div class="bars">${bars}</div>${notes}${S.enough ? '' : `<div class="hint mt">${S.spanDays < 28 ? 'This is too little data to show a habit.' : 'Some weekdays have fewer than 3 days.'} Each bar only shows what happened on ${thin ? 'those few days' : 'these days'}. A clearer picture needs about 4 weeks.</div>`}</div>`;
        }
        const ms = D.months.filter(m => m.spent > 0).slice(-6), mm = Math.max(1, ...ms.map(m => m.spent));
        h += `<div class="card" data-sec="ins:months"><h3>Months</h3><div class="bars">${ms.map(m => `<div><span class="priv">${Math.round(m.spent / 1000)}k</span><b style="height:${Math.max(3, m.spent / mm * 62)}px"></b>${MONTHS[m.m]}</div>`).join('')}</div></div>`;
        const fixed = D.cats.filter(c => c.type === 'fixed' && (D.priceHist[c.id] || []).length > 1);
        h += `<div class="card" data-sec="ins:price-tracker"><h3>Price tracker</h3>${fixed.map(c => `<div class="ledger-row"><span>${esc(c.icon)} ${esc(c.name)}</span><span class="priv">${D.priceHist[c.id].map(x => money(x.price)).join(' → ')}</span></div>`).join('') || '<p class="hint">Change a fixed price in Settings and its history shows here.</p>'}</div>`;
        const resisted = D.wants.filter(w => w.status === 'dropped').reduce((s, w) => s + w.price, 0);
        h += `<div class="card" data-sec="ins:resisted"><h3>Resisted</h3><div class="row"><b class="num" style="font-size:1.8rem">${mh(resisted)}</b><span class="hint">in wants you let go</span></div></div>`;
        h += `<div class="card" data-sec="ins:closed-months"><h3>Closed months</h3>${D.months.filter(m => m.close).slice(-6).reverse().map(m => `<div class="ledger-row"><span>${MONTHS[m.m]} ${m.y}</span><span class="priv">saved ${money(m.close.toSave)} · pool +${money(m.close.toPool)}</span></div>`).join('') || '<p class="hint">None yet.</p>'}</div>`;
        put($('s-ins'), learnInsights() + h);
    }

    const sw = (k, t, d) => `<div class="sw-row"><div><div>${t}</div>${d ? `<div class="set-meta">${d}</div>` : ''}</div><label class="switch"><input type="checkbox" data-pref="${k}" ${prefs[k] ? 'checked' : ''}><i></i></label></div>`;
    const slider = (id, l, max, v) => `<div class="bg-row"><span>${l}</span><input type="range" id="${id}" min="0" max="${max}" value="${v}"><b class="bg-val" id="${id}-v">${v}</b></div>`;
    const LIGHT_LOOKS = () => [['flagship', GLook.FIXED.flagship.label, GLook.FIXED.flagship.sw], ['paper', 'Paper', '#f4efe0'], ['aurora', 'Aurora', 'linear-gradient(135deg,#7fd6ff,#b9a6ff 60%,#ffd9a8)']].concat(Object.keys(GLook.NATURE).map(k => { const n = GLook.NATURE[k]; return [k, n.label, `linear-gradient(160deg,${n.L[0]},${n.L[1]})`]; }));
    const DARK_LOOKS = () => Object.keys(GLook.FIXED).filter(k => GLook.FIXED[k].dark).map(k => [k, GLook.FIXED[k].label, GLook.FIXED[k].sw]);
    const lookGrid = list => `<div class="look-grid">${list.map(([k, l, c]) => `<button class="lk ${(prefs.look || 'flagship') === k ? 'on' : ''}" data-act="look" data-v="${k}" style="--sw:${c}">${l}</button>`).join('')}</div>`;
    const accOpen = k => (prefs.acc || []).indexOf(k) >= 0 ? 'open' : '';
    const pv = k => (prefs.p && prefs.p[k] !== undefined) ? prefs.p[k] : GLook.PAPER_DEFAULTS[k];
    const prSlider = (k, l, min, max, step, unit) => `<div class="bg-row"><span>${l}</span><input type="range" data-pr="${k}" min="${min}" max="${max}" step="${step}" value="${pv(k)}"><b class="bg-val" id="pr-${k}">${pv(k)}${unit || ''}</b></div>`;
    const prSelect = (k, l, opts) => `<div class="sw-row"><span>${l}</span><select class="set-select" data-prs="${k}">${opts.map(([v, t]) => `<option value="${v}" ${pv(k) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
    const prSwitch = (k, t) => `<div class="sw-row"><span>${t}</span><label class="switch"><input type="checkbox" data-prc="${k}" ${pv(k) ? 'checked' : ''}><i></i></label></div>`;
    function lookCard() {
        const look = prefs.look || 'flagship', dark = GLook.isDarkLook(look), isFl = look === 'flagship' || look === 'flagshipd';
        let hasBg = false; try { hasBg = !!localStorage.getItem(K_BG); } catch (e) {}
        let h = `<div class="card"><h3>Look</h3>` + GAcc.sec('look-l', 'Light themes', lookGrid(LIGHT_LOOKS()), !dark) + GAcc.sec('look-d', 'Dark themes', lookGrid(DARK_LOOKS()), dark);
        h += sw('follow', 'Follow my phone', 'Light or dark follows your phone. It goes to the last light or dark theme you used. Each theme stays exactly as designed.');
        if (isFl) {
            const acc = prefs.accent === 'gold' ? 'gold' : 'sapphire';
            h += GAcc.sec('look-fl', 'Flagship options', `<div class="sw-row"><span>Accent colour</span><div class="acc-sw"><button type="button" class="swatch ${acc === 'sapphire' ? 'on' : ''}" data-act="accent" data-v="sapphire" style="--sw:linear-gradient(135deg,#5c9fe6,#3560bd)">Sapphire</button><button type="button" class="swatch ${acc === 'gold' ? 'on' : ''}" data-act="accent" data-v="gold" style="--sw:linear-gradient(135deg,#f3d36e,#c9a43a)">Gold</button></div></div>
                ${sw('glow', 'Soft glow', 'A faint blue (or gold) glow on the lower edge of cards, and on buttons and progress bars.')}
                <div class="sw-row"><span>Letters</span><select class="set-select" data-pref="flFont">${GLook.FONTS.map(([v, t]) => `<option value="${v}" ${(prefs.flFont || 'system') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`, true);
        }
        if (look === 'aurora' || look === 'paper') h += `<details class="acc" data-acc="aur" ${accOpen('aur')}><summary>Aurora colours</summary><div class="acc-body"><div class="sw-row"><span>Palette</span><select class="set-select" data-pref="theme">${[['auto', 'Automatic (by time of day)']].concat(Object.keys(THEMES).map(k => [k, THEMES[k].label + (THEMES[k].part ? ' · ' + THEMES[k].part : '')])).map(([k, l]) => `<option value="${k}" ${prefs.theme === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><p class="hint">Sets the accent colours for Aurora and Paper.</p></div></details>`;
        if (look === 'paper') {
            const cur = pv('paperColor'), custom = pv('paperCustom');
            h += `<details class="acc" data-acc="pcol" ${accOpen('pcol')}><summary>Page colour</summary><div class="acc-body"><div class="sw-grid">${GLook.PAPERS.map(([k, l, lc, dc]) => `<button class="swatch ${cur === k ? 'on' : ''}" data-act="pr-set" data-k="paperColor" data-v="${k}" style="--sw:${dark ? dc : lc}">${l}</button>`).join('')}<button class="swatch ${cur === 'custom' ? 'on' : ''}" data-act="pr-set" data-k="paperColor" data-v="custom" style="--sw:${custom}">Custom</button></div>
                <label class="field"><span>Your own colour${dark ? ' (darkened automatically at night)' : ''}</span><input type="color" class="cpick" data-prcol="paperCustom" value="${custom}"></label>${prSwitch('texture', 'Paper texture (grain; fibres on Parched paper)')}</div></details>`;
            h += `<details class="acc" data-acc="ppat" ${accOpen('ppat')}><summary>Pattern: dots, graph or ruled</summary><div class="acc-body">${prSelect('pattern', 'Pattern', [['dots', 'Dot grid'], ['graph', 'Graph boxes'], ['ruled', 'Ruled lines (single rule)'], ['plain', 'Plain']])}
                ${pv('pattern') === 'plain' ? '' : prSlider('dotGap', 'Spacing', 10, 44, 1, ' px') + (pv('pattern') === 'dots' ? prSlider('dotSize', 'Dot size', 0.4, 3, 0.1, ' px') : '') + prSlider('dotAlpha', 'Opacity', 3, 70, 1, '%') + prSelect('ink', 'Ink', GLook.INKS.map(([k, l]) => [k, l]))}</div></details>`;
            h += `<details class="acc" data-acc="pmar" ${accOpen('pmar')}><summary>Margins</summary><div class="acc-body">${prSelect('mStyle', 'Margin lines', [['none', 'None'], ['single', 'Single line'], ['double', 'Double line']])}
                ${pv('mStyle') === 'none' ? '' : `<div class="sw-grid">${GLook.MARGINS.map(([k, l, c]) => `<button class="swatch dotm ${pv('mColor') === k ? 'on' : ''}" title="${l}" data-act="pr-set" data-k="mColor" data-v="${k}" style="--sw:rgb(${c.join(',')})"></button>`).join('')}</div>${prSwitch('mTop', 'Top margin')}${prSlider('mTopIn', 'Top margin depth', 0.6, 2, 0.1, ' in')}${prSwitch('mSide', 'Side margin')}`}</div></details>`;
        } else if (GLook.NATURE[look] || look === 'aurora') h += `<p class="hint">Choose Paper above to customise the page colour, dots, margins and texture.</p>`;
        h += `<details class="acc" data-acc="blur" ${accOpen('blur')}><summary>Blur and glass</summary><div class="acc-body">${slider('bg-blur', 'Background blur', 40, Math.min(40, prefs.bgBlur))}${slider('glass-blur', 'Glass frosting (cards and panels)', 30, Math.min(30, prefs.glassBlur))}<p class="hint">Background blur affects only the page behind everything. Glass frosting affects the cards, sheets and menu bar.</p></div></details>`;
        h += `<details class="acc" data-acc="bgp" ${accOpen('bgp')}><summary>Wallpaper photo and speed</summary><div class="acc-body"><button class="btn-line btn-accent" data-act="pick-bg">${hasBg ? 'Change' : 'Choose'} wallpaper photo</button>${hasBg ? '<button class="btn-line" data-act="clear-bg">Remove wallpaper</button>' : ''}${sw('lite', 'Lite mode', 'No blur or motion. Faster on older phones.')}${sw('privacy', 'Privacy mode', 'Blur amounts. Hold a number to peek.')}</div></details></div>`;
        return h;
    }
    // a card whose body folds under its title with a triangle (state remembered)
    function foldCard(html, key, open, note) {
        const m = html.match(/^<div class="card([^"]*)">\s*<h3>([\s\S]*?)<\/h3>([\s\S]*)<\/div>\s*$/); if (!m || !window.GAcc) return html;
        return `<div class="card${m[1]}"><details class="gacc fc" data-gacc="${key}" ${GAcc.open(key, open) ? 'open' : ''}><summary><h3>${m[2]}</h3>${note ? `<span class="gacc-n">${note}</span>` : ''}</summary><div class="gacc-body">${m[3]}</div></details></div>`;
    }
    function renderSet() {
        let hasBg = false; try { hasBg = !!localStorage.getItem(K_BG); } catch (e) {}
        let h = lookCard();
        h += foldCard(dataCard(), 'set-data', false);
        if (window.GCompanion) h += window.GCompanion.settingsHTML();
        if (window.GFeel) h += window.GFeel.settingsHTML();
        h += foldCard(`<div class="card"><h3>Experience</h3>${sw('introOn', 'Opening screen', 'Greeting and animation when the app opens.')}${sw('greetOn', 'Greeting by name')}${sw('lineOn', 'Tips in the top banner', 'Proverbs and tips slide in now and then.')}${sw('smartOn', 'Smart sections', 'Sections you rarely open fold under More. The app learns for two weeks first.')}${sw('forecastOn', 'Month forecast')}${sw('animOn', 'Slow category glide')}${sw('warnOn', 'Budget-break warnings')}${sw('dayCloseOn', 'Close-the-day ritual')}${sw('purchOn', 'Big-purchase rules')}${sw('waitOn', '24-hour want list')}${sw('reviewOn', '30-day "still glad?" review')}${sw('remindOn', 'Backup reminder', 'A banner in the app. A web app cannot ring while closed.')}</div>`, 'set-exp', false);
        h += foldCard(`<div class="card"><h3>Categories and rules</h3>${D.cats.slice().sort((a, b) => a.id - b.id).map(c => `<div class="ledger-row tap" data-act="cat-edit" data-id="${c.id}"><span>${esc(c.icon)} ${esc(c.name)}</span><span class="muted priv">${money(c.limit)}</span></div>`).join('')}<button class="btn-line" data-act="cat-add">Add category</button></div>`, 'set-cat', true);
        const pin = pinOn();
        h += foldCard(`<div class="card"><h3>Security</h3><p class="hint">The PIN keeps people out of the app. Backups are encrypted with their own password.</p>${pin ? sw('autoLock', 'Lock when I leave the app') : ''}<button class="btn-line" data-act="pin-set">${pin ? 'Change PIN' : 'Set a PIN'}</button>${pin ? '<button class="btn-line" data-act="pin-off">Remove PIN</button>' : ''}</div>`, 'set-sec', false);
        h += foldCard(`<div class="card"><h3>Backup</h3><p class="hint">${prefs.lastBackup ? 'Last backup ' + fmtDT(prefs.lastBackup) : 'Not backed up yet.'} Share opens your phone's share sheet: choose Google Drive or Proton Drive.</p><button class="btn-line btn-accent" data-act="backup" data-m="share">Back up now (share)</button><button class="btn-line" data-act="backup" data-m="download">Save to Downloads</button><button class="btn-line" data-act="backup" data-m="plain">Share unencrypted copy</button><button class="btn-line" data-act="restore">Restore from a file</button>${sw('rememberPass', 'Remember backup password', 'Stored on this phone only.')}<button class="btn-line" data-act="erase" style="color:var(--warning)">Erase everything</button></div>`, 'set-bak', true);
        put($('s-set'), h);
        const bb = $('bg-blur'), gb = $('glass-blur');
        if (bb) bb.oninput = () => { prefs.bgBlur = +bb.value; $('bg-blur-v').textContent = bb.value; applyBackground(); applyTheme(); persist(); };
        if (gb) gb.oninput = () => { prefs.glassBlur = +gb.value; $('glass-blur-v').textContent = gb.value; document.documentElement.style.setProperty('--glass-blur', gb.value + 'px'); persist(); };
    }

    function render() {
        if (!render.gs && window.GSections) { render.gs = 1; GSections.init({ app: 'budget', enabled: () => prefs.smartOn !== false }); }
        if (!$('lock').classList.contains('show') || !pinOn()) { /* render underneath too */ }
        refresh(); applyTheme(); renderBanner();
        $('brand-sub').textContent = (prefs.greetOn ? greeting() + ' · ' : '') + `${MONTHS[D.cur.m]} ${D.cur.y}`;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.s === screen));
        document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + screen));
        ({ today: renderToday, month: renderMonth, mind: renderMind, ins: renderIns, set: renderSet })[screen]();
        renderCompanion();
    }

    /* ---------- Sheets ---------- */
    function planSheet() {
        const c = D.cur, pl = c.plan, prev = D.months.filter(m => m.plan && m.k < c.k).pop();
        const pool0 = pl ? pl.pool : (prev ? prev.plan.pool : 31000);
        const bank0 = D.accounts.hasBal ? Math.round(D.accounts.bank) : '', cash0 = D.accounts.hasBal ? Math.round(D.accounts.cash) : '';
        const save0 = pl ? pl.save : 5000, allow0 = pl ? pl.allow : (D.pool.init ? D.pool.allow : 3000), min0 = D.pool.min || 500;
        sheet(`<h2>${MONTHS[c.m]} ${c.y} plan</h2><p>Your budget plus savings cannot be more than the money you hold. Savings are set aside first.</p>
            <div class="grid2"><label class="field"><span>Bank balance</span><input type="number" inputmode="decimal" id="p-bank" value="${bank0}" autofocus></label><label class="field"><span>Cash in hand</span><input type="number" inputmode="decimal" id="p-cash" value="${cash0}"></label></div>
            <label class="field"><span>Monthly budget (spending pool)</span><input type="number" inputmode="decimal" id="p-pool" value="${pool0}"></label>
            <div class="grid2"><label class="field"><span>Save first</span><input type="number" inputmode="decimal" id="p-save" value="${save0}"></label><label class="field"><span>Big-purchase pool / month</span><input type="number" inputmode="decimal" id="p-allow" value="${allow0}"></label></div>
            <label class="field"><span>Big purchase starts at</span><input type="number" inputmode="decimal" id="p-min" value="${min0}"></label>
            <div class="error" id="p-err"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="p-go">Save plan</button></div>`, box => {
            box.querySelector('#p-go').onclick = () => {
                const bank = numv(box, '#p-bank'), cash = numv(box, '#p-cash') || 0, pool = numv(box, '#p-pool'), sv = numv(box, '#p-save') || 0, allow = numv(box, '#p-allow'), mn = numv(box, '#p-min');
                const err = t => { box.querySelector('#p-err').textContent = t; };
                if (!isFinite(bank)) return err('Enter your bank balance');
                if (!(pool > 0)) return err('Enter this month\'s budget');
                if (!(allow >= 0) || !(mn > 0)) return err('Check the purchase pool numbers');
                const money_ = bank + cash + c.spent;
                if (pool + sv > money_ + 0.5) return err(`Budget + savings (${money(pool + sv)}) is more than the money you hold (${money(money_)}). Lower one.`);
                const e = add({ t: 'plan', y: c.y, m: c.m, pool, bank, cash, save: sv, allow, minAmt: mn });
                if (prefs.pendingSeed && !D.pool.init) { /* seed after the plan so carried balances survive migration */ }
                if (prefs.pendingSeed) { const s = Object.assign({}, prefs.pendingSeed); add(s, e.ts + 1); prefs.pendingSeed = null; persist(); }
                closeSheet(); render(); fx('save'); toast('Plan saved');
            };
        });
    }
    function closeMonthSheet() {
        const pc = D.pendingClose; if (!pc) return;
        sheet(`<h2>${MONTHS[pc.m]} left ${money(pc.left)}</h2><p>Split it: savings, the big-purchase pool, or both. Anything left over is simply released.</p>
            <div class="grid2"><label class="field"><span>To savings</span><input type="number" inputmode="decimal" id="c-s" value="${Math.round(pc.left)}"></label><label class="field"><span>To purchase pool</span><input type="number" inputmode="decimal" id="c-p" value="0"></label></div>
            <div class="grid2"><button class="mini-btn" data-pre="s">All savings</button><button class="mini-btn" data-pre="h">Half and half</button><button class="mini-btn" data-pre="p">All pool</button><button class="mini-btn" data-pre="n">Release</button></div>
            <div class="error" id="c-err"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Later</button><button class="btn-primary" id="c-go">Confirm</button></div>`, box => {
            const S = box.querySelector('#c-s'), Pp = box.querySelector('#c-p'), L = Math.round(pc.left);
            box.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { const k = b.dataset.pre; S.value = k === 's' ? L : k === 'h' ? Math.round(L / 2) : 0; Pp.value = k === 'p' ? L : k === 'h' ? L - Math.round(L / 2) : 0; });
            box.querySelector('#c-go').onclick = () => {
                const s = Math.max(0, parseFloat(S.value) || 0), p = Math.max(0, parseFloat(Pp.value) || 0);
                if (s + p > pc.left + 0.5) { box.querySelector('#c-err').textContent = 'That is more than what was left'; return; }
                add({ t: 'close', y: pc.y, m: pc.m, toSave: s, toPool: p }); closeSheet(); render(); if (pc.left >= 0) { fx('fanfare'); if (GC) GC.do('celebrate', { force: true }); toast(s > 0 ? `Month closed within budget. ${money(s)} went to savings.` : 'Month closed within budget. Well done.'); } else { fx('save'); toast('Month closed'); }
            };
        });
    }
    function checkSheet() {
        sheet(`<h2>Reality check</h2><p>Enter what your bank app and wallet really show. The app adjusts and remembers the difference.</p>
            <div class="grid2"><label class="field"><span>Bank</span><input type="number" inputmode="decimal" id="k-b" value="${Math.round(D.accounts.bank)}" autofocus></label><label class="field"><span>Cash</span><input type="number" inputmode="decimal" id="k-c" value="${Math.round(D.accounts.cash)}"></label></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="k-go">Update</button></div>`, box => {
            box.querySelector('#k-go').onclick = () => {
                const b = numv(box, '#k-b'), c = numv(box, '#k-c');
                add({ t: 'check', bank: isFinite(b) ? b : null, cash: isFinite(c) ? c : null }); closeSheet(); render(); fx('save'); toast('Balances updated');
            };
        });
    }
    function xferSheet(dir) {
        const l = dir === 'b2c' ? ['Withdraw cash', 'Bank → Cash'] : ['Deposit cash', 'Cash → Bank'];
        sheet(`<h2>${l[0]}</h2><p>${l[1]}</p><label class="field"><span>Amount</span><input type="number" inputmode="decimal" id="x-a" autofocus></label><div class="error" id="x-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="x-go">Move</button></div>`, box => {
            box.querySelector('#x-go').onclick = () => { const a = numv(box, '#x-a'); if (!(a > 0)) { box.querySelector('#x-e').textContent = 'Enter an amount'; return; } add({ t: 'xfer', dir, amt: a }); closeSheet(); render(); fx('save'); toast('Moved'); };
        });
    }
    function savSheet(dir) {
        const out = dir === 'out';
        sheet(`<h2>${out ? 'Withdraw from savings' : 'Add to savings'}</h2><p>Savings are a promise on paper; the money stays in your bank. Now saved: ${money(D.savings)}.</p><label class="field"><span>Amount</span><input type="number" inputmode="decimal" id="s-a" autofocus></label>${out ? '<label class="field"><span>Why?</span><input type="text" id="s-n"></label>' : ''}<div class="error" id="s-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="s-go">Save</button></div>`, box => {
            box.querySelector('#s-go').onclick = () => {
                const a = numv(box, '#s-a'); if (!(a > 0)) { box.querySelector('#s-e').textContent = 'Enter an amount'; return; }
                if (out && a > D.savings) { box.querySelector('#s-e').textContent = 'More than you have saved'; return; }
                add({ t: 'sav', amt: out ? -a : a, note: out ? val(box, '#s-n') : '' }); closeSheet(); render(); fx(out ? 'down' : 'up'); toast(out ? 'Taken out of savings.' : `${money(a)} moved to savings. Well done.`);
            };
        });
    }
    function dayCloseSheet() {
        const T = D.today;
        sheet(`<h2>Close today</h2><p>You spent ${mh(T.spent)} today and have ${mh(D.P - D.cur.spent)} left this month. Is everything recorded, cash included?</p><div class="modal-actions"><button class="btn-secondary" data-act="close">Not yet</button><button class="btn-primary" id="dc">All recorded</button></div>`, box => {
            box.querySelector('#dc').onclick = () => { const av = dayAvg(), under = av !== null && av >= 1 && T.spent <= av; add({ t: 'dayclose', day: T.key }); closeSheet(); render(); fx(under ? 'glad' : 'save'); toast(under ? 'Day closed under your average. Nicely done.' : 'Day closed'); if (GC && under) GC.do('celebrate', { force: true }); };
        });
    }

    /* expense entry */
    function entrySheet(catId, preset) {
        const c = D.catsById[catId]; if (!c) return;
        if (GC) GC.pose('calc');
        let waitShown = false;
        let amt = preset ? String(preset) : '', acct = c.lastAcct || 'bank', need = 'want';
        sheet(`<h2>${esc(c.icon)} ${esc(c.name)}</h2><div class="amt-disp priv" id="e-amt"></div><div class="qchips" id="e-q"></div><div id="e-pv"></div>
            <div class="seg" id="e-acct"><button data-a="bank">Bank (UPI)</button><button data-a="cash">Cash</button></div>
            <div class="keypad" id="e-pad"></div><label class="field"><span>Note (optional)</span><input type="text" id="e-note" maxlength="60"></label>
            <div id="e-pur"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="e-go">Add</button></div>`, box => {
            const disp = box.querySelector('#e-amt'), pv = box.querySelector('#e-pv'), purBox = box.querySelector('#e-pur'), go = box.querySelector('#e-go');
            let purReady = false;
            const buildPur = a => {
                const cnt = E.counted(D, c, a);
                if (!prefs.purchOn || !cnt) { purBox.innerHTML = ''; purReady = false; return cnt; }
                if (purBox.dataset.cnt !== String(cnt)) {
                    const as = E.assess(D, c, cnt), last = as.last;
                    const keepR = val(box, '#e-reason');
                    purBox.dataset.cnt = String(cnt);
                    purBox.innerHTML = `<div class="pinfo">Big purchase: ${money(cnt)} counts. Pool has ${money(as.poolBal)}.${last ? ` Last ${esc(c.name)} purchase: ${money(last.total)} on ${fmtDay(last.ts)}.` : ''}</div>
                        ${as.blocked ? `<div class="pwarn">${as.poolShort ? `Not enough in the pool. It reaches ${money(as.opens.bal)} on ${fmtDay(as.opens.ts)}.` : ''} ${as.cdNow > 0 ? `${esc(c.name)} is waiting ${plural(as.cdNow, 'more day')}.` : ''}</div>` : (as.cdAfter > 0 ? `<div class="pinfo">After this, ${esc(c.name)} waits ${plural(as.cdAfter, 'day')} (until ${fmtDay(D.now + as.cdAfter * DAY)}).</div>` : '')}
                        <div class="seg" id="e-need" style="margin-bottom:8px"><button data-n="need">Need</button><button data-n="want" class="on">Want</button></div>
                        <label class="field"><span>Why this purchase? (required)</span><textarea id="e-reason" placeholder="A real reason, in your own words"></textarea></label>
                        ${as.blocked ? '<label class="field check"><input type="checkbox" id="e-emg"><span>This is an emergency</span></label>' : ''}`;
                    purBox.querySelectorAll('#e-need button').forEach(b => b.onclick = () => { need = b.dataset.n; purBox.querySelectorAll('#e-need button').forEach(x => x.classList.toggle('on', x === b)); });
                    purBox.querySelectorAll('textarea,input').forEach(x => x.oninput = upd);
                    if (keepR && purBox.querySelector('#e-reason')) purBox.querySelector('#e-reason').value = keepR;
                }
                purReady = true; return cnt;
            };
            const upd = () => {
                const a = parseFloat(amt) || 0;
                disp.textContent = amt ? '₹' + amt : '₹0';
                box.querySelectorAll('#e-acct button').forEach(b => b.classList.toggle('on', b.dataset.a === acct));
                let ok = a > 0, label = 'Add';
                if (a > 0 && D.P) {
                    const p = E.preview(D, c.id, a), lv = p.level;
                    const msgs = [`${money(p.leftAfter)} left in the month after this.`];
                    if (p.overLimit > 0) msgs.push(`${esc(c.name)} passes its limit by ${money(p.overLimit)}.`);
                    if (lv === 'broken') msgs.push('This breaks your monthly budget: it is more than what is left.'); else if (lv === 'risk') msgs.push('Risky: you would be well ahead of the calendar.'); else if (lv === 'tight') msgs.push('A little ahead of the calendar.');
                    pv.innerHTML = `<div class="pv ${prefs.warnOn ? lv : 'ok'}">${msgs.join(' ')}</div>`;
                    if (lv === 'broken') label = 'Add anyway';
                } else pv.innerHTML = '';
                const cnt = a > 0 ? buildPur(a) : (purBox.innerHTML = '', purBox.dataset.cnt = '', 0);
                if (cnt && prefs.purchOn) {
                    const as = E.assess(D, c, cnt), emg = box.querySelector('#e-emg') && box.querySelector('#e-emg').checked, rs = (val(box, '#e-reason') || '').trim();
                    if (as.blocked && !emg) { ok = false; if (!waitShown) { waitShown = true; fx('stop'); if (GC) { GC.pose('none'); GC.do('wait', { force: true }); } } }
                    if (rs.length < 5) ok = false;
                    if (as.blocked && !emg) label = 'Blocked';
                }
                go.disabled = !ok; go.style.opacity = ok ? '' : '0.45'; go.textContent = label;
            };
            buildPad(box.querySelector('#e-pad'), k => {
                if (k === '⌫') amt = amt.slice(0, -1);
                else if (k === '.') { if (amt.indexOf('.') < 0) amt = (amt || '0') + '.'; }
                else if (amt.replace('.', '').length < 7 && !/\.\d\d$/.test(amt)) amt += k;
                if (amt === '0' || amt === '00') amt = '';
                upd();
            }, true);
            box.querySelectorAll('#e-acct button').forEach(b => b.onclick = () => { acct = b.dataset.a; upd(); });
            const qa = quickAmounts(c.id), qbox = box.querySelector('#e-q');
            qbox.innerHTML = qa.length ? qa.map(v => `<button type="button" data-v="${v}">₹${fmt2(v)}</button>`).join('') : '';
            qbox.querySelectorAll('button').forEach(b => b.onclick = () => { amt = String(b.dataset.v); upd(); });
            upd();
            go.onclick = () => {
                const a = parseFloat(amt); if (!(a > 0) || go.disabled) return;
                const e = { t: 'exp', cat: c.id, name: c.name, icon: c.icon, amt: a, acct, note: val(box, '#e-note'), kind: 'add' };
                const cnt = prefs.purchOn ? E.counted(D, c, a) : 0;
                if (cnt) { const emg = box.querySelector('#e-emg') && box.querySelector('#e-emg').checked; e.pur = { c: cnt, need, reason: (val(box, '#e-reason') || '').trim(), emg: !!emg }; }
                const ev = add(e); closeSheet(); render(); const brk = !!(D.P && D.P - D.cur.spent < 0); fx(brk || (e.pur && e.pur.emg) ? 'stop' : 'save');   // a spend is confirmed softly, never cheered
                if (GC) GC.do(brk ? 'warn' : 'yes', { force: true });
                                toast(`${money(a)} added to ${c.name}`, () => { add({ t: 'void', target: ev.id }); render(); fx('down'); });
                if (D.P && D.P - D.cur.spent < 0 && prefs.warnOn) setTimeout(() => toast(`Over the monthly budget by ${money(D.cur.spent - D.P)}.`), 6200);
            };
        });
    }
    function quickAdd(catId) {
        const c = D.catsById[catId]; if (!c) return;
        if (!D.P) { planSheet(); return; }
        const p = E.preview(D, c.id, c.price);
        if (E.counted(D, c, c.price) > 0 || p.level === 'broken' || p.level === 'risk') { entrySheet(catId, c.price); return; }
        const ev = add({ t: 'exp', cat: c.id, name: c.name, icon: c.icon, amt: c.price, acct: c.lastAcct || 'bank', note: '', kind: 'add' });
        render(); fx('save'); if (GC) GC.do('yes', { force: true });
        toast(`${money(c.price)} · ${c.name}`, () => { add({ t: 'void', target: ev.id }); render(); fx('down'); });
    }

    function wantSheet() {
        sheet(`<h2>Add a want</h2><label class="field"><span>What is it?</span><input type="text" id="w-n" autofocus></label><label class="field"><span>Price</span><input type="number" inputmode="decimal" id="w-p"></label><label class="field"><span>Category</span><select id="w-c">${D.cats.map(c => `<option value="${c.id}">${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></label><div class="error" id="w-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="w-go">Add</button></div>`, box => {
            box.querySelector('#w-go').onclick = () => {
                const n = val(box, '#w-n').trim(), p = numv(box, '#w-p');
                if (!n || !(p > 0)) { box.querySelector('#w-e').textContent = 'Give it a name and a price'; return; }
                add({ t: 'want', op: 'add', wid: 'w' + Date.now(), name: n, price: p, cat: +val(box, '#w-c') }); closeSheet(); render();
            };
        });
    }

    /* category editor */
    function catSheet(id) {
        const c = id ? D.catsById[id] : { name: '', icon: '🧾', limit: 0, type: 'variable', price: 0, lump: false, defAcct: 'bank', pur: E.defaultPur('') };
        const opts = E.ICONS.slice(); if (!opts.some(i => i[0] === c.icon)) opts.unshift([c.icon, 'Current']);
        sheet(`<h2>${id ? 'Edit' : 'New'} category</h2>
            <label class="field"><span>Name</span><input type="text" id="c-n" value="${esc(c.name)}"></label>
            <div class="grid2"><label class="field"><span>Icon</span><select id="c-i">${opts.map(i => `<option value="${i[0]}" ${i[0] === c.icon ? 'selected' : ''}>${i[0]} ${i[1]}</option>`).join('')}</select></label><label class="field"><span>Monthly limit</span><input type="number" inputmode="decimal" id="c-l" value="${c.limit}"></label></div>
            <div class="grid2"><label class="field"><span>Kind</span><select id="c-t"><option value="variable" ${c.type === 'variable' ? 'selected' : ''}>Variable amount</option><option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>Fixed price (one tap)</option></select></label><label class="field"><span>Fixed price</span><input type="number" inputmode="decimal" id="c-p" value="${c.price || ''}"></label></div>
            <div class="grid2"><label class="field"><span>Usually paid from</span><select id="c-a"><option value="bank" ${c.defAcct === 'bank' ? 'selected' : ''}>Bank (UPI)</option><option value="cash" ${c.defAcct === 'cash' ? 'selected' : ''}>Cash</option></select></label><label class="field check" style="margin-top:22px"><input type="checkbox" id="c-u" ${c.lump ? 'checked' : ''}><span>Paid once a month (rent-like)</span></label></div>
            <div class="set-title" style="margin-top:6px">Big-purchase rule</div>
            <label class="field"><span>Counts as a big purchase</span><select id="c-m"><option value="never" ${c.pur.mode === 'never' ? 'selected' : ''}>Never</option><option value="always" ${c.pur.mode === 'always' ? 'selected' : ''}>Always (if above the minimum)</option><option value="above" ${c.pur.mode === 'above' ? 'selected' : ''}>Only the part above a threshold</option></select></label>
            <div class="grid2"><label class="field"><span>Threshold</span><input type="number" inputmode="decimal" id="c-th" value="${c.pur.thr}"></label><label class="field"><span>Per</span><select id="c-pr"><option value="day" ${c.pur.per === 'day' ? 'selected' : ''}>Day</option><option value="month" ${c.pur.per === 'month' ? 'selected' : ''}>Month</option></select></label></div>
            <label class="field"><span>Waiting allowance (per month, grows daily)</span><input type="number" inputmode="decimal" id="c-al" value="${c.pur.allow}"></label>
            <div class="error" id="c-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="c-go">Save</button>${id ? '<button class="btn-extra" id="c-del">Delete category</button>' : ''}</div>`, box => {
            box.querySelector('#c-go').onclick = () => {
                const name = val(box, '#c-n').trim(); if (!name) { box.querySelector('#c-e').textContent = 'Give it a name'; return; }
                const f = { name, icon: val(box, '#c-i'), limit: numv(box, '#c-l') || 0, type: val(box, '#c-t'), price: numv(box, '#c-p') || 0, defAcct: val(box, '#c-a'), lump: box.querySelector('#c-u').checked,
                    pur: { mode: val(box, '#c-m'), thr: numv(box, '#c-th') || 0, per: val(box, '#c-pr'), allow: numv(box, '#c-al') || 0 } };
                if (id) add({ t: 'cat', op: 'edit', cid: id, f }); else add({ t: 'cat', op: 'add', c: Object.assign({ id: D.nextCatId }, f) });
                closeSheet(); render();
            };
            const del = box.querySelector('#c-del');
            if (del) del.onclick = async () => { if (await confirmSheet({ title: 'Delete ' + c.name + '?', sub: 'Past entries stay in your history. The category disappears from the lists.', ok: 'Delete', danger: true })) { add({ t: 'cat', op: 'del', cid: id }); render(); } };
        });
    }
    function pinSheet() {
        if (!hasCrypto()) { toast('A PIN needs the https page'); return; }
        sheet(`<h2>${pinOn() ? 'Change' : 'Set'} PIN</h2><p>Four to six digits.</p><label class="field"><span>New PIN</span><input type="password" inputmode="numeric" maxlength="6" id="n-pin" autofocus></label><label class="field"><span>Repeat</span><input type="password" inputmode="numeric" maxlength="6" id="n-pin2"></label><div class="error" id="n-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="n-go">Save PIN</button></div>`, box => {
            box.querySelector('#n-go').onclick = async () => {
                const a = val(box, '#n-pin'), b = val(box, '#n-pin2');
                if (!/^\d{4,6}$/.test(a)) { box.querySelector('#n-e').textContent = 'Use 4 to 6 digits'; return; }
                if (a !== b) { box.querySelector('#n-e').textContent = 'The two PINs differ'; return; }
                await setPin(a); closeSheet(); render(); toast('PIN set');
            };
        });
    }

    /* ---------- Actions ---------- */
    function nextTodayCat(id) { return id; }
    document.addEventListener('click', async ev => {
        const nav = ev.target.closest('.nav-item');
        if (nav) { screen = nav.dataset.s; render(); window.scrollTo(0, 0); return; }
        const tg = ev.target.closest('[data-tell]'); if (tg && (!ev.target.closest('[data-act]') || ev.target.closest('[data-tell-first]'))) { ev.stopPropagation(); if (GC && GC.tell) GC.tell(tg.dataset.tell, tg.dataset.tone); else toast(tg.dataset.tell); return; }
        const el = ev.target.closest('[data-act]'); if (!el) { if (ev.target === $('sheet-bg')) closeSheet(); return; }
        const act = el.dataset.act, id = el.dataset.id;
        if (el.matches('button.add-btn')) ev.stopPropagation();
        switch (act) {
            case 'close': closeSheet(); break;
            case 'goto': screen = el.dataset.s; render(); window.scrollTo(0, 0); break;
            case 'plan': planSheet(); break;
            case 'close-month': closeMonthSheet(); break;
            case 'check': checkSheet(); break;
            case 'xfer': xferSheet(el.dataset.dir); break;
            case 'sav': savSheet(el.dataset.dir || 'in'); break;
            case 'dayclose': dayCloseSheet(); break;
            case 'more': { moreOpen = !moreOpen; const m = $('cat-more'); if (m) { m.classList.toggle('open', moreOpen); el.setAttribute('aria-expanded', moreOpen); } break; }
            case 'line': lineBump++; renderToday(); break;
            case 'entry': if (!D.P) planSheet(); else entrySheet(+id); break;
            case 'quick': quickAdd(+id); break;
            case 'led-more': ledDays += 14; renderMonth(); break;
            case 'led-edit': ledEdit = +id; renderMonth(); { const i = $('led-amt'); if (i) { i.focus(); i.select(); } } break;
            case 'led-cancel': ledEdit = 0; renderMonth(); break;
            case 'led-save': {
                const e0 = ledFind(+id); if (!e0) { ledEdit = 0; renderMonth(); break; }
                const v = parseFloat(($('led-amt') || {}).value); if (!(Math.abs(v) > 0) || (e0.kind !== 'adjust' && v < 0)) { toast('Enter an amount above 0'); break; }
                const acct = ($('led-acct') || {}).value === 'cash' ? 'cash' : 'bank', note = (($('led-note') || {}).value || '').trim();
                ledEdit = 0;
                if (v === e0.amt && acct === e0.acct && note === (e0.note || '')) { renderMonth(); break; }
                const over = { amt: v, acct, note }; if (e0.pur && e0.amt) over.pur = Object.assign({}, e0.pur, { c: Math.round(e0.pur.c * v / e0.amt * 100) / 100 });
                add({ t: 'void', target: e0.id }); const ne = add(ledCopy(e0, over), e0.ts); render(); fx('save');
                toast(`Changed ${money(e0.amt)} to ${money(v)}.`, () => { add({ t: 'void', target: ne.id }); add(ledCopy(e0), e0.ts); render(); });
                break;
            }
            case 'led-del': {
                const e0 = ledFind(+id); if (!e0) break;
                confirmSheet({ title: 'Delete this entry?', sub: `${e0.name}, ${money(e0.amt)} will be removed and your totals recalculated. You can undo straight after.`, ok: 'Delete', danger: true }).then(yes => {
                    if (!yes) return;
                    add({ t: 'void', target: e0.id }); render(); fx('down');
                    toast(`Deleted ${e0.name}, ${money(e0.amt)}.`, () => { add(ledCopy(e0), e0.ts); render(); });
                });
                break;
            }
            case 'void': add({ t: 'void', target: +id }); render(); fx('down'); toast('Entry undone'); break;
            case 'toast-undo': { const f = $('toast')._undo; $('toast').classList.remove('show'); if (f) f(); break; }
            case 'b-later': prefs.remindSnooze = Date.now() + 3600e3; persist(); renderBanner(); break;
            case 'b-now': backupSheet('share'); break;
            case 'want-add': wantSheet(); break;
            case 'want-drop': add({ t: 'want', op: 'drop', wid: id }); render(); fx('glad'); toast('Dropped. That is money kept.'); break;
            case 'want-buy': { const w = D.wants.find(x => x.wid === id); if (w) { add({ t: 'want', op: 'buy', wid: id }); screen = 'today'; render(); entrySheet(w.cat, w.price); } break; }
            case 'rev': add({ t: 'rev', pid: +id, v: el.dataset.v }); render(); break;
            case 'pick-bg': $('file-bg').click(); break;
            case 'accent': prefs.accent = el.dataset.v === 'gold' ? 'gold' : 'sapphire'; persist(); render(); break;
            case 'look': prefs.look = el.dataset.v; GLook.remember(prefs); persist(); render(); break;
            case 'pr-set': prefs.p = Object.assign({}, prefs.p, { [el.dataset.k]: el.dataset.v }); persist(); render(); break;
            case 'clear-bg': try { localStorage.removeItem(K_BG); } catch (e) {} render(); toast('Default sky restored'); break;
            case 'cat-edit': catSheet(+id); break;
            case 'cat-add': catSheet(0); break;
            case 'pin-set': pinSheet(); break;
            case 'pin-off': if (await confirmSheet({ title: 'Remove PIN?', ok: 'Remove' })) { try { localStorage.removeItem(K_PIN); } catch (e) {} render(); } break;
            case 'backup': backupSheet(el.dataset.m); break;
            case 'restore': $('file-restore').click(); break;
            case 'erase': if (await confirmSheet({ title: 'Erase everything?', sub: 'All entries and settings on this phone are deleted. Back up first if unsure.', ok: 'Erase', danger: true })) {
                ['bm2_events', 'bm2_prefs', 'bm2_pin', 'budgetApp_state', 'budgetApp_history', 'budgetApp_purch', 'budgetApp_meta'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
                prefs = PREF_DEFAULT(); firstRun(); screen = 'today'; render(); toast('Erased'); } break;
        }
    });
    document.addEventListener('change', ev => {
        const el = ev.target.closest('[data-pref]'); if (!el) return;
        const k = el.dataset.pref;
        prefs[k] = el.type === 'checkbox' ? el.checked : el.value; persist();
        if (k === 'follow' && el.checked) followNow();
        if (k === 'rememberPass' && !el.checked) { prefs.pass = ''; persist(); }
        render();
    });
    document.addEventListener('input', ev => {
        if (!ev.target || !ev.target.closest) return;
        const r = ev.target.closest('[data-pr]'); if (!r) return;
        const k = r.dataset.pr, v = parseFloat(r.value); prefs.p = Object.assign({}, prefs.p, { [k]: v });
        const lab = $('pr-' + k); if (lab) lab.textContent = v + (k === 'dotAlpha' ? '%' : k === 'mTopIn' ? ' in' : ' px'); applyTheme(); persist();
    });
    document.addEventListener('change', ev => {
        const t = ev.target;
        if (t.matches && t.matches('[data-prs]')) { prefs.p = Object.assign({}, prefs.p, { [t.dataset.prs]: t.value }); persist(); render(); }
        else if (t.matches && t.matches('[data-prc]')) { prefs.p = Object.assign({}, prefs.p, { [t.dataset.prc]: t.checked }); persist(); render(); }
        else if (t.matches && t.matches('[data-prcol]')) { prefs.p = Object.assign({}, prefs.p, { [t.dataset.prcol]: t.value, paperColor: 'custom' }); persist(); render(); }
    });
    document.addEventListener('toggle', ev => {
        const d = ev.target; if (!d || !d.matches || !d.matches('details[data-acc]')) return;
        const k = d.dataset.acc, a = (prefs.acc || []).filter(x => x !== k); if (d.open) a.push(k); prefs.acc = a; persist();
    }, true);
    try { const mq = matchMedia('(prefers-color-scheme: dark)'); (mq.addEventListener ? mq.addEventListener('change', () => followNow()) : mq.addListener(() => followNow())); } catch (e) {}
    $('file-bg').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) processWallpaper(f); };
    $('file-restore').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreFile(f); };

    /* ---------- Opening moments ---------- */
    function showSplash() {
        const s = $('splash'); if (!prefs.introOn || reduced()) return;
        $('s-hi').textContent = prefs.greetOn ? greeting() : "Rustam's Budget Manager";
        $('s-sub').innerHTML = D.P ? `${esc(money(D.P - D.cur.spent))} left from the pool<br>${esc(money(avgPerDay()))} a day` : 'Let\'s set up your month';
        { const v = $('app-ver'), sv = $('s-ver'); if (v && sv) sv.textContent = v.textContent; }
        s.classList.add('show');
        const close = () => { clearTimeout(showSplash._t); s.classList.remove('show'); };
        s.onclick = close; showSplash._t = setTimeout(close, 3000);
    }
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { hiddenAt = Date.now(); return; }
        if (pinOn() && prefs.autoLock && hiddenAt && Date.now() - hiddenAt > 60000) showLock().then(showSplash);
        if (hiddenAt && Date.now() - hiddenAt > 5 * 60000) render();
        hiddenAt = 0;
    });
    setInterval(() => { if (!document.hidden && !$('sheet-bg').classList.contains('show') && !$('lock').classList.contains('show')) render(); }, 60000);

    async function init() {
        initStore();
        refresh(); applyTheme();
        const locked = pinOn() && hasCrypto() ? showLock() : Promise.resolve();
        render(); companionReturns();
        if (window.GFeel) GFeel.saveButton({ save: () => { persist(); try { return !events.length || localStorage.getItem(K_EV) !== null; } catch (e) { return false; } }, backup: () => backupSheet('share') });
        locked.then(() => { showSplash(); setTimeout(() => { if (GC && !GC.state().action) GC.do('hello', { force: true }); }, 3600); });
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    }
    window.__bm = { quickAmounts, learnInsights, setPin, showSplash, get D() { return D; }, E, add, render, get events() { return events; }, setScreen: s => { screen = s; render(); } };
    init();
})();
