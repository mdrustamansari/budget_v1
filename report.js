/* Weekly and monthly expense report, plus the habits the app notices.
   Pure functions: they read a list of expenses and return plain numbers. They never change anything.
   Weeks run Monday to Sunday. While a period is running it is compared with the SAME DAYS of the last one;
   a closed period is compared in full with the one before it.
   Habits are found by triangulation: category, note words, price per person and rhythm must agree. */
(function (root) {
    'use strict';
    const DAY = 864e5;
    const sod = ts => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
    const addDays = (ts, n) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
    const daysBetween = (a, b) => Math.round((sod(b) - sod(a)) / DAY);
    const weekStart = ts => { const d = new Date(sod(ts)); return addDays(d.getTime(), -((d.getDay() + 6) % 7)); }; // Monday
    const real = list => (list || []).filter(e => e && e.kind !== 'import' && e.kind !== 'adjust' && e.amt > 0);
    const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const r2 = v => Math.round(v * 100) / 100;

    /* ----- period bounds. back = 0 is the running period, 1 the one before, and so on ----- */
    function bounds(kind, now, back) {
        back = back || 0;
        if (kind === 'month') {
            const d = new Date(now), s = new Date(d.getFullYear(), d.getMonth() - back, 1), e = new Date(d.getFullYear(), d.getMonth() - back + 1, 1);
            return { start: s.getTime(), end: e.getTime(), days: daysBetween(s.getTime(), e.getTime()) };
        }
        const s = addDays(weekStart(now), -7 * back);
        return { start: s, end: addDays(s, 7), days: 7 };
    }

    /* ----- reading a note such as "2N" (number of units, here persons) ----- */
    function parseNote(note) {
        const raw = String(note || '').trim();
        let units = 1, rest = raw, marker = false, m;
        if ((m = raw.match(/^(\d{1,2})\s*n\b\s*(.*)$/i))) { units = +m[1]; rest = m[2]; marker = true; }
        else if ((m = raw.match(/^n\s*(\d{1,2})\b\s*(.*)$/i))) { units = +m[1]; rest = m[2]; marker = true; }
        if (units < 1) units = 1;
        const text = rest.toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
        return { units, text, marker, raw };
    }
    function lev(a, b) {
        if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n);
        let p = []; for (let j = 0; j <= n; j++) p[j] = j;
        for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
        return p[n];
    }
    const sameText = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && lev(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 5)));

    /* ----- the report for one period ----- */
    function slice(list, from, to) { return list.filter(e => e.ts >= from && e.ts < to); }
    function sumBy(list) { const by = {}; let t = 0; list.forEach(e => { by[e.cat] = (by[e.cat] || 0) + e.amt; t += e.amt; }); return { by, total: t }; }

    function report(exps, now, kind, back) {
        kind = kind === 'month' ? 'month' : 'week'; back = back || 0;
        const list = real(exps), B = bounds(kind, now, back), P = bounds(kind, now, back + 1);
        const today = sod(now), running = back === 0 && today >= B.start && today < B.end;
        const elapsed = running ? daysBetween(B.start, today) + 1 : B.days;
        const curEnd = running ? addDays(B.start, elapsed) : B.end;
        const prevDays = Math.min(elapsed, P.days), prevEnd = addDays(P.start, prevDays);
        const cur = slice(list, B.start, curEnd), prev = slice(list, P.start, prevEnd);
        const C = sumBy(cur), Q = sumBy(prev);
        const names = {}; list.forEach(e => { names[e.cat] = { name: e.name, icon: e.icon }; });
        const ids = Object.keys(Object.assign({}, C.by, Q.by));
        const cats = ids.map(id => ({ id: +id, name: (names[id] || {}).name || 'Other', icon: (names[id] || {}).icon || '•', cur: r2(C.by[id] || 0), prev: r2(Q.by[id] || 0), diff: r2((C.by[id] || 0) - (Q.by[id] || 0)) }))
            .sort((a, b) => b.cur - a.cur || b.prev - a.prev);
        // one value per day of the period; days still to come stay null, and show last period's same weekday instead
        const day = new Array(B.days).fill(0), dayPrev = new Array(B.days).fill(0);
        cur.forEach(e => { day[daysBetween(B.start, e.ts)] += e.amt; });
        slice(list, P.start, P.end).forEach(e => { const i = daysBetween(P.start, e.ts); if (i < B.days) dayPrev[i] += e.amt; });
        for (let i = 0; i < B.days; i++) { day[i] = r2(day[i]); dayPrev[i] = r2(dayPrev[i]); if (running && i >= elapsed) day[i] = null; }
        const peak = day.reduce((b, v, i) => (v !== null && v > (day[b] || 0) ? i : b), 0);
        return {
            kind, back, running, start: B.start, end: B.end, prevStart: P.start, days: B.days, elapsed, prevDays,
            spent: r2(C.total), prevSpent: r2(Q.total), diff: r2(C.total - Q.total), count: cur.length, prevCount: prev.length,
            cats, day, dayPrev, peak: C.total > 0 ? peak : -1, firstDow: new Date(B.start).getDay()
        };
    }

    /* ----- habits ----- */
    function rhythm(days) { // days: sorted distinct day numbers
        const n = days.length; if (n < 3) return { label: 'irregular', ok: false };
        const gaps = []; for (let i = 1; i < n; i++) gaps.push(days[i] - days[i - 1]);
        const g = median(gaps), dev = median(gaps.map(x => Math.abs(x - g)));
        const dows = days.map(d => new Date(d * DAY + 12 * 36e5).getUTCDay()), cnt = [0, 0, 0, 0, 0, 0, 0]; dows.forEach(w => cnt[w]++);
        const wk = cnt[1] + cnt[2] + cnt[3] + cnt[4] + cnt[5], top = cnt.indexOf(Math.max.apply(null, cnt));
        if (wk / n >= 0.9 && cnt.slice(1, 6).filter(c => c > 0).length >= 4 && g <= 3) return { label: 'weekdays', ok: true, gap: g };
        if (g <= 1.5 && dev <= 0.5) return { label: 'daily', ok: true, gap: g };
        if (g >= 6 && g <= 8 && cnt[top] / n >= 0.6) return { label: 'weekly', ok: true, gap: g, dow: top };
        if (g >= 26 && g <= 35 && dev <= 3) return { label: 'monthly', ok: true, gap: g };
        if (g >= 2 && g <= 5 && dev <= Math.max(1, g * 0.5)) return { label: 'every ' + Math.round(g) + ' days', ok: true, gap: g };
        return { label: 'irregular', ok: false, gap: g };
    }

    // price per person: split where there is a clear jump, and keep slow drift together so a rise can be seen
    function splitByPrice(items) {
        const s = items.slice().sort((a, b) => a.per - b.per), out = []; let cur = [];
        s.forEach(it => { if (cur.length && (it.per > cur[cur.length - 1].per * 1.3 + 0.5 || it.per > cur[0].per * 2.2)) { out.push(cur); cur = []; } cur.push(it); });
        if (cur.length) out.push(cur); return out;
    }

    function habits(exps, now, kind, back, opts) {
        opts = opts || {}; const look = (opts.lookDays || 120) * DAY;
        const today = sod(now), list = real(exps).filter(e => e.ts >= today - look && e.ts < addDays(today, 1));
        const items = list.map(e => { const p = parseNote(e.note); return { ts: e.ts, day: Math.floor((sod(e.ts) + 12 * 36e5) / DAY), amt: e.amt, cat: e.cat, name: e.name, icon: e.icon, units: p.units, text: p.text, marker: p.marker, per: e.amt / p.units }; });
        // 1 same category, 2 same note words (spelling may differ a little), 3 similar price per person
        const byCat = {}; items.forEach(i => { (byCat[i.cat] = byCat[i.cat] || []).push(i); });
        const groups = [];
        Object.keys(byCat).forEach(cid => {
            const texts = []; // canonical texts
            byCat[cid].forEach(i => {
                const key = i.text || (i.marker ? '\u0000n' : '');
                let t = texts.find(x => (x.key === '' || key === '') ? x.key === key : sameText(x.key, key));
                if (!t) { t = { key, items: [] }; texts.push(t); } t.items.push(i);
            });
            texts.forEach(t => splitByPrice(t.items).forEach(cl => { if (cl.length >= 3) groups.push({ cat: +cid, key: t.key, items: cl }); }));
        });
        const B = bounds(kind || 'week', now, back || 0), P = bounds(kind || 'week', now, (back || 0) + 1);
        const rep = report(exps, now, kind || 'week', back || 0);
        const curEnd = addDays(B.start, rep.elapsed), prevEnd = addDays(P.start, rep.prevDays);
        const out = [];
        groups.forEach(g => {
            const it = g.items.slice().sort((a, b) => a.ts - b.ts), n = it.length;
            const days = [...new Set(it.map(i => i.day))].sort((a, b) => a - b), rh = rhythm(days);
            const last = it[n - 1].ts, lastGap = Math.max(rh.gap || 7, 3);
            if (today - last > Math.max(14 * DAY, lastGap * 3 * DAY)) return; // it faded away: do not show
            const mp = median(it.map(i => i.per));
            const textClue = g.key !== '' && it.filter(i => (i.text || (i.marker ? '\u0000n' : '')) !== '').length / n >= 0.7;
            const priceClue = it.filter(i => Math.abs(i.per - mp) <= mp * 0.2 + 0.5).length / n >= 0.7;
            const clues = 1 + (textClue ? 1 : 0) + (priceClue ? 1 : 0) + (rh.ok ? 1 : 0); // category always counts one
            if (clues < 2) return;
            const inCur = it.filter(i => i.ts >= B.start && i.ts < curEnd), inPrev = it.filter(i => i.ts >= P.start && i.ts < prevEnd);
            // price per person now = the latest three entries in this period; before = the same days of the last period,
            // or, when there are none, the three entries just ahead of them
            const nowSet = inCur.slice(-3), idxNow = it.length - nowSet.length, aheadSet = it.slice(Math.max(0, idxNow - 3), idxNow);
            const pc = nowSet.length ? median(nowSet.map(i => i.per)) : null;
            const pp = !nowSet.length ? null : inPrev.length ? median(inPrev.slice(-6).map(i => i.per)) : (aheadSet.length ? median(aheadSet.map(i => i.per)) : null);
            const dPrice = pc !== null && pp !== null ? r2(pc - pp) : 0;
            const priceMove = pc !== null && pp !== null && Math.abs(dPrice) >= Math.max(1, pp * 0.05) ? (dPrice > 0 ? 1 : -1) : 0;
            const dCount = inCur.length - inPrev.length;
            const countMove = (inCur.length + inPrev.length) >= 3 && Math.abs(dCount) >= 1 && Math.abs(dCount) / Math.max(inPrev.length, 1) >= 0.3 ? (dCount > 0 ? 1 : -1) : 0;
            const unitsAvg = r2(it.slice(-8).reduce((s, i) => s + i.units, 0) / Math.min(8, n));
            const recent = it.slice(-6).map(i => r2(i.per));
            const w0 = weekStart(today), weeks = []; for (let k = 5; k >= 0; k--) { const a = addDays(w0, -7 * k), b = addDays(a, 7); weeks.push(it.filter(i => i.ts >= a && i.ts < b).length); }
            const share = [1, 2, 3, 4, 5, 6, 0].map(w => { let tot = 0, hit = 0; for (let k = 0; k < 56; k++) { const dd = addDays(today, -k); if (new Date(dd).getDay() === w) { tot++; if (days.indexOf(Math.floor((dd + 12 * 36e5) / DAY)) >= 0) hit++; } } return tot ? r2(hit / tot) : 0; });
            const mark = Math.round(Math.log(Math.max(mp, 1)) / Math.log(1.3));
            out.push({
                key: g.cat + '|' + g.key.replace('\u0000n', '#') + '|' + mark, cat: g.cat, cname: it[n - 1].name, icon: it[n - 1].icon, text: g.key.replace('\u0000n', ''), marker: it.some(i => i.marker),
                n, clues, sure: clues >= 3, rhythm: rh.label, dow: rh.dow, perUnit: r2(mp), unitsAvg, pricePerUnitNow: pc, pricePrev: pp, dPrice, priceMove,
                countCur: inCur.length, countPrev: inPrev.length, dCount, countMove, recent, weeks, share,
                spendCur: r2(inCur.reduce((s, i) => s + i.amt, 0)), spend28: r2(it.filter(i => i.ts >= today - 28 * DAY).reduce((s, i) => s + i.amt, 0)), last
            });
        });
        return out.sort((a, b) => b.spend28 - a.spend28 || b.n - a.n).slice(0, opts.max || 6);
    }

    const R = { DAY, weekStart, bounds, parseNote, report, habits, rhythm, median, sameText };
    if (typeof module !== 'undefined' && module.exports) module.exports = R; else root.Report = R;
})(typeof window !== 'undefined' ? window : globalThis);
