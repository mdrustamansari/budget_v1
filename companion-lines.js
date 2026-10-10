/* Circle Companion: what it says. Simple, concrete, ESL-friendly British English.
   Tags: proverb, tip, chat, poke, hello, back, night, spend, over, light, save, done.
   GCLines.pick(tag) gives a line and avoids the ones it said recently. */
(function (root) {
    'use strict';
    const L = {
        proverb: [
            'A penny saved is a penny earned.',
            'Drop by drop, the ocean fills.',
            'Look after the small coins, and the big notes look after themselves.',
            'Slow and steady wins the race.',
            'A stitch in time saves nine.',
            'Do not put all your eggs in one basket.',
            'Waste not, want not.',
            'Rome was not built in a day.',
            'The best time to plant a tree was twenty years ago. The next best time is now.',
            'A journey of a thousand miles begins with one step.',
            'Stretch your feet only as far as your blanket reaches.',
            'Every little helps.',
            'Well begun is half done.',
            'Prevention is better than cure.',
            'Beware of small expenses. A small leak can sink a great ship.',
            'Patience is bitter, but its fruit is sweet.',
            'Measure twice, cut once.',
            'Haba na haba hujaza kibaba. A Swahili saying: little by little fills the measure.',
            'Pole pole ndio mwendo. A Swahili saying: slowly, slowly is the way.',
            'Haraka haraka haina baraka. A Swahili saying: hurry has no blessing.',
            'He who buys what he does not need steals from himself.',
            'Rest when you are tired. Start again tomorrow.'
        ],
        tip: [
            'Write the amount right after you spend. Memory is a poor accountant.',
            'Before a big purchase, wait one day. Most wishes get quieter.',
            'Look at your pool on the same day each week. It takes one minute.',
            'Round your estimates up. Surprises are usually small bills.',
            'Save first, then spend what is left. It is easier than the other way round.',
            'Small payments add up. Look at the small ones too.',
            'A light day is a gift to the rest of the month.',
            'If you go over, do not hide it. Look at it, then make a small plan.',
            'Cash is easy to forget. Count it once a week.',
            'Make a backup now and then. A safe copy gives peace of mind.',
            'Notice what you buy when you are tired or hungry.',
            'Pay for the things you use every day first. Things you use once a year can wait.',
            'Keep your usual amounts as quick buttons. Fewer taps, fewer mistakes.'
        ],
        chat: [
            'Still here with you.', 'Just stretching a little.', 'A quiet moment. I like those.', 'Counting clouds. Not coins.', 'Hmm. A good day for small numbers.',
            'I am only practising my shapes.', 'Nothing needs you right now.', 'Shall we look at the pool later?', 'Take a breath. I will wait.', 'I like it when the numbers are calm.',
            'Do not mind me. I am just floating.', 'Who is a good spectre? Me, I think.', 'I wonder what is for lunch.', 'Tea would be nice.'
        ],
        poke: ['Hee hee!', 'Ha! That tickles.', 'Hey! Boing!', 'Oh! You found me.', 'Again, again!', 'Eek!', 'Boop received.', 'I felt that. Mostly.', 'Knock knock. Oh, it is you.', 'Wheee!'],
        hello: ['Hello! Good to see you.', 'Hello again.', 'Hi there. Ready when you are.', 'Welcome. I kept your place warm.'],
        back: ['Welcome back.', 'There you are. I was napping.', 'Oh, hello. I was dreaming about coins.'],
        night: ['It is late. Rest is also a plan.', 'The numbers will keep until morning.', 'A tired mind counts badly. Sleep well.'],
        spend: ['Noted. Thank you for writing it down.', 'Saved. One more honest entry.', 'Done. Small steps, steady record.'],
        over: ['You are past this month\'s pool. No blame. Let us find a calm way forward.', 'It happens. Look at it, then make a small plan.'],
        light: ['A light day so far. Nicely done.', 'Gentle spending today. Good.'],
        save: ['Saving first. That is the wise order.', 'Good. Future you says thank you.'],
        done: ['Day closed. Well done.', 'That is a tidy day.']
    };
    const recent = [];
    function pick(tag) {
        const a = L[tag]; if (!a || !a.length) return '';
        let line = '', tries = 0; do { line = a[Math.floor(Math.random() * a.length)]; tries++; } while (recent.indexOf(line) >= 0 && tries < 12);
        recent.push(line); if (recent.length > 18) recent.shift(); return line;
    }
    root.GCLines = { pick, all: tag => (L[tag] || []).slice(), tags: Object.keys(L), add: (tag, line) => { (L[tag] = L[tag] || []).push(line); } };
})(typeof window !== 'undefined' ? window : this);
