/* Rustam's Budget Manager: the money engine.
 * Pure rules, no screen code. Everything the app shows is calculated from one list of events:
 *   derive(events, now) -> a complete picture of the money.
 * Undo is just a "void" event, so history is never lost and the numbers can never drift.
 */
(function (root) {
    'use strict';

    const DAY = 86400000;
    const pad = n => String(n).padStart(2, '0');
    const ymKey = (y, m) => y * 12 + m;
    const keyOfTs = ts => { const d = new Date(ts); return ymKey(d.getFullYear(), d.getMonth()); };
    const dateKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const dim = (y, m) => new Date(y, m + 1, 0).getDate();
    const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (isFinite(Number(v)) && v !== null && v !== '' && v !== undefined ? Number(v) : d));

    /* ---------- Icons ---------- */
    const ICONS = [
        ['🥛', 'Milk'], ['🥚', 'Egg'], ['🍗', 'Chicken'], ['🥩', 'Meat'], ['🐟', 'Fish'],
        ['🥦', 'Vegetables'], ['🍎', 'Fruit'], ['🥜', 'Dry fruits'], ['🌾', 'Wheat'], ['🍚', 'Rice'],
        ['🍞', 'Bread'], ['🛒', 'Groceries'], ['🎁', 'Gifts'], ['🍽️', 'Meals'], ['☕', 'Tea & coffee'],
        ['🛺', 'Auto / travel'], ['🚌', 'Bus'], ['⛽', 'Fuel'], ['🏠', 'Home'], ['💡', 'Electricity'],
        ['💧', 'Water'], ['📱', 'Phone'], ['💊', 'Medicine'], ['📚', 'Books'], ['👕', 'Clothes'],
        ['💈', 'Grooming'], ['🌸', 'Fragrances'], ['👟', 'Shoes'], ['🧾', 'Misc']
    ];
    const ICON_RULES = [
        [/dry\s*fruit|nut/i, '🥜'], [/non[\s-]?veg|chicken|mutton|meat/i, '🍗'], [/fish/i, '🐟'], [/egg/i, '🥚'],
        [/milk|dairy/i, '🥛'], [/veg/i, '🥦'], [/fruit/i, '🍎'], [/wheat|atta|flour/i, '🌾'], [/rice/i, '🍚'],
        [/bread/i, '🍞'], [/grocer|kirana|ration/i, '🛒'], [/gift/i, '🎁'],
        [/canteen|food|meal|lunch|dinner|restaurant/i, '🍽️'], [/tea|coffee/i, '☕'],
        [/convey|transport|travel|bus|auto|commute|metro/i, '🛺'], [/fuel|petrol|diesel/i, '⛽'],
        [/rent|home|house/i, '🏠'], [/electric|power|bijli/i, '💡'], [/water/i, '💧'],
        [/phone|mobile|recharge|internet/i, '📱'], [/medic|health|pharma/i, '💊'],
        [/book|study|school|tuition/i, '📚'], [/shoe|sandal|footwear/i, '👟'], [/cloth|dress|shirt/i, '👕'],
        [/groom|barber|salon|haircut|shav/i, '💈'], [/fragran|perfume|attar|scent|deo/i, '🌸']
    ];
    function guessIcon(name) {
        const n = String(name || '');
        for (const [re, ic] of ICON_RULES) if (re.test(n)) return ic;
        return '🧾';
    }

    /* ---------- Categories ---------- */
    // Which spending counts as a big purchase, and each category's own monthly allowance
    function defaultPur(name) {
        const n = String(name || '');
        const P = (mode, thr, per, allow) => ({ mode, thr, per, allow });
        if (/rent|electric|power|bijli|milk|dairy|egg|veg|chicken|mutton|meat|fish|wheat|atta|flour|rice|grocer|kirana|ration|convey|transport|commute|bus|metro|auto/i.test(n) && !/dry\s*fruit/i.test(n)) return P('never', 0, 'month', 0);
        if (/canteen|meal|lunch|dinner|restaurant|food/i.test(n)) return P('above', 150, 'day', 0);
        if (/dry\s*fruit|nut/i.test(n)) return P('above', 1000, 'month', 0);
        if (/gift/i.test(n)) return P('above', 3000, 'month', 0);
        if (/fragran|perfume|attar|scent/i.test(n)) return P('always', 0, 'month', 500);
        if (/cloth|dress|shirt|shoe|footwear/i.test(n)) return P('always', 0, 'month', 1000);
        if (/groom|barber|salon/i.test(n)) return P('always', 0, 'month', 300);
        return P('always', 0, 'month', 500);
    }
    function normPur(p, name) {
        if (p && ['never', 'always', 'above'].indexOf(p.mode) >= 0) {
            const d = defaultPur(name);
            const allow = p.mode === 'never' ? 0 : (p.allow !== undefined && p.allow !== null && Number(p.allow) >= 0 ? Number(p.allow) : d.allow);
            return { mode: p.mode, thr: Number(p.thr) || 0, per: p.per === 'day' ? 'day' : 'month', allow };
        }
        return defaultPur(name);
    }
    // Lump items are paid once a month (rent, a month's wheat), so the forecast does not scale them up
    const defaultLump = name => /rent|electric|power|bijli|wheat|atta|rice|tuition|fee|emi|insurance/i.test(String(name || ''));
    function normCat(c) {
        return {
            id: c.id,
            name: String(c.name || 'Untitled'),
            icon: c.icon || guessIcon(c.name),
            limit: Number(c.limit) || 0,
            type: c.type === 'fixed' ? 'fixed' : 'variable',
            price: Number(c.price) || 0,
            lump: c.lump === undefined ? defaultLump(c.name) : !!c.lump,
            pur: normPur(c.pur, c.name),
            defAcct: c.defAcct === 'cash' ? 'cash' : 'bank'
        };
    }
    const DEFAULT_CATS = [
        { id: 1,  name: 'Milk',        limit: 500,  type: 'fixed', price: 31 },
        { id: 2,  name: 'Eggs',        limit: 500,  type: 'fixed', price: 8.5 },
        { id: 3,  name: 'Conveyance',  limit: 1500, type: 'variable' },
        { id: 4,  name: 'Non-Veg',     limit: 1500, type: 'variable' },
        { id: 5,  name: 'Vegetables',  limit: 1200, type: 'variable' },
        { id: 6,  name: 'Dry Fruits',  limit: 1000, type: 'variable' },
        { id: 7,  name: 'Wheat',       limit: 250,  type: 'fixed', price: 200 },
        { id: 8,  name: 'Rice',        limit: 200,  type: 'fixed', price: 160 },
        { id: 9,  name: 'Groceries',   limit: 2500, type: 'variable' },
        { id: 10, name: 'Gifts',       limit: 3000, type: 'variable' },
        { id: 11, name: 'Canteen',     limit: 600,  type: 'variable' },
        { id: 12, name: 'Misc',        limit: 250,  type: 'variable' },
        { id: 13, name: 'House Rent',  limit: 5500, type: 'fixed', price: 5500 },
        { id: 14, name: 'Electricity', limit: 700,  type: 'variable' },
        { id: 15, name: 'Grooming',    limit: 500,  type: 'variable' },
        { id: 16, name: 'Fragrances',  limit: 500,  type: 'variable' },
        { id: 17, name: 'Clothes',     limit: 1000, type: 'variable' }
    ];
    // Events that create the default categories on a brand new install
    function bootstrapEvents(ts) {
        return DEFAULT_CATS.map(c => ({ t: 'cat', op: 'add', ts, c: normCat(c) }));
    }

    /* ---------- The derivation ---------- */
    function derive(events, now) {
        now = now || Date.now();
        const evs = events.slice().sort((a, b) => (a.ts - b.ts) || ((a.id || 0) - (b.id || 0)));
        const voided = new Set();
        evs.forEach(e => { if (e.t === 'void') voided.add(e.target); });

        const cats = new Map();
        const months = new Map();
        const buckets = new Map();
        const priceHist = {};
        const purchases = [];
        const reviews = new Map();
        const wants = new Map();
        const dayCloses = new Set();
        const savLog = [];
        const saveByMonth = {};
        let bank = 0, cash = 0, hasBal = false, saved = 0;
        let pool = { init: false, key: 0, bal: 0, allow: 0, min: 500 };
        let nextCatId = 1;
        const catEvents = [];

        const M = (y, m) => {
            const k = ymKey(y, m);
            let r = months.get(k);
            if (!r) {
                r = { k, y, m, plan: null, exps: [], spent: 0, byCat: {}, byAcct: { bank: 0, cash: 0 }, close: null, limits: {}, names: {}, icons: {}, recon: [], checks: [] };
                months.set(k, r);
            }
            return r;
        };
        const snap = r => { cats.forEach((c, id) => { r.limits[id] = c.limit; r.names[id] = c.name; r.icons[id] = c.icon; }); };
        const settle = (b, ts) => { if (b.allow > 0) b.bal += Math.max(0, (ts - b.ts) / DAY) * b.allow / 30; b.ts = Math.max(b.ts, ts); };
        const rollPool = ts => { if (!pool.init) return; const k = keyOfTs(ts); while (pool.key < k) { pool.key++; pool.bal += pool.allow; } };

        for (const e of evs) {
            if (e.t === 'void' || voided.has(e.id)) continue;
            switch (e.t) {
                case 'cat': {
                    if (e.op === 'add') {
                        const c = normCat(e.c);
                        c.createdAt = e.ts;
                        cats.set(c.id, c);
                        nextCatId = Math.max(nextCatId, c.id + 1);
                        buckets.set(c.id, { bal: 0, ts: e.ts, allow: c.pur.allow });
                        priceHist[c.id] = c.type === 'fixed' && c.price ? [{ ts: e.ts, price: c.price }] : [];
                    } else if (e.op === 'edit' && cats.has(e.cid)) {
                        const old = cats.get(e.cid);
                        const b = buckets.get(e.cid) || { bal: 0, ts: e.ts, allow: 0 };
                        settle(b, e.ts);
                        const c = normCat(Object.assign({}, old, e.f || {}));
                        c.createdAt = old.createdAt;
                        cats.set(e.cid, c);
                        b.allow = c.pur.allow;
                        buckets.set(e.cid, b);
                        if (c.type === 'fixed' && c.price && (!priceHist[e.cid] || !priceHist[e.cid].length || priceHist[e.cid][priceHist[e.cid].length - 1].price !== c.price)) {
                            (priceHist[e.cid] = priceHist[e.cid] || []).push({ ts: e.ts, price: c.price });
                        }
                    } else if (e.op === 'del') {
                        cats.delete(e.cid);
                        buckets.delete(e.cid);
                    }
                    const rr = months.get(keyOfTs(e.ts));
                    if (rr) snap(rr);
                    break;
                }
                case 'plan': {
                    const r = M(e.y, e.m);
                    r.plan = e;
                    if (!e.hist) {
                        if (hasBal) r.recon.push({ ts: e.ts, bank: num(e.bank, 0) - bank, cash: num(e.cash, 0) - cash });
                        bank = num(e.bank, 0); cash = num(e.cash, 0); hasBal = true;
                        const prev = saveByMonth[r.k] || 0;
                        saved += num(e.save, 0) - prev;
                        saveByMonth[r.k] = num(e.save, 0);
                    }
                    if (!pool.init) pool = { init: true, key: r.k, bal: num(e.allow, 3000), allow: num(e.allow, 3000), min: num(e.minAmt, 500) };
                    else {
                        while (pool.key < r.k) { pool.key++; pool.bal += pool.allow; }
                        if (r.k === pool.key) { pool.bal += num(e.allow, pool.allow) - pool.allow; pool.allow = num(e.allow, pool.allow); }
                        pool.min = num(e.minAmt, pool.min);
                    }
                    snap(r);
                    break;
                }
                case 'check': {
                    const r = M(new Date(e.ts).getFullYear(), new Date(e.ts).getMonth());
                    const rec = { ts: e.ts, bank: e.bank === undefined || e.bank === null ? 0 : num(e.bank, 0) - bank, cash: e.cash === undefined || e.cash === null ? 0 : num(e.cash, 0) - cash };
                    r.checks.push(rec);
                    if (e.bank !== undefined && e.bank !== null) bank = num(e.bank, bank);
                    if (e.cash !== undefined && e.cash !== null) cash = num(e.cash, cash);
                    hasBal = true;
                    break;
                }
                case 'xfer':
                    if (e.dir === 'c2b') { cash -= e.amt; bank += e.amt; } else { bank -= e.amt; cash += e.amt; }
                    break;
                case 'sav':
                    saved += e.amt;
                    savLog.push(e);
                    break;
                case 'close': {
                    const r = M(e.y, e.m);
                    r.close = e;
                    saved += num(e.toSave, 0);
                    if (e.toPool) { rollPool(e.ts); if (pool.init) pool.bal += e.toPool; }
                    break;
                }
                case 'seed': {
                    rollPool(e.ts);
                    if (pool.init && e.poolBal !== undefined) pool.bal = num(e.poolBal, pool.bal);
                    if (e.cats) Object.keys(e.cats).forEach(id => {
                        const b = buckets.get(Number(id));
                        if (b) { b.bal = num(e.cats[id].bal, 0); b.ts = num(e.cats[id].ts, e.ts); }
                    });
                    break;
                }
                case 'exp': {
                    const d = new Date(e.ts);
                    const r = M(d.getFullYear(), d.getMonth());
                    const acct = e.acct === 'cash' ? 'cash' : 'bank';
                    r.exps.push(e);
                    r.spent += e.amt;
                    r.byCat[e.cat] = (r.byCat[e.cat] || 0) + e.amt;
                    r.byAcct[acct] += e.amt;
                    if (acct === 'cash') cash -= e.amt; else bank -= e.amt;
                    if (e.pur) {
                        rollPool(e.ts);
                        if (pool.init) pool.bal -= e.pur.c;
                        const b = buckets.get(e.cat);
                        if (b && b.allow > 0) { settle(b, e.ts); b.bal -= e.pur.c; }
                        purchases.push({ id: e.id, ts: e.ts, cat: e.cat, catName: e.name, icon: e.icon, total: e.amt, counted: e.pur.c, need: e.pur.need, reason: e.pur.reason, emg: !!e.pur.emg, review: null, k: r.k });
                    }
                    snap(r);
                    break;
                }
                case 'rev': reviews.set(e.pid, e.v); break;
                case 'want': {
                    if (e.op === 'add') wants.set(e.wid, { wid: e.wid, name: e.name, price: e.price, cat: e.cat, ts: e.ts, status: 'wait' });
                    else if (wants.has(e.wid)) { const w = wants.get(e.wid); w.status = e.op === 'drop' ? 'dropped' : 'bought'; w.doneAt = e.ts; }
                    break;
                }
                case 'dayclose': dayCloses.add(e.day); break;
                default: break;
            }
        }

        rollPool(now);
        buckets.forEach(b => settle(b, now));
        purchases.forEach(p => { p.review = reviews.get(p.id) || null; });

        /* ----- the current month ----- */
        const nd = new Date(now);
        const cy = nd.getFullYear(), cm = nd.getMonth(), cd = nd.getDate();
        const curK = ymKey(cy, cm);
        const cur = months.get(curK) || { k: curK, y: cy, m: cm, plan: null, exps: [], spent: 0, byCat: {}, byAcct: { bank: 0, cash: 0 }, close: null, limits: {}, names: {}, icons: {}, recon: [], checks: [] };
        const dm = dim(cy, cm);
        const P = cur.plan ? num(cur.plan.pool, 0) : 0;
        const todayKey = dateKey(now);
        const todayExps = cur.exps.filter(e => dateKey(e.ts) === todayKey);
        const spentToday = todayExps.reduce((s, e) => s + e.amt, 0);
        const before = cur.spent - spentToday;
        const remDays = dm - cd + 1;
        const allowance = P > 0 ? (P - before) / remDays : 0;
        const todayByCat = {};
        todayExps.forEach(e => { if (e.kind === 'add' || e.kind === undefined) todayByCat[e.cat] = (todayByCat[e.cat] || 0) + e.amt; });
        const today = {
            key: todayKey, spent: spentToday, allowance, left: allowance - spentToday, byCat: todayByCat,
            daysAfter: dm - cd, future: cd < dm && P > 0 ? (P - cur.spent) / (dm - cd) : null, dm, day: cd
        };

        // usage-sorted categories (last 45 days of one-tap / typed entries)
        const cutoff = now - 45 * DAY;
        const usage = {};
        months.forEach(r => r.exps.forEach(e => { if (e.kind !== 'adjust' && e.ts >= cutoff) usage[e.cat] = (usage[e.cat] || 0) + 1; }));
        const lastAcct = {};
        evs.forEach(e => { if (e.t === 'exp' && !voided.has(e.id) && e.kind !== 'adjust') lastAcct[e.cat] = e.acct; });
        const catList = [];
        cats.forEach(c => {
            const b = buckets.get(c.id) || { bal: 0, allow: 0 };
            const rate = b.allow / 30;
            const cool = b.allow > 0 && b.bal < 0 ? Math.ceil(-b.bal / rate - 1e-9) : 0;
            catList.push(Object.assign({}, c, {
                spent: cur.byCat[c.id] || 0,
                uses: usage[c.id] || 0,
                lastAcct: lastAcct[c.id] || c.defAcct,
                bucket: { bal: b.bal, allow: b.allow, cool, until: cool > 0 ? now + cool * DAY : 0 }
            }));
        });
        catList.sort((a, b) => b.uses - a.uses || a.id - b.id);

        /* ----- the day strip: was each past day inside its own allowance? ----- */
        const dayStatus = [];
        if (P > 0) {
            let running = 0;
            const byDay = {};
            cur.exps.forEach(e => { const dd = new Date(e.ts).getDate(); byDay[dd] = (byDay[dd] || 0) + e.amt; });
            for (let d = 1; d <= cd; d++) {
                const a = (P - running) / (dm - d + 1);
                const s = byDay[d] || 0;
                let st = 'ok';
                if (a <= 0 || s > a * 1.25) st = 'bad'; else if (s > a) st = 'warn';
                if (!s && d < cd) st = 'none';
                dayStatus.push({ d, spent: s, allowance: a, st, today: d === cd });
                running += s;
            }
        }

        /* ----- forecast: a range for where the month will land ----- */
        let forecast = { ready: false };
        const elapsed = (cd - 1) + (nd.getHours() * 60 + nd.getMinutes()) / 1440;
        if (P > 0 && elapsed >= 2) {
            let varSpent = 0;
            cur.exps.forEach(e => { const c = cats.get(e.cat); if (!(c && c.lump)) varSpent += e.amt; });
            const prev = months.get(curK - 1);
            let lumpDue = 0;
            cats.forEach(c => { if (c.lump && prev) lumpDue += Math.max(0, (prev.byCat[c.id] || 0) - (cur.byCat[c.id] || 0)); });
            const rate = varSpent / elapsed;
            const remD = dm - elapsed;
            const base = cur.spent + lumpDue;
            forecast = { ready: true, free: P - (base + rate * remD), freeLo: P - (base + rate * 1.2 * remD), freeHi: P - (base + rate * 0.85 * remD), lumpDue };
        }

        /* ----- streak of closed days ----- */
        let streak = 0;
        { let t = startOfDay(now); if (!dayCloses.has(dateKey(t))) t -= DAY; while (dayCloses.has(dateKey(t))) { streak++; t -= DAY; } }

        /* ----- last month's leftover waiting for a decision ----- */
        const prevM = months.get(curK - 1);
        let pendingClose = null;
        if (prevM && prevM.plan && !prevM.close) {
            const left = num(prevM.plan.pool, 0) - prevM.spent;
            if (left > 0) pendingClose = { y: prevM.y, m: prevM.m, left, pool: num(prevM.plan.pool, 0), spent: prevM.spent };
        }

        const poolUsed = purchases.filter(p => p.k === curK).reduce((s, p) => s + p.counted, 0);
        const monthsArr = Array.from(months.values()).sort((a, b) => a.k - b.k);

        return {
            now, events: evs, voided, cats: catList, catsById: Object.fromEntries(catList.map(c => [c.id, c])), nextCatId,
            cur, months: monthsArr, plan: cur.plan, needPlan: !cur.plan, P,
            today, dayStatus, forecast, streak,
            accounts: { bank, cash, hasBal },
            savings: saved, savLog,
            pool: { init: pool.init, bal: pool.bal, allow: pool.allow, min: pool.min, used: poolUsed, carried: Math.max(0, pool.bal + poolUsed - pool.allow) },
            purchases: purchases.sort((a, b) => b.ts - a.ts),
            wants: Array.from(wants.values()).sort((a, b) => b.ts - a.ts),
            dayCloses, pendingClose, priceHist
        };
    }

    /* ---------- Questions the screens ask before an expense is saved ---------- */
    // How much of this expense counts as a "big purchase" (0 = none)
    function counted(D, cat, amt) {
        const p = cat.pur || { mode: 'never' };
        let c = 0;
        if (p.mode === 'always') c = amt;
        else if (p.mode === 'above') {
            const prev = p.per === 'day' ? (D.today.byCat[cat.id] || 0) : cat.spent;
            c = Math.max(0, prev + amt - Math.max(prev, p.thr || 0));
        }
        return c >= D.pool.min ? c : 0;
    }
    function poolOpensFor(D, price) {
        const al = D.pool.allow || 1;
        const m = Math.max(1, Math.ceil((price - D.pool.bal) / al - 1e-9));
        const d = new Date(D.now);
        return { m, ts: new Date(d.getFullYear(), d.getMonth() + m, 1).getTime(), bal: D.pool.bal + m * D.pool.allow };
    }
    function assess(D, cat, price) {
        const b = cat.bucket;
        const has = b.allow > 0;
        const rate = b.allow / 30;
        const lastP = D.purchases.find(p => p.cat === cat.id) || null;
        const poolShort = D.pool.init && price > D.pool.bal + 1e-9;
        const cdAfter = has && b.bal - price < 0 ? Math.ceil(-(b.bal - price) / rate - 1e-9) : 0;
        return {
            poolBal: D.pool.bal, poolShort, has, bal: b.bal, cdNow: b.cool, cdAfter, last: lastP,
            blocked: poolShort || b.cool > 0,
            opens: poolShort ? poolOpensFor(D, price) : null
        };
    }
    // What would this expense do to the month? level: ok | tight | risk | broken
    function preview(D, catId, amt) {
        const cat = D.catsById[catId];
        const T = D.today, P = D.P;
        const leftAfter = P - (D.cur.spent + amt);
        const base = P > 0 ? P / T.dm : 0;
        const futureBefore = T.future;
        const futureAfter = T.daysAfter > 0 && P > 0 ? leftAfter / T.daysAfter : null;
        // Monthly thinking only: compare how much of the pool is used with how much of the month has passed
        const elapsedFrac = (T.day - 1) / T.dm;
        const usedAfter = P > 0 ? (D.cur.spent + amt) / P : 0;
        let level = 'ok';
        if (P > 0) {
            if (leftAfter < 0) level = 'broken';
            else if (usedAfter > elapsedFrac + 0.2) level = 'risk';
            else if (usedAfter > elapsedFrac + 0.08) level = 'tight';
        }
        const overLimit = cat ? Math.max(0, cat.spent + amt - cat.limit) : 0;
        return {
            level, leftAfter, usedAfter, elapsedFrac, futureBefore, futureAfter, todayLeftAfter: T.left - amt, overLimit,
            drop: futureBefore > 0 && futureAfter !== null ? 1 - futureAfter / futureBefore : 0,
            counted: cat ? counted(D, cat, amt) : 0
        };
    }

    /* ---------- Carrying over data from the first generation of the app ---------- */
    function migrateV1(old, now) {
        now = now || Date.now();
        const out = [];
        const state = old.state || null;
        const history = Array.isArray(old.history) ? old.history : [];
        const purch = old.purch && typeof old.purch === 'object' ? old.purch : null;
        if (!state || !Array.isArray(state.categories)) return out;
        const cfg = (purch && purch.cfg) || {};
        const allow = Number(cfg.allowance) > 0 ? Number(cfg.allowance) : 3000;
        const minAmt = Number(cfg.minAmt) > 0 ? Number(cfg.minAmt) : 500;
        const firstTs = history.length ? new Date(history[0].year, history[0].month, 1).getTime() : new Date(state.year, state.month, 1).getTime();
        const base = firstTs - 1000;
        state.categories.forEach(c => out.push({ t: 'cat', op: 'add', ts: base, c: normCat(Object.assign({}, c, { id: c.id })) }));
        const iconOf = {}, nameOf = {};
        state.categories.forEach(c => { iconOf[c.id] = c.icon; nameOf[c.id] = c.name; });
        const purOf = {};
        if (purch && Array.isArray(purch.list)) purch.list.forEach(p => { if (p.tx !== undefined) purOf[p.tx] = p; });
        const addMonth = (y, m, pool, bank, cats, tx, isCurrent) => {
            const start = new Date(y, m, 1, 0, 1).getTime();
            if (!isCurrent) out.push({ t: 'plan', ts: start, y, m, pool, bank: bank || 0, cash: 0, save: 0, allow, minAmt, hist: true });
            const useTx = Array.isArray(tx) && tx.length;
            if (useTx) {
                tx.forEach(x => {
                    const cid = x.cat;
                    const e = { t: 'exp', ts: x.ts, cat: cid, name: x.name || nameOf[cid] || 'Imported', icon: iconOf[cid] || guessIcon(x.name), amt: Number(x.amt) || 0, acct: 'bank', note: '', kind: x.kind === 'adjust' ? 'adjust' : 'add' };
                    const p = purOf[x.id];
                    if (p) e.pur = { c: Number(p.amt) || 0, need: p.need === 'want' ? 'want' : 'need', reason: String(p.reason || ''), emg: !!p.emergency };
                    out.push(e);
                });
            } else {
                (cats || []).forEach(c => {
                    if (Number(c.spent) > 0) out.push({ t: 'exp', ts: new Date(y, m, 15, 12).getTime(), cat: c.id, name: c.name, icon: c.icon || guessIcon(c.name), amt: Number(c.spent), acct: 'bank', note: 'imported total', kind: 'import' });
                });
            }
        };
        history.forEach(h => addMonth(h.year, h.month, Number(h.pool || h.budget) || 0, Number(h.bank) || 0, h.categories || h.data, h.tx, false));
        addMonth(state.year, state.month, Number(state.pool) || 0, Number(state.bank) || 0, state.categories, state.tx, true);
        if (purch) {
            const seed = { t: 'seed', ts: now };
            if (purch.poolBal !== undefined && isFinite(Number(purch.poolBal))) seed.poolBal = Number(purch.poolBal);
            if (purch.cats && typeof purch.cats === 'object') seed.cats = purch.cats;
            if (seed.poolBal !== undefined || seed.cats) out.push(seed);
        }
        return out;
    }

    const E = {
        DAY, ymKey, keyOfTs, dateKey, dim, startOfDay, ICONS, guessIcon, defaultPur, normPur, normCat, defaultLump,
        DEFAULT_CATS, bootstrapEvents, derive, counted, assess, poolOpensFor, preview, migrateV1
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = E;
    else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
