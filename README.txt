Rustam's Budget Manager (new generation)
Upload ALL of these files to the same GitHub repo (replace the old ones): index.html, style.css, flagship.css, the folder fonts/, engine.js, app.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png, icon-maskable-512.png.
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

v2.11 - Tap a graphic and the Companion explains it in one or two short sentences: the ring, the "Day x of y" line, the pace bar, today against your average, the three tiles, the category bars (Today and Month). In privacy mode it says no amounts.
      Sounds for real moments, never cheering a spend: a soft confirmation when you log a spend; a low double tone when the month's pool is broken or a big purchase is blocked; a small glad sound when you close a day under your average; a rising sound when money moves to savings; a fanfare when a month closes within budget; save, undo and "money kept" sounds. All under 3 seconds, with the same settings as before.
      All confirmations and warnings now come from the Companion, with an Undo button when it applies.
      Long cards in Settings fold with a small triangle (state remembered). Companion and Sounds settings are sectioned too.
      Shared Companion changes: a physical spring stop after "Avoid text" slides or a drag-and-snap, a soft lens flare in the aura, the Colour setting (Classic or Shifting spectrum), and sliders that move only when you drag the handle on purpose (switches ignore swipes). Cache v23.
      Credits: the lens-flare textures are resized and softened from three.js examples (MIT License, Copyright (c) three.js authors, https://github.com/mrdoob/three.js).

v2.12 - Same Companion effects as Goal Manager v5.15: fading glass, travelling outline light, "catch the light" flare (Soft or Photographic), movement styles and speed when it avoids text. Cache v24.

v2.13 - Flagship theme, dark themes, no more jumping. Same as Goal Manager v5.16.
      New: "Version 2.13" is shown just under the app title.
      Fixed: the amount sheets and keypad no longer jump. They are pinned to the top and only grow downwards; the page behind is frozen while a sheet is open.
      New: the Companion avoids text inside sheets and keypads too, but never moves while your hands are on the keypad.
      New: the Flagship theme (now the default): refined frosted glass, thin large numbers, light small text, soft rounded shapes, slow silky motion. Light and dark versions; Sapphire or Champagne Gold accent; optional Soft glow; letters: phone default, Inter, Manrope or Arial.
      New: five dark themes: Royal Gold, Midnight Forest, Deep Ocean, Ember Dusk, Graphite. Look is sorted into Light themes and Dark themes.
      Changed: themes are fixed and never follow the phone's dark setting. Optional "Follow my phone" switches between your last light and last dark theme.
      Changed: an untouched Aurora or Paper look moves to Flagship once.
      IMPORTANT: also copy flagship.css and the folder fonts/ into your repository.
      Credits: Inter and Manrope, SIL Open Font License 1.1. Cache v25.

v2.14 - Visible buttons, calmer colours, a cooler phone.
      Fixed: in Flagship (light and dark) and every dark theme, secondary buttons, keypad keys and chips now have their own fill and a clear edge, so they can always be seen. Accent buttons keep their colour and get a fine edge.
      Changed: the five dark themes are now muted and flat (soft grey-tinted colours, only a whisper of light in the corner, flatter shadows). Flagship Dark and Light have a quieter haze.
      Changed: the other light themes are paler and more muted, with only a slight gradient. Aurora's colour haze is half as strong; the nature themes have a lighter sky and a soft veil over the scenery.
      Cooler phone (nothing removed): the main heat came from the frosted-glass blur being redone for every card under the moving Companion many times a second. On smooth backgrounds (Flagship, dark themes, Aurora, Paper, nature themes without a wallpaper photo) the blur could not be seen anyway, so cards use a slightly more frosted tint instead. The nav bar, sheets and speech bubbles keep the live blur, and so does any look with a wallpaper photo. The Companion now draws its resting animation about 20 times a second (it was 30), remembers where the words on the page are instead of scanning every word several times a second, and checks for text every 0.6 second. The soft colour haze no longer has an extra blur layer. In my test the idle load fell from about 85% to about 35% of one core (laptop test, so expect smaller numbers on a phone).
      Cache v26.

v2.15 - Categories that adapt, today against yesterday, a torn-paper note.
      New: the five categories you use most stay on top, in order of use. The rest rest under a small arrow ("12 more"). Tap it to open or close them. They move up again when you use them.
      New: a card under the dashboard shows spent today so far / yesterday (for example 357/513) with two slim bars. Tap it to hear the numbers.
      New: a yellow torn-paper strip above the dashboard shows your last entry.
      New: Settings > Sounds has a separate "Glass tap sound" switch. The other sounds stay on.
      Changed: "Follow my phone" now always uses Flagship Light and Flagship Dark.
      New: Insights also tells you in which part of the day you spend most.
      Cache v27. Copy ALL files, including flagship.css, look.js, feel.js and the fonts/ folder.

v2.16 - Note and "yesterday" refinements.
      Changed: the torn note is now old white paper with a yellow tint, half as tall: "Last entry: Groceries · ₹357, today".
      Changed: no separate today/yesterday card. The "Today so far" bar now has a thin line for yesterday's spending, with its amount. Tap the bar and the Companion explains.
      Cache v28.

v2.17 - Weekday averages corrected.
      Fixed: "Which days cost most" no longer divides by a fixed eight weeks. Each weekday is divided by how many of that weekday really passed since your first entry (a day with no spending counts as zero). Voided entries, adjustments and imports are not counted.
      New: one very large entry (a big purchase, or about ₹1,000 and more than 10 times your usual entry) is flagged. The card shows the average with it and without it, and the entry's name, amount and date.
      New: the card says how many days were counted, and says plainly when a weekday has fewer than 3 days: too few to show a habit. Weekday insights in words appear only after 4 weeks.
      Your records are never changed; only the calculation and the explanation changed.
      Example from your backup: Monday = 5 Oct ₹7,361 + 12 Oct ₹110 = ₹7,471 over 2 Mondays = ₹3,735.50 (shown as 3.7k); without the ₹7,300 fragrance, ₹85.50.
      Cache v29.

v2.18 - Real frosted glass everywhere, a much cooler phone, a better ledger.
      Changed: every theme has the real live frosted glass again. Nothing is switched off. The Companion redraws only when something changes (see Goal v5.20 notes).
      New: the Ledger (Month tab) lists every day with its total and number of entries, then that day's entries with the time. Each entry has Edit (amount, bank or cash, note) and Delete. Both can be undone from the message that appears. Edits keep the original time. Show older adds 14 more days.
      Changed: the note under the header is a soft old-paper note: "Your last entry was ₹95 for Groceries, yesterday at 11:17 pm."
      Changed: the yesterday line on "Today so far" is clearer; the Welcome screen shows the app version.
      Cache v30.

v2.19 - A livelier Companion that rests and wakes gently, clearer buttons, a cooler phone.
      Changed: the Companion no longer jumps between still and moving. Its own clock slows to a stop and starts again softly, and it stirs for about 4 seconds every 12 to 25 seconds. It also checks how hard it is working for your phone (and your battery) and draws less often if needed.
      Removed: the photographic lens flare. Only the gentle bloom is left.
      Ledger: Edit and Delete are now small icons with a tooltip (pen and bin). Delete asks first, then still offers Undo.
      Buttons now have a thin outline on every light theme (Paper, nature, Aurora and the rest), so you can always see them.
      The note at the top is now a simple, flat banner.

v2.20 - One banner with tips, smart sections, clearer edit buttons.
      New: the top banner now shows "last entry" (info icon) and, now and then, a tip or proverb (bulb icon). The text slides up inside the banner. The separate tip block is gone.
      New: Smart sections on Today, Month, Mindful and Insights. After two weeks the app folds sections you have not opened for three weeks under "More". Switch it off in Settings.
      Fixed: the Save button text was invisible on light themes.
      New file: DESIGN-LANGUAGE.md, the design rules shared by all your apps.

Update (17 Oct 2026, later): The Lens flare style list is gone (only the gentle bloom remains, so there is nothing to choose). Tips in the top banner now use normal upright type. Every button now has a visible edge on all themes, including the Companion's question box and the More button. Checked on all 10 themes and every tab.

v2.22 - Shared style update: small buttons and chips have a hairline edge on every theme (same as Goal v5.24). Nothing else changed.

Release 2 (Goal v5.25 / Budget v2.23) - First-launch wizard, tour and small questions later.
      New: on a fresh install a short wizard asks five things: your name, the look, the Companion, privacy and comfort, and the backup time. If you already have data, you will not see it.
      New: an optional six-card tour after the wizard. In Settings, Experience: "Run setup again" and "Replay the tour". Running setup again changes none of your records.
      New: everything else is asked later, one small "Quick question" card at a time on Today (for example: a PIN, the evening reminder, the 24-hour wait, the cost of delay). Tap Later to be asked again in 3 days.
      The greeting uses the name you give.

Bundle A (Goal v5.26 / Budget v2.24) - Feel foundations: bigger touch areas, steady digits, one motion standard, focus rings, reduced motion on every theme, helpful empty states. Also HUMANE-TRACKER.md.

Bundle B (Goal v5.27 / Budget v2.25) - Smart defaults and memory: the app reopens on the screen and scroll position you left (within 6 hours; never on Settings), Follow my phone is on for new installs, and a slow phone is offered Lite mode as a small question (never switched on without asking).

Bundle C (Goal v5.28 / Budget v2.26) - Simple path: Settings now shows everyday items first, with sound, Companion, data and setup in a folded "Advanced" section. Swipe a ledger or history row left to delete (it still asks first) or right to edit; press and hold to edit. A confirmed delete gives a firm buzz.

Bundle D (Goal v5.29 / Budget v2.27) - Safety nets: a Recently deleted list (Settings, Advanced, Your data) keeps deleted entries for 30 days with a Restore button; tapping outside a sheet with unsaved typing no longer closes it.

Bundle E (Goal v5.30 / Budget v2.28) - Accessibility: pinch-to-zoom is allowed again, screen-reader and keyboard help for custom controls (a11y.js; Enter, Space and Escape work), clearer warning and good text on light themes (4.5:1), long names wrap instead of stretching the screen. The phone text-size setting already scales the app.

Bundle F (Goal v5.31 / Budget v2.29) - The Companion never speaks unasked twice within 10 minutes. A shared word list and the sheet button order rule are now in DESIGN-LANGUAGE.md.

Liquid glass (Goal v5.32 / Budget v2.30) - New Settings card "Glass style": Frosted (your glass, unchanged, the default) or Liquid (clear glass, light rim on the top-left, dark rim along the bottom, inner glow, soft tinted shadow). Liquid has sliders for Frost (starts at 7 px), Tint and Rim light, a Diagonal highlight switch (off) and a reset button. Sheets always keep a strong tint so forms stay clear. Lite mode removes the frost.

Liquid fixes (Goal v5.33 / Budget v2.31) - The bottom tab bar stays fixed again in Liquid and is the same size as in Frosted. The rim light is now outside the glass edge; new Shadow and Top shine sliders; buttons follow the same design with a frostier fill; an adaptive hairline runs round every glass object (stronger when the glass is clearer).

Bundle G (Budget v2.32) - The ledger shows the five most recent entries; Show older reveals 10 more each tap, and each day header still shows the whole day total.

Bundle G (Goal v5.34 / Budget v2.32) - Saved and Undo messages now use glass (Frosted or Liquid, to match your Glass style); swipe left or right anywhere (not on rows, sliders or sideways strips, and not from the screen edges) to change tab.

v2.33 fix: Liquid rim light — white part inside the hairline, dark part outside it.

v2.34 New: weekly and monthly report on the Insights tab. Weeks run Monday to Sunday. While a week or month is running it is compared with the same days of the last one; a closed one is compared in full. Donut of spending by category, paired bars, a day strip (calendar for months), and "Habits I noticed", found by comparing category, note words, price per person and rhythm. Notes like 2N are read as 2 persons. Tap a habit to name it. One triangle marker for every rise and fall.

v2.35 Fixed: tab swipe no longer jitters (transform-only slide). Danger text buttons have a hairline.

v2.35 Fixed: tab swipe jitter (the browser back-swipe was fighting with ours). Liquid: separate Light rim and Dark rim sliders (brightness and blur), crisper white inner rim. Screens refresh only when you look at them; no minute timer, and no timers while the app is hidden.

Version 2.36: one button language, the same as Goal v5.39 (full pill shape; pale glass and filled accent; crisp white top shine, soft dark bottom shadow). Look settings can be saved to a file and restored (Settings, My look settings). First frame matches your theme and phone mode. Fixed the blink after a tab swipe.

Version 2.37: less work on every tab switch (the look is only applied again when something about it changed), to stop the blink after a swipe.
