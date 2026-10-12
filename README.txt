Rustam's Budget Manager (new generation)
Upload ALL of these files to the same GitHub repo (replace the old ones): index.html, style.css, engine.js, app.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png, icon-maskable-512.png.
Then open the app twice (the first load fetches the update, the second shows it). Your old data is imported automatically.

What is new in version 2.2
- Usual amounts: when you add an expense, the app shows the amounts you really pay for that category (for example Rs 30, Rs 20, Rs 10 for conveyance) as one-tap buttons. It needs the same amount at least twice, and newer payments count more.
- Insights now start with "What the app has learned": which weekdays cost most, categories that keep going over their limit, spending in the last ten days of the month, and many small payments. It needs about three weeks of entries.
- Settings has a Your data card. Everything stays on this phone, and you can switch learning off.

Version 2.2.1: the number pad now has a decimal point, so you can enter 8.5.

Version 2.3
- Today now shows a small "Today so far" gauge: what you have spent today against the average of your earlier days this month. Green below the average, amber above, red well above. It appears after day 3.
- The Circle Companion lives in the header corner. It breathes, blinks and looks around, shows pen and notebook while you add an expense, a magnifying glass on Insights, and cheers when you close the day. It speaks rarely.
- Settings > Your data > Companion: choose Header corner, Floating (bottom right) or Off.
- IMPORTANT: also copy the new file companion.js into your repository.

Version 2.4 (new Circle Companion)
- The Companion is redesigned from Rustam's own glass prototype and merged with the expressive one: clear glass body, light-catching rim, two slow orbit rings, a soft aura.
- Adaptive ink: the outline, face and hands turn dark on light themes and white on dark themes.
- Floating mode can be dragged anywhere. It settles against the nearest side and remembers its place.
- Its eyes follow your finger when you are near it. A tap makes it squash and bounce a little.
- New poses: waving, typing on a laptop, a coffee break.
- Replace companion.js (and sw.js) and open the app twice.

Version 2.5 (the living Circle Companion)
- IMPORTANT: upload ALL files, including three new ones: companion-art.js, companion-lines.js and the new companion.js. Then open the app twice.
- The Companion is now a cute fluid spectre. It rests as a circle (or a ghost with a wavy tail) and often molds into 33 shapes: cube, notepad, calculator, laptop, sign board, question mark, tick, danger mark, wait mark, cross mark, notice mark, heart, star, coin, wallet, savings jar, bar chart, calendar, clock, idea bulb, bell, lock, shield, magnifier, book, gift, trophy, flag, rocket, cloud, moon, umbrella and speech bubble.
- It uses real-looking props: notebook, pen, calculator, laptop, chart and pointer stick, coffee cup, pillow, chair, bed, platform, ball, music notes, confetti.
- About 90 actions and combinations: wave, bow, nod, laugh, jump, hop, spin, dance, peek, knock, peekaboo, think, idea, work, nap, coffee break, play, celebrate, rocket launch and more.
- Poke it for fun reactions. Poke it many times and it gets dizzy, then hides.
- It does things on its own now and then, like a living thing. Night time makes it sleepier.
- It speaks proverbs, tips and your own budget notes, about 19 lines a day (you choose).
- It reacts to real moments: a tick after saving an expense, a calculator while you type an amount, a wait mark when a purchase is blocked, a danger mark when you pass the pool, a trophy when you close the day.
- Settings > Circle Companion has its own section: where it lives (fixed in the header, floating and snapping to the side, floating free, or hidden), resting form, Movement, Activity, lines a day, proverbs on or off, and buttons to show you things. It is always on top of every screen.
- Reduced motion and Lite mode keep it still.

v2.7 - (v2.6 glass edge light was dropped; this builds on v2.5)
  Circle Companion settings: new "Character" choice. Spectre (molds into many shapes) or Glass orb
  (always a perfect sphere; still speaks, gestures and uses props).
  The shadow under it is now soft and blurred, like diffused light.
  New "Cosmic aura" switch: glow, two orbit rings, a lens flare on the highlight, star sparkles and tiny twinkling stars.
  Service-worker cache v18.

v2.7.1 - The Companion settings drop-downs now use the full card width. Cache v19.

v2.8 - Sounds and vibration (with settings), a round save button at the bottom left (tap to confirm "Saved on this phone", with Back up now), and the Companion's "Avoid text" setting plus tap-to-speak support. Cache v20.

v2.9 - All Goal Manager looks are now in the Budget Manager: Paper (page colour, dots/graph/ruled, margins, texture), Aurora and 11 nature themes (Settings, Look), plus the new Sunflower accent. Aurora stays the default, so nothing changes until you choose. Also carries the v5.9/v5.10 fixes: sound and vibration react when your finger lifts, "Quiet at night" off by default, original gentle vibration pulses, and the Companion no longer jumps mid-slide. Cache v21.

v2.10 - The Look card is tidier: the theme tiles are smaller, four to a row. Cache v22.
