/* Smart sections: the app learns which sections of each screen you actually open.
   Sections that carry data-sec="name" and have not been touched for 3 weeks fold under a quiet "More" button.
   It learns for 2 weeks first. The decision is made once when the app opens, so nothing jumps under your finger.
   Settings is never touched. Shared by every app. */
(function (root) {
    const DAY = 864e5; let app = 'app', enabled = () => true, st = null, snap = null, snapOn = null; const open = {}, lastTap = {};
    const load = () => { if (st) return st; try { st = JSON.parse(localStorage.getItem('gs_' + app)) || null; } catch (e) { st = null; } if (!st) st = { t0: Date.now(), u: {} }; return st; };
    const save = () => { try { localStorage.setItem('gs_' + app, JSON.stringify(st)); } catch (e) {} };
    function init(o) { app = o.app; enabled = o.enabled || enabled; load(); save(); }
    function decide() {
        const s = load(), now = Date.now(), on = enabled();
        if (snap && snapOn === on) return snap;
        snapOn = on; snap = {};
        if (!on) return snap;
        const total = Object.keys(s.u).reduce((n, k) => n + s.u[k].length, 0);
        if (now - s.t0 < 14 * DAY || total < 15) return snap;
        snap = { learned: true, now, s }; return snap;
    }
    function folded(key) {
        const d = decide(); if (!d.learned) return false;
        const hits = (d.s.u[key] || []).filter(t => d.now - t < 21 * DAY).length;
        return hits === 0;
    }
    function use(key) {
        const now = Date.now(); if (now - (lastTap[key] || 0) < 60000) return; lastTap[key] = now;
        const s = load(); (s.u[key] = s.u[key] || []).push(now); if (s.u[key].length > 30) s.u[key].shift(); save();
    }
    function apply(el) {
        if (!el || !el.children) return;
        const secs = Array.prototype.filter.call(el.children, c => c.dataset && c.dataset.sec); if (!secs.length) return;
        const fold = secs.filter(c => folded(c.dataset.sec)); if (!fold.length) return;
        const id = el.id || 'x', isOpen = !!open[id];
        const box = document.createElement('div'); box.className = 'sec-more' + (isOpen ? ' open' : '');
        box.innerHTML = `<button type="button" class="more-btn" data-sec-more="${id}" aria-expanded="${isOpen}"><i class="tri" aria-hidden="true"></i><span>${fold.length} more · used less</span></button><div class="more-wrap"><div class="more-in"></div></div>`;
        const inner = box.querySelector('.more-in'); fold.forEach(c => inner.appendChild(c)); el.appendChild(box);
    }
    document.addEventListener('click', ev => {
        const t = ev.target; if (!t || !t.closest) return;
        const b = t.closest('[data-sec-more]');
        if (b) { const box = b.closest('.sec-more'), id = b.dataset.secMore; open[id] = !open[id]; box.classList.toggle('open', open[id]); b.setAttribute('aria-expanded', open[id]); return; }
        const c = t.closest('[data-sec]'); if (c) use(c.dataset.sec);
    });
    root.GSections = { init, apply, reset() { st = null; snap = null; try { localStorage.removeItem('gs_' + app); } catch (e) {} load(); save(); } };
})(typeof window !== 'undefined' ? window : this);
