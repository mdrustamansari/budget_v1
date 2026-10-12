/* GFeel: the "feel" of the app. Sounds (made live with Web Audio, no files, works offline), vibration,
   the instant-save button and the sound/vibration settings card. Shared by the Goal and Budget apps.
   Taps get only a tiny click. Rich sounds are kept for real moments (a log, a finished piece, an undo).
   API: GFeel.play(name)  GFeel.buzz(name)  GFeel.moment(name)  GFeel.settingsHTML()  GFeel.saveButton(opts)  GFeel.prefs */
(function (root) {
    'use strict';
    const KEY = 'gf_prefs2', DEF = { snd: true, vol: 55, night: false, vib: true, vs: 'mid', save: true };
    let PR = null;
    const load = () => { if (PR) return PR; let o = null; try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} PR = Object.assign({}, DEF, o || {}); return PR; };
    const set = p => { PR = Object.assign(load(), p); try { localStorage.setItem(KEY, JSON.stringify(PR)); } catch (e) {} if (p.save !== undefined && api._onSave) api._onSave(); };
    const nightNow = () => { const h = new Date().getHours(); return h >= 22 || h < 7; };
    const lite = () => document.documentElement.classList.contains('lite');

    // ---------- sound: every pattern is under 3 seconds
    let ctx = null;
    function audio() {
        if (!ctx) { const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null; try { ctx = new AC(); } catch (e) { return null; } }
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
        return ctx;
    }
    // one soft note: a sine or triangle with a quick attack and a smooth fade
    function note(c, out, f, t0, dur, type, vol, glideTo) {
        const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
        if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    const N = { A3: 220, D4: 293.66, F4: 349.23, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5 };
    // name: [length in seconds, builder]
    const SOUNDS = {
        tick: [0.05, (c, o, t) => note(c, o, 2200, t, 0.03, 'sine', 0.25)],
        save: [0.5, (c, o, t) => { note(c, o, N.E5, t, 0.22, 'sine', 0.5); note(c, o, N.A4 * 2, t + 0.1, 0.35, 'sine', 0.5); }],
        up: [0.7, (c, o, t) => { [N.C5, N.E5, N.G5].forEach((f, i) => note(c, o, f, t + i * 0.12, 0.3, 'triangle', 0.5)); }],
        down: [0.7, (c, o, t) => { note(c, o, N.G4, t, 0.3, 'sine', 0.45); note(c, o, N.D4, t + 0.2, 0.42, 'sine', 0.4); }],
        stop: [0.45, (c, o, t) => { note(c, o, N.A3, t, 0.12, 'triangle', 0.55); note(c, o, N.A3, t + 0.18, 0.18, 'triangle', 0.55); }],
        glad: [1.5, (c, o, t) => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note(c, o, f, t + i * 0.04, 1.1, 'sine', 0.32)); note(c, o, N.E6, t + 0.25, 0.9, 'sine', 0.18); }],
        fanfare: [2.1, (c, o, t) => { [N.C5, N.G5, N.C6, N.E6].forEach((f, i) => note(c, o, f, t + i * 0.16, 0.45, 'triangle', 0.4)); [N.C5, N.E5, N.G5, N.C6].forEach(f => note(c, o, f, t + 0.7, 1.3, 'sine', 0.26)); }],
        sad: [2.2, (c, o, t) => { [N.A4, N.F4, N.D4].forEach((f, i) => note(c, o, f, t + i * 0.45, 0.9, 'sine', 0.3)); }]
    };
    function play(name) {
        const P = load(); if (!P.snd || P.vol <= 0) return false; if (P.night && nightNow()) return false;
        const d = SOUNDS[name]; if (!d) return false; const c = audio(); if (!c) return false;
        try {
            const out = c.createGain(), v = Math.pow(P.vol / 100, 1.15) * 0.9; out.gain.value = name === 'tick' ? v * 0.35 : v; out.connect(c.destination);
            d[1](c, out, c.currentTime + 0.01);
            setTimeout(() => { try { out.disconnect(); } catch (e) {} }, (d[0] + 0.3) * 1000);
        } catch (e) { return false; }
        return true;
    }

    // ---------- vibration: each kind of touch has its own rhythm
    const PAT = { tick: [8], pulse: [16], num: [10, 45, 10], boop: [12, 30, 24], save: [14, 40, 14], up: [12, 40, 12, 40, 24], down: [30, 60, 14], stop: [40, 50, 40], glad: [14, 40, 14, 40, 40], big: [30, 50, 30, 50, 30, 50, 70], sad: [60, 90, 30] };
    function buzz(name) {
        const P = load(); if (!P.vib || !navigator.vibrate) return false; const p = PAT[name]; if (!p) return false;
        const k = P.vs === 'low' ? 0.6 : P.vs === 'high' ? 1.6 : 1;
        try { navigator.vibrate(p.map((x, i) => i % 2 === 0 ? Math.max(4, Math.round(x * k)) : x)); } catch (e) {} return true;
    }
    // a real moment: sound and vibration together
    function moment(name) { play(name); buzz(name); }

    // ---------- taps: tiny click and a light buzz, a different buzz for bars, numbers and the character
    function kindOf(el) {
        if (el.closest('.gc-hit')) return 'boop';
        if (el.closest('[data-fx="num"], .num, .tp-big, .ring-pct')) return 'num';
        if (el.closest('[data-fx="bar"], .bars7, .tp-bars, .tp-road, .tp-gauge, .b7, .slipbar, .ring')) return 'pulse';
        if (el.closest('button, .btn-line, .nav-item, .mini-btn, .ledger-row, [data-act], [data-tell], .seg, .keypad, summary, label.switch, .tp-chip')) return 'tick';
        return null;
    }
    // phones only allow sound and vibration after a real tap has finished, so react when the finger lifts
    const unlock = () => { audio(); };
    document.addEventListener('pointerup', e => {
        unlock(); if (e.button !== undefined && e.button > 0) return; const k = e.target && e.target.closest ? kindOf(e.target) : null; if (!k) return;
        buzz(k); if (k === 'tick' || k === 'pulse' || k === 'num') play('tick');
    }, { passive: true, capture: true });
    document.addEventListener('click', unlock, { passive: true, capture: true });

    // ---------- the instant-save button (bottom left, within the thumb's reach)
    let btn = null, pop = null, popT = null, cb = {};
    function saveButton(o) {
        cb = o || {}; if (btn) { api._onSave(); return; }
        const css = document.createElement('style');
        css.textContent = `
.gf-save { position: fixed; left: 14px; bottom: calc(84px + env(safe-area-inset-bottom)); width: 48px; height: 48px; border-radius: 50%; z-index: 8; display: flex; align-items: center; justify-content: center; border: 1px solid var(--glass-line, rgba(255,255,255,.6)); background: var(--glass-hi, rgba(255,255,255,.8)); -webkit-backdrop-filter: blur(var(--glass-blur, 18px)); backdrop-filter: blur(var(--glass-blur, 18px)); box-shadow: 0 6px 18px rgba(20,30,60,.2); color: var(--blue-b, #1668f0); cursor: pointer; padding: 0; transition: transform .2s ease; -webkit-tap-highlight-color: transparent; }
.gf-save:active { transform: scale(.9); }
.gf-save svg { width: 24px; height: 24px; }
.gf-save.ok svg .tick { stroke-dashoffset: 0; }
.gf-save .tick { stroke-dasharray: 20; stroke-dashoffset: 20; transition: stroke-dashoffset .35s ease; }
.gf-pop { position: fixed; left: 14px; bottom: calc(142px + env(safe-area-inset-bottom)); z-index: 8; display: flex; align-items: center; gap: 10px; padding: 9px 12px 9px 14px; border-radius: 18px; background: rgba(15,27,46,.86); color: #fff; font-size: .95rem; box-shadow: 0 8px 22px rgba(0,0,0,.25); opacity: 0; transform: translateY(8px); pointer-events: none; transition: opacity .25s, transform .25s; max-width: calc(100% - 28px); }
.gf-pop.show { opacity: 1; transform: none; pointer-events: auto; }
.gf-pop button { background: rgba(255,255,255,.2); color: #fff; border: 1px solid rgba(255,255,255,.35); border-radius: 12px; padding: 6px 11px; font-size: .9rem; white-space: nowrap; }
html.lite .gf-save, html.lite .gf-pop { -webkit-backdrop-filter: none; backdrop-filter: none; } body.still .gf-save, body.still .gf-pop { transition: none; }
.gf-set .gf-row { margin-top: 12px; } .gf-set input[type=range] { width: 100%; accent-color: var(--blue-b, #4a6cf7); margin: 4px 0 2px; }
.gf-set .gf-lbl { display: flex; justify-content: space-between; font-size: .85rem; color: var(--text-muted); } .gf-set .set-select { width: 100%; max-width: 100%; margin-top: 4px; }`;
        document.head.appendChild(css);
        btn = document.createElement('button'); btn.className = 'gf-save'; btn.type = 'button'; btn.setAttribute('aria-label', 'Save now');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3"/><path class="tick" d="M8.5 15.5l2.6 2.6 4.6-5"/></svg>';
        pop = document.createElement('div'); pop.className = 'gf-pop'; pop.innerHTML = '<span>Saved on this phone</span><button type="button">Back up now</button>';
        document.body.appendChild(btn); document.body.appendChild(pop);
        btn.addEventListener('click', () => {
            let ok = true; try { if (cb.save) ok = cb.save() !== false; } catch (e) { ok = false; }
            btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 1400);
            pop.firstChild.textContent = ok ? 'Saved on this phone' : 'Could not save here';
            pop.lastChild.style.display = ok && cb.backup ? '' : 'none';
            pop.classList.add('show'); clearTimeout(popT); popT = setTimeout(() => pop.classList.remove('show'), 4200);
            moment(ok ? 'save' : 'stop');
        });
        pop.lastChild.addEventListener('click', () => { pop.classList.remove('show'); try { cb.backup && cb.backup(); } catch (e) {} });
        // the character keeps away from this corner and from the tab bar
        if (root.GCompanion && root.GCompanion.reserve) root.GCompanion.reserve(() => {
            const r = [], nav = document.getElementById('nav') || document.querySelector('.nav-bar'); [btn, nav].forEach(el => { if (!el || el.style.display === 'none') return; const b = el.getBoundingClientRect(); if (b.width > 0 && b.height > 0) r.push(b); }); return r;
        });
        api._onSave();
    }

    // ---------- settings card
    function settingsHTML() {
        const p = load(), opt = (v, t, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`;
        const row = (k, t, d, on) => `<div class="gf-row"><div class="sw-row" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>${t}${d ? `<span class="hint" style="display:block">${d}</span>` : ''}</span><label class="switch"><input type="checkbox" data-gf="${k}" ${on ? 'checked' : ''}><i></i></label></div></div>`;
        return `<div class="card gf-set"><h3>Sounds and vibration</h3><p class="hint">Short sounds mark real moments, never longer than 3 seconds. Your phone plays them at media volume.</p>
${row('snd', 'Sounds', 'Rising notes for a gain, a soft fall for an undo.', p.snd)}
<div class="gf-row"><div>Volume: <b data-gf-out="vol">${p.vol}</b>%</div><input type="range" min="0" max="100" value="${p.vol}" data-gf="vol"><div class="gf-lbl"><span>Quiet</span><span>Louder</span></div></div>
${row('night', 'Quiet at night', 'No sounds between 10 pm and 7 am.', p.night)}
${row('vib', 'Vibration', 'A different feel for buttons, bars, numbers and the character.', p.vib)}
<div class="gf-row"><div>Vibration strength</div><select class="set-select" data-gf="vs">${opt('low', 'Light', p.vs)}${opt('mid', 'Medium', p.vs)}${opt('high', 'Strong', p.vs)}</select></div>
${row('save', 'Save button', 'A small round button at the bottom left. Tap it to confirm that everything is saved.', p.save)}
<button class="btn-line" data-gf-act="hear">Hear the sounds</button><button class="btn-line" data-gf-act="feel">Feel the vibration</button><div class="hint" id="gf-status">${nightNow() && p.night ? 'It is night, so sounds are paused. Switch off "Quiet at night" to hear them now.' : ''}</div></div>`;
    }
    document.addEventListener('input', e => { const el = e.target && e.target.closest && e.target.closest('[data-gf]'); if (!el || el.type !== 'range') return; const v = +el.value, out = document.querySelector(`[data-gf-out="${el.dataset.gf}"]`); if (out) out.textContent = v; set({ [el.dataset.gf]: v }); });
    document.addEventListener('change', e => { const el = e.target && e.target.closest && e.target.closest('[data-gf]'); if (!el || el.type === 'range') return; set({ [el.dataset.gf]: el.type === 'checkbox' ? el.checked : el.value }); if (el.dataset.gf === 'vib' && el.checked || el.dataset.gf === 'vs') buzz('big'); if (el.dataset.gf === 'snd' && el.checked) play('glad'); });
    document.addEventListener('click', e => {
        const el = e.target && e.target.closest && e.target.closest('[data-gf-act]'); if (!el) return;
        if (el.dataset.gfAct === 'feel') { const st = document.getElementById('gf-status'), ok = navigator.vibrate ? buzz('big') : false; if (!navigator.vibrate) { if (st) st.textContent = 'This browser cannot vibrate the phone.'; } else if (!load().vib) { if (st) st.textContent = 'Vibration is switched off above.'; } else { if (st) st.textContent = 'A vibration was sent. If you felt nothing, check that Bedtime mode and Do Not Disturb are off, and that Android Settings, Sound and vibration, has Vibration intensity and Touch feedback turned on.'; try { navigator.vibrate([200, 100, 200]); } catch (e) {} } return; }
        const wasNight = load().night; if (wasNight && nightNow()) { set({ night: false }); setTimeout(() => set({ night: true }), 12000); }
        const seq = ['tick', 'up', 'down', 'stop', 'glad', 'fanfare', 'sad']; seq.forEach((n, i) => setTimeout(() => { play(n); }, i * 2400));
        buzz('big');
    });

    const api = { play, buzz, moment, settingsHTML, saveButton, prefs: { get: load, set }, names: () => Object.keys(SOUNDS), lengths: () => Object.fromEntries(Object.entries(SOUNDS).map(([k, v]) => [k, v[0]])),
        _onSave() { if (btn) btn.style.display = load().save === false ? 'none' : ''; if (pop && load().save === false) pop.classList.remove('show'); } };
    root.GFeel = api;
})(typeof window !== 'undefined' ? window : this);
