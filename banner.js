/* The Banner: one calm line at the top of Today. It shows what you last finished (info icon), and now and then
   a tip or proverb (bulb icon). The text slides up inside the banner. Shared by every app.
   GBanner.html({ last: {html, tell, act} | null, tips: bool, next: () => [text, kind] }) returns the markup for the current phase. */
(function (root) {
    const ICON = { last: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>' };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    let cfg = null, mode = 'last', tip = null, timer = 0;
    const text = m => m === 'tip' ? esc(tip ? tip[0] : '') : cfg.last.html;
    const icon = m => `<svg class="bn-ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[m]}</svg>`;
    const attrs = m => m === 'tip' ? 'data-bn="tip"' : `data-bn="last" data-tell="${esc(cfg.last.tell || '')}"${cfg.last.act ? ` data-act="${cfg.last.act}"` : ''}`;
    function markup(m) { return `<div class="torn-wrap" id="bn" ${attrs(m)}><div class="torn">${icon(m)}<div class="bn-view"><div class="bn-line${m === 'tip' ? ' bn-tip' : ''}">${text(m)}</div></div></div></div>`; }
    function html(c) {
        cfg = c;
        if (!c.last && !c.tips) return '';
        if (!c.last) mode = 'tip'; else if (!c.tips) mode = 'last';
        if (mode === 'tip' && !tip) tip = c.next();
        schedule(); return markup(mode);
    }
    function schedule(ms) {
        if (timer) return;
        const d = ms || (!cfg.last ? 35000 : mode === 'last' ? 28000 + Math.random() * 12000 : 7000);
        timer = setTimeout(step, d);
    }
    function busy() { const a = document.activeElement; return document.hidden || (document.getElementById('sheet-bg') && document.getElementById('sheet-bg').classList.contains('show')) || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); }
    function step() {
        timer = 0; if (!cfg) return;
        if (busy()) { schedule(4000); return; }
        if (!cfg.tips && !cfg.last) return;
        if (!cfg.last) { tip = cfg.next(); show('tip'); }
        else if (!cfg.tips) { schedule(60000); return; }
        else if (mode === 'last') { tip = cfg.next(); show('tip'); }
        else show('last');
        schedule();
    }
    function show(m) {
        mode = m; const el = document.getElementById('bn');
        if (!el || !el.offsetParent) return;           // not on screen: the next draw uses the new phase
        const view = el.querySelector('.bn-view'), old = view.querySelector('.bn-line'), svg = el.querySelector('.bn-ico');
        const set = () => { for (const a of ['data-tell', 'data-act', 'data-bn']) el.removeAttribute(a); (attrs(m).match(/[\w-]+="[^"]*"/g) || []).forEach(p => { const i = p.indexOf('='); el.setAttribute(p.slice(0, i), p.slice(i + 2, -1).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); }); };
        if (reduced() || !view.animate) { old.innerHTML = text(m); old.classList.toggle('bn-tip', m === 'tip'); svg.innerHTML = ICON[m]; set(); return; }
        const nl = document.createElement('div'); nl.className = 'bn-line' + (m === 'tip' ? ' bn-tip' : ''); nl.innerHTML = text(m);
        const h1 = view.offsetHeight; view.style.height = h1 + 'px';
        old.style.cssText = 'position:absolute;left:0;right:0;top:0'; nl.style.cssText = 'position:absolute;left:0;right:0;top:0;opacity:0'; view.appendChild(nl);
        const h2 = nl.offsetHeight, o = { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
        old.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-90%)', opacity: 0 }], o);
        const a2 = nl.animate([{ transform: 'translateY(90%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], o);
        view.animate([{ height: h1 + 'px' }, { height: h2 + 'px' }], o);
        svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => { svg.innerHTML = ICON[m]; svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' }).onfinish = () => { svg.getAnimations().forEach(x => x.cancel()); }; };
        set();
        a2.onfinish = () => { old.remove(); nl.getAnimations().forEach(x => x.cancel()); nl.style.cssText = ''; view.getAnimations().forEach(x => x.cancel()); view.style.height = ''; };
    }
    document.addEventListener('click', ev => {
        const w = ev.target.closest && ev.target.closest('.torn-wrap[data-bn="tip"]'); if (!w || !cfg) return;
        tip = cfg.next(); show('tip'); clearTimeout(timer); timer = 0; schedule(9000);
    });
    root.GBanner = { html };
})(typeof window !== 'undefined' ? window : this);
