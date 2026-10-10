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
