/* Rustam's Budget Manager, generation 2: screens, storage, security. The money rules live in engine.js. */
(function () {
    'use strict';
    const E = window.Engine;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAY = E.DAY;
    const $ = id => document.getElementById(id);
    const fmt = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const fmt2 = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const money = n => (n < 0 ? '-' : '') + '₹' + fmt(Math.abs(Math.round(n)));
    const mh = n => `<span class="priv">${money(n)}</span>`;
    const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    const fmtDay = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const fmtDT = ts => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
    const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

    /* ---------- Storage: one event log + preferences ---------- */
    const K_EV = 'bm2_events', K_PREF = 'bm2_prefs', K_PIN = 'bm2_pin', K_BG = 'budgetApp_bg';
    const PREF_DEFAULT = () => ({
        theme: 'auto', bgBlur: 24, glassBlur: 20,
        introOn: true, greetOn: true, lineOn: true, forecastOn: true, stripOn: true, animOn: true,
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
        if (Array.isArray(ev) && ev.length) setEvents(ev); else firstRun();
    }

    /* ---------- Themes ---------- */
    const THEMES = {
        sky: { label: 'Sky', part: 'Morning', mL: '#e3f5ff', mD: '#0a1322' },
        marigold: { label: 'Marigold', part: 'Afternoon', mL: '#fff6d6', mD: '#1a1305' },
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
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', (m.getAttribute('media') || '').indexOf('dark') >= 0 ? THEMES[id].mD : THEMES[id].mL));
        root.classList.toggle('lite', !!prefs.lite);
        root.classList.toggle('pm', !!prefs.privacy);
        root.style.setProperty('--glass-blur', prefs.glassBlur + 'px');
        applyBackground();
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
    function closeSheet() { if (GC && GC.state().poseName === 'notes') GC.pose('none'); $('sheet-bg').classList.remove('show'); const f = sheetCloser; sheetCloser = null; if (f) f(); }
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
    function ringSvg(ratio) {
        const r = Math.max(0, Math.min(1, ratio)), g = statusGrad(ratio);
        return `<div class="ring"><svg viewBox="0 0 80 80"><circle class="ring-track" cx="40" cy="40" r="36" fill="none" stroke-width="7"/><circle class="ring-arc" cx="40" cy="40" r="36" fill="none" stroke-width="7" stroke-linecap="round" stroke="${rgb(g.mid)}" stroke-dasharray="${(r * 226.2).toFixed(1)} 226.2"/></svg><div class="ring-center"><div class="ring-pct">${Math.round(ratio * 100)}%</div><div class="ring-cap">used</div></div></div>`;
    }
    function catCard(c, i) {
        const ratio = c.limit > 0 ? c.spent / c.limit : (c.spent > 0 ? 1 : 0), g = statusGrad(ratio), over = c.spent > c.limit && c.limit > 0;
        const left = c.limit - c.spent;
        const wait = prefs.purchOn && c.bucket.cool > 0 ? `<span class="cd-chip">wait ${cd(c.bucket.cool)}</span>` : '';
        return `<div class="cat-item2" data-id="${c.id}" data-act="entry" style="--i:${i};--g1:${rgb(g.g1)};--g2:${rgb(g.g2)};--glow:${rgb(g.mid, 0.35)}">
            <div class="cat-meta" style="min-width:0"><div class="cat-name"><span class="cat-ico">${esc(c.icon)}</span>${esc(c.name)}${wait}</div>
            <div class="cat-bar"><div style="width:${Math.min(100, ratio * 100)}%"></div></div></div>
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
            <div class="ring"><svg viewBox="0 0 84 84" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rgb(g.g1)}"/><stop offset="1" stop-color="${rgb(g.g2)}"/></linearGradient></defs><circle class="ring-track" cx="42" cy="42" r="36" fill="none" stroke-width="8"/><circle class="ring-arc" cx="42" cy="42" r="36" fill="none" stroke="url(#ringGrad)" stroke-width="8" stroke-linecap="${pct > 0 ? 'round' : 'butt'}" stroke-dasharray="${(pct / 100) * C} ${C}"/></svg><div class="ring-center"><div class="ring-pct">${Math.round(pct)}%</div><div class="ring-cap">used</div></div></div></div>
            <div class="pace"><div class="progress-container"><div class="progress-bar" style="width:${pct}%;background:linear-gradient(90deg,${rgb(g.g1)},${rgb(g.g2)})"></div></div><div class="pace-tick" style="left:${elapsed}%"></div></div>
            <div class="hint" style="margin-top:8px">Day ${T.day} of ${T.dm}</div>
            ${prefs.forecastOn ? `<div class="pace-note">${paceLine()}</div>` : ''}
            <div class="tiles"><div class="tile t1"><div class="t-label">Spent</div><div class="t-val priv">${money(spent)}</div></div><div class="tile t2"><div class="t-label">Per day</div><div class="t-val priv">${money(avgPerDay())}</div></div><div class="tile t3${over > 0 ? ' bad' : ''}"><div class="t-label">Overdrawn</div><div class="t-val priv">${money(over)}</div></div></div>
            ${todayGauge()}
            <div class="freq">${chips}</div>${pch}</div>`;
    }
    function renderToday() {
        const T = D.today, P = D.P, el = $('s-today');
        let h = '';
        if (!P) {
            h += `<div class="card"><h3>Welcome</h3><p class="hint">Tell the app your bank balance and this month's budget. Everything else follows from that.</p><button class="btn-line btn-accent" data-act="plan">Set up ${MONTHS[D.cur.m]}</button></div>`;
        } else {
            h += dashCard();
        }
        if (prefs.lineOn) { const [q, k] = pickLine(); h += `<div class="daily-line" data-act="line"><span class="q">“</span><div class="t">${esc(q)}<span class="k">${esc(k)}</span></div></div>`; }
        if (prefs.dayCloseOn && P && new Date().getHours() >= 18 && !D.dayCloses.has(T.key)) h += `<div class="banner"><span>Close today? ${D.streak ? `Streak: ${plural(D.streak, 'day')}.` : ''}</span><span class="b-act"><button class="on" data-act="dayclose">Close day</button></span></div>`;
        else if (D.streak > 1) h += `<div class="streak" style="margin:0 0 10px 4px">🔥 ${plural(D.streak, 'day')} of closed days</div>`;
        h += `<div class="list-header"><span>Categories</span><span class="hint">tap + to add</span></div><div id="cats">${D.cats.map(catCard).join('')}</div>`;
        const before = {};
        if (prefs.animOn && !reduced()) el.querySelectorAll('.cat-item2').forEach(n => { before[n.dataset.id] = n.getBoundingClientRect().top; });
        el.innerHTML = h;
        if (prefs.animOn && !reduced() && Object.keys(before).length && el.animate !== undefined) {
            el.querySelectorAll('.cat-item2').forEach(n => {
                const b = before[n.dataset.id]; if (b === undefined) return;
                const dy = b - n.getBoundingClientRect().top; if (!dy) return;
                try { n.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 750, easing: 'cubic-bezier(0.22,0.8,0.25,1)' }); } catch (e) {}
            });
        }
    }

    function monthLedger(box) {
        const list = D.cur.exps.filter(e => e.kind !== 'import').slice().reverse().slice(0, 60);
        if (!list.length) return '<p class="hint">Nothing yet this month.</p>';
        return list.map(e => `<div class="ledger-row"><div style="min-width:0"><div>${esc(e.icon)} ${esc(e.name)}${e.pur ? ' · big' : ''}</div><div class="meta">${fmtDT(e.ts)} · ${e.acct === 'cash' ? 'Cash' : 'Bank'}${e.note ? ' · ' + esc(e.note) : ''}</div></div><div class="row" style="gap:8px"><b class="num priv">${money(e.amt)}</b><button class="mini-btn" data-act="void" data-id="${e.id}">Undo</button></div></div>`).join('');
    }
    function renderMonth() {
        const P = D.P, c = D.cur;
        let h = `<div class="card"><h3>${MONTHS[c.m]} ${c.y}</h3>`;
        if (P) h += `<div class="row"><span class="muted">Budget</span><b class="num">${mh(P)}</b></div><div class="row"><span class="muted">Spent</span><b class="num">${mh(c.spent)}</b></div><div class="row"><span class="muted">Left</span><b class="num ${P - c.spent < 0 ? 'bad' : ''}">${mh(P - c.spent)}</b></div>
            <div class="row"><span class="muted">Bank balance</span><b class="num priv ${D.accounts.bank < 0 ? 'bad' : ''}">${money(D.accounts.bank)}</b></div><div class="row"><span class="muted">Cash in hand</span><b class="num priv ${D.accounts.cash < 0 ? 'bad' : ''}">${money(D.accounts.cash)}</b></div>
            <div class="row"><span class="muted">Bank · Cash spent</span><span class="priv">${money(c.byAcct.bank)} · ${money(c.byAcct.cash)}</span></div>
            <div class="grid2 mt"><button class="btn-line" data-act="plan">Edit plan</button><button class="btn-line" data-act="check">Reality check</button></div>`;
        else h += `<button class="btn-line btn-accent" data-act="plan">Set up ${MONTHS[c.m]}</button>`;
        h += `</div><div class="card"><h3>Money moves</h3><p class="hint">Record cash you withdraw or deposit so Bank and Cash stay true.</p><div class="grid2"><button class="btn-line" data-act="xfer" data-dir="b2c">Bank → Cash</button><button class="btn-line" data-act="xfer" data-dir="c2b">Cash → Bank</button></div></div>`;
        h += `<div class="card"><h3>Savings</h3><div class="row"><b class="num" style="font-size:1.8rem">${mh(D.savings)}</b><span class="hint">stays in your bank</span></div><div class="grid2 mt"><button class="btn-line" data-act="sav" data-dir="in">Add</button><button class="btn-line" data-act="sav" data-dir="out">Withdraw</button></div>
            ${D.savLog.slice(-4).reverse().map(s => `<div class="ledger-row"><span class="meta">${fmtDay(s.ts)} · ${esc(s.note || (s.amt > 0 ? 'Deposit' : 'Withdrawal'))}</span><b class="priv">${money(s.amt)}</b></div>`).join('')}</div>`;
        h += `<div class="card"><h3>Envelopes</h3>${D.cats.map(k => { const r = k.limit > 0 ? k.spent / k.limit : 0, g = statusGrad(r); return `<div class="env"><div class="top"><span>${esc(k.icon)} ${esc(k.name)}</span><span class="priv ${k.spent > k.limit ? 'bad' : ''}">${money(k.spent)} / ${money(k.limit)}</span></div><div class="cat-bar"><div style="width:${Math.min(100, r * 100)}%;background:linear-gradient(90deg,${rgb(g.g1)},${rgb(g.g2)})"></div></div></div>`; }).join('')}</div>`;
        h += `<div class="card"><h3>Ledger</h3>${monthLedger()}</div>`;
        $('s-month').innerHTML = h;
    }

    function renderMind() {
        const p = D.pool;
        let h = `<div class="card"><h3>Big-purchase pool</h3><div class="row"><b class="num" style="font-size:2rem">${mh(p.bal)}</b><span class="hint">available now</span></div>
            <p class="hint mt">${mh(p.allow)} arrives each month. Unused money carries forward. Spending of ${mh(p.min)} or more counts as a big purchase and needs a reason. Used this month: ${mh(p.used)}.</p></div>`;
        const waits = D.cats.filter(c => c.bucket.allow > 0).sort((a, b) => b.bucket.cool - a.bucket.cool || b.bucket.bal - a.bucket.bal);
        h += `<div class="card"><h3>Waiting by category</h3>${waits.map(c => `<div class="ledger-row"><div><div>${esc(c.icon)} ${esc(c.name)}</div><div class="meta">${c.bucket.cool > 0 ? 'Opens ' + fmtDay(c.bucket.until) : 'Open now'} · grows ${money(c.bucket.allow)}/month</div></div><div class="right"><b class="num ${c.bucket.cool > 0 ? 'bad' : 'good'}">${c.bucket.cool > 0 ? plural(c.bucket.cool, 'day') : mh(c.bucket.bal)}</b></div></div>`).join('') || '<p class="hint">No category has an allowance yet.</p>'}</div>`;
        const wantCard = prefs.waitOn ? `<div class="card"><h3>Want list</h3><p class="hint">Write wants down. Each waits 24 hours before you can buy it.</p>${D.wants.filter(w => w.status === 'wait').map(w => { const left = w.ts + DAY - Date.now(); return `<div class="want"><div class="row"><span>${esc(w.name)}</span><b class="num priv">${money(w.price)}</b></div><div class="row mt"><span class="meta muted">${left > 0 ? 'Wait ' + Math.ceil(left / 3600e3) + 'h more' : 'Ready if you still want it'}</span><span><button class="mini-btn" data-act="want-drop" data-id="${w.wid}">Drop it</button> <button class="mini-btn" data-act="want-buy" data-id="${w.wid}" ${left > 0 ? 'disabled style="opacity:.4"' : ''}>Buy</button></span></div></div>`; }).join('') || '<p class="hint">Empty.</p>'}<button class="btn-line" data-act="want-add">Add a want</button></div>` : '';
        h += wantCard;
        if (prefs.reviewOn) {
            const due = D.purchases.filter(x => !x.review && Date.now() - x.ts >= 30 * DAY);
            if (due.length) h += `<div class="card"><h3>Still glad?</h3>${due.slice(0, 3).map(x => `<div class="want"><div class="row"><span>${esc(x.icon)} ${esc(x.catName)} · ${fmtDay(x.ts)}</span><b class="priv">${money(x.total)}</b></div><div class="p-reason">“${esc(x.reason)}”</div><div class="review-row"><button data-act="rev" data-id="${x.id}" data-v="yes">Yes</button><button data-act="rev" data-id="${x.id}" data-v="meh">Meh</button><button data-act="rev" data-id="${x.id}" data-v="no">No</button></div></div>`).join('')}</div>`;
        }
        h += `<div class="card"><h3>Purchases</h3>${D.purchases.slice(0, 30).map(x => `<div class="pitem"><div class="pi-top"><span>${esc(x.icon)} ${esc(x.catName)}</span><b class="priv">${money(x.total)}</b></div><div class="meta muted">${fmtDay(x.ts)}${x.emg ? ' · emergency' : ''}${x.review ? ' · ' + ({ yes: 'glad', meh: 'unsure', no: 'regret' })[x.review] : ''}</div>${x.reason ? `<div class="p-reason">“${esc(x.reason)}”</div>` : ''}</div>`).join('') || '<p class="hint">No big purchases yet.</p>'}</div>`;
        $('s-mind').innerHTML = h;
    }



    /* ================= Version 2.3: the Circle Companion and today's spending gauge ================= */
    let GC = null, lastScreen = null, prevLeft = null;
    // today's spend against your usual day: the average of this month's earlier days (today does not judge itself)
    function dayAvg() { const T = D.today; if (!D.P || T.day < 3) return null; return Math.max(0, (D.cur.spent - T.spent) / (T.day - 1)); }
    function todayGauge() {
        const T = D.today, avg = dayAvg(), spent = T.spent;
        if (avg === null || avg < 1) return `<div class="tg"><div class="row"><span class="label">Today so far</span><span class="priv"><b>${money(spent)}</b></span></div><div class="hint">Your daily average appears after day 3.</div></div>`;
        const r = spent / avg, diff = Math.abs(spent - avg), pct = Math.min(100, spent / (2 * avg) * 100);
        const kind = r <= 1 ? 'down' : r <= 1.5 ? 'up' : 'high';
        const note = spent === 0 ? 'Nothing spent yet today.' : r <= 1 ? `▼ ${money(diff)} below your average` : `▲ ${money(diff)} above your average`;
        return `<div class="tg ${kind}"><div class="row"><span class="label">Today so far</span><span class="tg-note">${esc(note)}</span></div>
            <div class="tg-track"><i class="tg-fill grow" style="width:${pct}%"></i><b class="tg-mark" style="left:50%"></b></div>
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
    function renderCompanion() {
        const host = $('orb'); if (!host || !window.GCompanion) return;
        if (!GC) GC = window.GCompanion.create(host, { pos: 'header', onTap: c => { c.pose('point', 3200); c.say(orbMessage(), 4600); } });
        const mode = prefs.orbMode || 'header';
        GC.show(mode !== 'off'); GC.setPos(mode === 'float' ? 'float' : 'header');
        if (mode === 'off') return;
        GC.mood(budgetMood());
        // small, purposeful reactions
        if (screen !== lastScreen) { if (screen === 'ins' && lastScreen) GC.pose('insight', 5200); lastScreen = screen; }
        const left = D.P ? D.P - D.cur.spent : null;
        if (left !== null && prevLeft !== null && prevLeft >= 0 && left < 0) { GC.sayQuiet('You have gone past this month\'s pool. No blame. Let us look at what can ease.', 6000); }
        prevLeft = left;
    }
    function companionReturns() {
        try {
            const last = +localStorage.getItem('gc_last') || 0; localStorage.setItem('gc_last', String(Date.now()));
            if (last && Date.now() - last > 6 * 3600e3 && GC && (prefs.orbMode || 'header') !== 'off') { GC.wake(); setTimeout(() => GC.say('Welcome back.', 3200), 900); }
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
        if (all.length < 15 || span < 21) return `<div class="card"><h3>What the app has learned</h3><p class="hint">After about three weeks of entries, this card shows your spending habits in plain words. So far: ${plural(all.length, 'entry')}.</p></div>`;
        const out = [], DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        // days of the week
        const cutoff = Date.now() - 56 * DAY, sum = [0, 0, 0, 0, 0, 0, 0], dset = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()];
        all.forEach(e => { if (e.ts >= cutoff) { const d = new Date(e.ts).getDay(); sum[d] += e.amt; dset[d].add(E.dateKey(e.ts)); } });
        const av = sum.map((v, i) => v / 8);
        if (dset.every(s => s.size >= 3)) { const hi = av.indexOf(Math.max.apply(null, av)), lo = av.indexOf(Math.min.apply(null, av)); if (av[hi] > av[lo] * 1.4) out.push(`You spend most on <b>${DN[hi]}s</b> (about ${mh(av[hi])}) and least on <b>${DN[lo]}s</b> (about ${mh(av[lo])}).`); }
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
        return `<div class="card"><h3>Your data</h3><p class="hint">Every entry is saved on this phone only: ${events.length} entries, about ${kb} KB. The app learns from them here. Nothing is sent anywhere. Use Backup to keep a safe copy.</p>${sw('learnOn', 'Learn from my entries', 'Shows your usual amounts as quick buttons and writes plain-word insights.')}<div class="sw-row"><div><div>Companion</div><div class="set-meta">Where the Circle Companion lives.</div></div><select class="set-select" data-pref="orbMode">${[['header', 'Header corner'], ['float', 'Floating, bottom right'], ['off', 'Off']].map(([v, t]) => `<option value="${v}" ${(prefs.orbMode || 'header') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>`;
    }
    function renderIns() {
        const days = [0, 0, 0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0, 0, 0], cutoff = Date.now() - 56 * DAY, seen = {};
        D.months.forEach(m => m.exps.forEach(e => { if (e.ts >= cutoff && e.kind !== 'import') { const d = new Date(e.ts); days[d.getDay()] += e.amt; seen[E.dateKey(e.ts)] = d.getDay(); } }));
        Object.keys(seen).forEach(k => cnt[seen[k]]++);
        const avg = days.map((v, i) => v / Math.max(1, Math.round(56 / 7)));
        const mx = Math.max(1, ...avg), names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        let h = `<div class="card"><h3>Which days cost most</h3><p class="hint">Average spend per weekday, last 8 weeks.</p><div class="bars">${avg.map((v, i) => `<div><span class="priv">${v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)}</span><b style="height:${Math.max(3, v / mx * 62)}px"></b>${names[i]}</div>`).join('')}</div></div>`;
        const ms = D.months.filter(m => m.spent > 0).slice(-6), mm = Math.max(1, ...ms.map(m => m.spent));
        h += `<div class="card"><h3>Months</h3><div class="bars">${ms.map(m => `<div><span class="priv">${Math.round(m.spent / 1000)}k</span><b style="height:${Math.max(3, m.spent / mm * 62)}px"></b>${MONTHS[m.m]}</div>`).join('')}</div></div>`;
        const fixed = D.cats.filter(c => c.type === 'fixed' && (D.priceHist[c.id] || []).length > 1);
        h += `<div class="card"><h3>Price tracker</h3>${fixed.map(c => `<div class="ledger-row"><span>${esc(c.icon)} ${esc(c.name)}</span><span class="priv">${D.priceHist[c.id].map(x => money(x.price)).join(' → ')}</span></div>`).join('') || '<p class="hint">Change a fixed price in Settings and its history shows here.</p>'}</div>`;
        const resisted = D.wants.filter(w => w.status === 'dropped').reduce((s, w) => s + w.price, 0);
        h += `<div class="card"><h3>Resisted</h3><div class="row"><b class="num" style="font-size:1.8rem">${mh(resisted)}</b><span class="hint">in wants you let go</span></div></div>`;
        h += `<div class="card"><h3>Closed months</h3>${D.months.filter(m => m.close).slice(-6).reverse().map(m => `<div class="ledger-row"><span>${MONTHS[m.m]} ${m.y}</span><span class="priv">saved ${money(m.close.toSave)} · pool +${money(m.close.toPool)}</span></div>`).join('') || '<p class="hint">None yet.</p>'}</div>`;
        $('s-ins').innerHTML = learnInsights() + h;
    }

    const sw = (k, t, d) => `<div class="sw-row"><div><div>${t}</div>${d ? `<div class="set-meta">${d}</div>` : ''}</div><label class="switch"><input type="checkbox" data-pref="${k}" ${prefs[k] ? 'checked' : ''}><i></i></label></div>`;
    const slider = (id, l, max, v) => `<div class="bg-row"><span>${l}</span><input type="range" id="${id}" min="0" max="${max}" value="${v}"><b class="bg-val" id="${id}-v">${v}</b></div>`;
    function renderSet() {
        let hasBg = false; try { hasBg = !!localStorage.getItem(K_BG); } catch (e) {}
        let h = `<div class="card"><h3>Look</h3><div class="sw-row"><span>Theme</span><select class="set-select" data-pref="theme">${[['auto', 'Automatic (by time of day)']].concat(Object.keys(THEMES).map(k => [k, THEMES[k].label + (THEMES[k].part ? ' · ' + THEMES[k].part : '')])).map(([k, l]) => `<option value="${k}" ${prefs.theme === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            ${sw('lite', 'Lite mode', 'No blur or motion. Faster on older phones.')}${sw('privacy', 'Privacy mode', 'Blur amounts. Hold a number to peek.')}
            <button class="btn-line btn-accent" data-act="pick-bg">${hasBg ? 'Change' : 'Choose'} wallpaper photo</button>${hasBg ? '<button class="btn-line" data-act="clear-bg">Use default sky</button>' + slider('bg-blur', 'Wallpaper blur', 40, Math.min(40, prefs.bgBlur)) : ''}${slider('glass-blur', 'Glass frosting', 30, Math.min(30, prefs.glassBlur))}</div>`;
        h += dataCard();
        h += `<div class="card"><h3>Experience</h3>${sw('introOn', 'Opening screen', 'Greeting and animation when the app opens.')}${sw('greetOn', 'Greeting by name')}${sw('lineOn', 'Daily line', 'Proverbs and tips.')}${sw('forecastOn', 'Month forecast')}${sw('animOn', 'Slow category glide')}${sw('warnOn', 'Budget-break warnings')}${sw('dayCloseOn', 'Close-the-day ritual')}${sw('purchOn', 'Big-purchase rules')}${sw('waitOn', '24-hour want list')}${sw('reviewOn', '30-day "still glad?" review')}${sw('remindOn', 'Backup reminder', 'A banner in the app. A web app cannot ring while closed.')}</div>`;
        h += `<div class="card"><h3>Categories and rules</h3>${D.cats.slice().sort((a, b) => a.id - b.id).map(c => `<div class="ledger-row tap" data-act="cat-edit" data-id="${c.id}"><span>${esc(c.icon)} ${esc(c.name)}</span><span class="muted priv">${money(c.limit)}</span></div>`).join('')}<button class="btn-line" data-act="cat-add">Add category</button></div>`;
        const pin = pinOn();
        h += `<div class="card"><h3>Security</h3><p class="hint">The PIN keeps people out of the app. Backups are encrypted with their own password.</p>${pin ? sw('autoLock', 'Lock when I leave the app') : ''}<button class="btn-line" data-act="pin-set">${pin ? 'Change PIN' : 'Set a PIN'}</button>${pin ? '<button class="btn-line" data-act="pin-off">Remove PIN</button>' : ''}</div>`;
        h += `<div class="card"><h3>Backup</h3><p class="hint">${prefs.lastBackup ? 'Last backup ' + fmtDT(prefs.lastBackup) : 'Not backed up yet.'} Share opens your phone's share sheet: choose Google Drive or Proton Drive.</p><button class="btn-line btn-accent" data-act="backup" data-m="share">Back up now (share)</button><button class="btn-line" data-act="backup" data-m="download">Save to Downloads</button><button class="btn-line" data-act="backup" data-m="plain">Share unencrypted copy</button><button class="btn-line" data-act="restore">Restore from a file</button>${sw('rememberPass', 'Remember backup password', 'Stored on this phone only.')}<button class="btn-line" data-act="erase" style="color:var(--warning)">Erase everything</button></div>`;
        $('s-set').innerHTML = h;
        const bb = $('bg-blur'), gb = $('glass-blur');
        if (bb) bb.oninput = () => { prefs.bgBlur = +bb.value; $('bg-blur-v').textContent = bb.value; applyBackground(); persist(); };
        if (gb) gb.oninput = () => { prefs.glassBlur = +gb.value; $('glass-blur-v').textContent = gb.value; document.documentElement.style.setProperty('--glass-blur', gb.value + 'px'); persist(); };
    }

    function render() {
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
                closeSheet(); render(); toast('Plan saved');
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
                add({ t: 'close', y: pc.y, m: pc.m, toSave: s, toPool: p }); closeSheet(); render(); toast('Month closed');
            };
        });
    }
    function checkSheet() {
        sheet(`<h2>Reality check</h2><p>Enter what your bank app and wallet really show. The app adjusts and remembers the difference.</p>
            <div class="grid2"><label class="field"><span>Bank</span><input type="number" inputmode="decimal" id="k-b" value="${Math.round(D.accounts.bank)}" autofocus></label><label class="field"><span>Cash</span><input type="number" inputmode="decimal" id="k-c" value="${Math.round(D.accounts.cash)}"></label></div>
            <div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="k-go">Update</button></div>`, box => {
            box.querySelector('#k-go').onclick = () => {
                const b = numv(box, '#k-b'), c = numv(box, '#k-c');
                add({ t: 'check', bank: isFinite(b) ? b : null, cash: isFinite(c) ? c : null }); closeSheet(); render(); toast('Balances updated');
            };
        });
    }
    function xferSheet(dir) {
        const l = dir === 'b2c' ? ['Withdraw cash', 'Bank → Cash'] : ['Deposit cash', 'Cash → Bank'];
        sheet(`<h2>${l[0]}</h2><p>${l[1]}</p><label class="field"><span>Amount</span><input type="number" inputmode="decimal" id="x-a" autofocus></label><div class="error" id="x-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="x-go">Move</button></div>`, box => {
            box.querySelector('#x-go').onclick = () => { const a = numv(box, '#x-a'); if (!(a > 0)) { box.querySelector('#x-e').textContent = 'Enter an amount'; return; } add({ t: 'xfer', dir, amt: a }); closeSheet(); render(); toast('Moved'); };
        });
    }
    function savSheet(dir) {
        const out = dir === 'out';
        sheet(`<h2>${out ? 'Withdraw from savings' : 'Add to savings'}</h2><p>Savings are a promise on paper; the money stays in your bank. Now saved: ${money(D.savings)}.</p><label class="field"><span>Amount</span><input type="number" inputmode="decimal" id="s-a" autofocus></label>${out ? '<label class="field"><span>Why?</span><input type="text" id="s-n"></label>' : ''}<div class="error" id="s-e"></div><div class="modal-actions"><button class="btn-secondary" data-act="close">Cancel</button><button class="btn-primary" id="s-go">Save</button></div>`, box => {
            box.querySelector('#s-go').onclick = () => {
                const a = numv(box, '#s-a'); if (!(a > 0)) { box.querySelector('#s-e').textContent = 'Enter an amount'; return; }
                if (out && a > D.savings) { box.querySelector('#s-e').textContent = 'More than you have saved'; return; }
                add({ t: 'sav', amt: out ? -a : a, note: out ? val(box, '#s-n') : '' }); closeSheet(); render(); toast('Savings updated');
            };
        });
    }
    function dayCloseSheet() {
        const T = D.today;
        sheet(`<h2>Close today</h2><p>You spent ${mh(T.spent)} today and have ${mh(D.P - D.cur.spent)} left this month. Is everything recorded, cash included?</p><div class="modal-actions"><button class="btn-secondary" data-act="close">Not yet</button><button class="btn-primary" id="dc">All recorded</button></div>`, box => {
            box.querySelector('#dc').onclick = () => { add({ t: 'dayclose', day: T.key }); closeSheet(); render(); toast('Day closed'); if (GC) { GC.pose('cheer', 2600); GC.say('Day closed. Well done.', 3200); } };
        });
    }

    /* expense entry */
    function entrySheet(catId, preset) {
        const c = D.catsById[catId]; if (!c) return;
        if (GC) GC.pose('notes');
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
                    if (as.blocked && !emg) ok = false;
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
                const ev = add(e); closeSheet(); render(); vibrate(20);
                                toast(`${money(a)} added to ${c.name}`, () => { add({ t: 'void', target: ev.id }); render(); });
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
        render(); vibrate(15);
        toast(`${money(c.price)} · ${c.name}`, () => { add({ t: 'void', target: ev.id }); render(); });
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
            case 'line': lineBump++; renderToday(); break;
            case 'entry': if (!D.P) planSheet(); else entrySheet(+id); break;
            case 'quick': quickAdd(+id); break;
            case 'void': add({ t: 'void', target: +id }); render(); toast('Entry undone'); break;
            case 'toast-undo': { const f = $('toast')._undo; $('toast').classList.remove('show'); if (f) f(); break; }
            case 'b-later': prefs.remindSnooze = Date.now() + 3600e3; persist(); renderBanner(); break;
            case 'b-now': backupSheet('share'); break;
            case 'want-add': wantSheet(); break;
            case 'want-drop': add({ t: 'want', op: 'drop', wid: id }); render(); toast('Dropped. That is money kept.'); break;
            case 'want-buy': { const w = D.wants.find(x => x.wid === id); if (w) { add({ t: 'want', op: 'buy', wid: id }); screen = 'today'; render(); entrySheet(w.cat, w.price); } break; }
            case 'rev': add({ t: 'rev', pid: +id, v: el.dataset.v }); render(); break;
            case 'pick-bg': $('file-bg').click(); break;
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
        if (k === 'rememberPass' && !el.checked) { prefs.pass = ''; persist(); }
        render();
    });
    $('file-bg').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) processWallpaper(f); };
    $('file-restore').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreFile(f); };

    /* ---------- Opening moments ---------- */
    function showSplash() {
        const s = $('splash'); if (!prefs.introOn || reduced()) return;
        $('s-hi').textContent = prefs.greetOn ? greeting() : "Rustam's Budget Manager";
        $('s-sub').innerHTML = D.P ? `${esc(money(D.P - D.cur.spent))} left from the pool<br>${esc(money(avgPerDay()))} a day` : 'Let\'s set up your month';
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
        render(); companionReturns(); locked.then(showSplash);
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    }
    window.__bm = { quickAmounts, learnInsights, setPin, showSplash, get D() { return D; }, E, add, render, get events() { return events; }, setScreen: s => { screen = s; render(); } };
    init();
})();
