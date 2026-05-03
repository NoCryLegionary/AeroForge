# AeroForge — Deep-Seated Reverse-Engineering Audit

> **Target:** [index.html](file:///Users/svoboden/Downloads/lejyoner/index.html) — ~2265 lines, single-file Vanilla JS HTML5 game  
> **Game:** Aircraft Manufacturing Tycoon Simulation ("Uçak İmalat Simülasyonu")

---

## 1. System Architecture (How It Works Under the Hood)

### 1.1 State Management

The entire game state lives in a single mutable global object `gameState` (line 1213). All subsystems read from and write to it directly — there is **no state abstraction, no event bus, no pub/sub, no immutability**. Any function anywhere can mutate any field at any time.

**State shape:**

```
gameState
├── companyName: string
├── budget: number
├── prestige: number
├── production: number
├── researchPoints: number
├── unlockedTechs: string[]
├── currentDesign: { wings, fuselage, engines, tail, cockpit }
├── aircraftStats: { speed, range, capacity, safety }
├── productionLines: [{ id, name, status, progress, aircraft }]
├── completedAircrafts: []
└── achievements: string[]
```

Additionally, **master data** is stored in parallel globals that are also freely mutated at runtime:
- `researchData` — array of tech tree nodes (line 1242)
- `componentData` — object of component arrays by slot (line 1359)
- `testData` — array of test definitions (line 1388)
- `marketData` — array of market orders (**mutated via `splice`** on line 2062)

> [!CAUTION]
> Mutating master data (`researchData`, `marketData`) at runtime with no copy/reset mechanism means **the game is non-resettable**. Once market orders are accepted and spliced, they're gone forever; once technologies are researched, the `researched: true` flag persists until a full page reload.

### 1.2 Game Loop

**There is no canonical game loop** (no `requestAnimationFrame` tick). Instead, the game runs on a constellation of **independent `setInterval` / `setTimeout` timers**, each with their own cadence:

| Timer | Location | Cadence | Purpose |
|---|---|---|---|
| Research progress | `startResearch()` L1499 | `tech.time / 50` ms | Increments progress bar 2% per tick |
| Production progress | `produceAircraft()` L1785 | 500 ms | Increments production line progress |
| Flight simulation | `startFlightTest()` L1953 | 200 ms | Simulates altitude/speed/fuel/integrity |
| Flight auto-stop | L1993 | 15 000 ms (one-shot) | Force-closes flight test |
| Passive income + events | L2176 | 10 000 ms | Adds passive income, triggers random events |
| Achievement check | L2202 | 5 000 ms | Polls `gameState` for achievement thresholds |

This is **not a game loop** — it's a timer zoo. There is no central clock, no delta-time, no pause capability, and no way to synchronize these timers.

### 1.3 Rendering Logic

Rendering is **full-teardown DOM reconstruction**. Every `init*` function (`initResearch`, `initDesign`, `initProduction`, `initTesting`, `initMarket`) sets `container.innerHTML = ''` and then rebuilds the entire section from scratch using `createElement` + template literals.

There is no Virtual DOM, no diffing, no data-binding. The SVG aircraft preview (lines 1042–1071) is static HTML; only CSS class toggling (`selected`) provides interactivity.

State-to-UI flow: **manual imperative DOM updates** via `getElementById` + `.textContent` assignment (e.g., `updateStats()` on line 2090).

---

## 2. Critical Bugs & Logic Errors

### BUG-01: Flight Test Timer Never Cleared — Guaranteed Interval Leak

```javascript
// L1953
const flightInterval = setInterval(() => { ... }, 200);

// L1993 — auto-stop only clears the interval after 15s
setTimeout(() => {
    clearInterval(flightInterval);
}, 15000);
```

**Problem:** If `closeFlightTest()` is called manually (via the button or Escape key), `flightInterval` **is never cleared**. The interval continues ticking forever, mutating DOM elements that may or may not exist, and burning CPU. Every subsequent flight test stacks another leaked interval.

**Severity: CRITICAL.** This is an unbounded memory/CPU leak.

---

### BUG-02: Race Condition Between Flight Auto-Stop and Fuel/Integrity Exit

The flight loop has two exit paths:
1. **Internal:** `fuel <= 0 || integrity <= 0` → clears interval, shows result after 1s delay (L1976–1989)
2. **External:** `setTimeout` at 15s → clears interval (L1993–1995)

If fuel hits 0 at ~14.8s, the internal path clears the interval and schedules a `setTimeout` to show results. At 15s, the external `setTimeout` fires `clearInterval` on an **already-cleared** interval (harmless but sloppy). However, the external path **doesn't show any results or award prestige** — the test silently dies if it survives 15 seconds without fuel depletion or structural failure.

**Verdict:** A player who builds a fuel-efficient aircraft **gets no reward** for the flight test. The 15s timeout is a dead-end code path with no outcome.

---

### BUG-03: `selectComponent` Removes Selection for All Items of the Same Category

```javascript
// L1587
document.querySelectorAll('.component-item').forEach(item => {
    item.classList.remove('selected');
    if (item.dataset.id === component.id) {
        item.classList.add('selected');
    }
});
```

This iterates **all** component items globally and only highlights the clicked one. But the `selected` removal is universal — so if two categories had selected items, clicking one category would deselect the other category's visual highlight (the `gameState.currentDesign` still holds the object reference, but the UI is out of sync).

**Verdict:** Visual desync between state and UI.

---

### BUG-04: `calculateAircraftStats` — Range Is Overwritten, Not Accumulated

```javascript
// L1625
range = (design.engines.stats.fuel || 0) * 50;
```

`range` starts at 500 (line 1608) but if an engine is selected, it's **replaced** entirely with `fuel * 50`. An engine with `fuel: 20` yields `range = 1000`. The base 500 is thrown away. This is inconsistent with how `speed` and `safety` are additively accumulated.

---

### BUG-05: `saveDesign` Uses Shallow Spread — Shared Object References

```javascript
// L1681
const newAircraft = {
    name: aircraftName,
    design: {...design},      // shallow copy
    stats: {...gameState.aircraftStats},
    cost: totalCost,
    id: Date.now()
};
```

`{...design}` only shallow-copies the top-level keys. Each value (e.g., `design.wings`) is still a **reference** to the object in `componentData`. If `componentData` were ever mutated, all saved aircraft designs would be corrupted. More critically, subsequent calls to `selectComponent` **replace** `gameState.currentDesign[category]`, but the old saved aircraft still points to the old component object — this happens to work by accident because the component objects are never mutated, but it's fragile.

---

### BUG-06: `produceAircraft` DOM Updates Use Index-Based Selectors — Fragile

```javascript
// L1799
const progressBars = document.querySelectorAll('.station-progress-bar');
if (progressBars[lineIndex]) { ... }

// L1805
const infoSpans = document.querySelectorAll('.station-info span');
if (infoSpans[lineIndex * 2]) { ... }
```

This assumes `querySelectorAll` returns elements in the exact positional order matching `lineIndex`. If `initProduction()` is called mid-production (which it is — line 1775), the DOM is **torn down and rebuilt**, and the `progressBars[lineIndex]` reference is now pointing at a **freshly created element**, while the `setInterval` from the old production cycle still runs. This creates ghost intervals writing to orphaned DOM nodes.

**Severity: HIGH.** Multiple overlapping `setInterval` timers can accumulate on the same production line.

---

### BUG-07: `toggleProduction` Doesn't Clear Existing Interval

```javascript
// L1766
function toggleProduction(lineIndex) {
    const line = gameState.productionLines[lineIndex];
    if (line.status === 'idle') {
        line.status = 'working';
        produceAircraft(lineIndex); // creates new setInterval
    } else {
        line.status = 'idle'; // interval checks this, but it's not clearInterval'd
    }
    initProduction(); // rebuilds DOM, orphaning the DOM refs the interval uses
}
```

Setting `line.status = 'idle'` causes the interval's guard clause (L1786) to exit and call `clearInterval` — but `initProduction()` is called **before** the next interval tick, rebuilding the DOM. The interval still fires one more time against the old DOM. If the user rapidly toggles, multiple intervals stack.

---

### BUG-08: Test Results Mutate `aircraftStats` Globally

```javascript
// L1901
if (success) gameState.aircraftStats.speed += 20;
// L1906
if (success) gameState.aircraftStats.safety += 15;
```

Running tests permanently buffs `gameState.aircraftStats` — but these stats are also recalculated from scratch in `calculateAircraftStats()` whenever a component is selected. The test bonuses are **lost** the next time a component is clicked. The player sees the buff, then it silently disappears.

---

### BUG-09: `acceptOrder` Budget Increase Has No Upper Bound Check

```javascript
// L2056
gameState.budget += order.price * 0.2; // Peşinat
```

The Air Force order is worth $80M → 20% upfront = **$16M** added instantly for clicking a button, with no obligation to actually deliver. The order is then spliced from the array with no tracking. **Free money, zero accountability.**

---

## 3. Performance & Security Vulnerabilities

### PERF-01: No Interval Cleanup — Guaranteed Memory Leak

Every call to `startResearch()`, `produceAircraft()`, and `startFlightTest()` creates `setInterval` timers. **None** of these intervals have references stored in a cleanup-accessible scope. The flight test interval is local to `startFlightTest` and unreachable by `closeFlightTest()`. Research intervals are local to `startResearch` closures. Production intervals are local to `produceAircraft`.

**Impact:** After 30 minutes of gameplay with moderate interaction, dozens of orphaned intervals will be ticking, each doing DOM queries against potentially-removed elements.

---

### PERF-02: `initProduction()` Calls from Inside Intervals

`completeProduction()` (L1813) calls `initProduction()` and `updateStats()`. This function is called from inside a `setInterval` callback. The `initProduction()` call performs full DOM teardown-and-rebuild. This means every 500ms production tick that completes will trigger a full re-render of the production UI.

---

### PERF-03: `innerHTML` for Entire Section Rebuilds

Every `init*` function nukes the container with `innerHTML = ''` and rebuilds. For the component list (`initDesign`), this involves creating dozens of DOM nodes with inline event handlers. This is called every time a research completes (L1524–1525: `initResearch(); initDesign();`).

---

### PERF-04: CSS `@import` for Google Fonts — Render-Blocking

```css
/* Line 8 */
@import url('https://fonts.googleapis.com/css2?family=...');
```

`@import` inside `<style>` is **render-blocking** and serializes the font load. Should be a `<link>` in `<head>` with `rel="preconnect"`.

---

### SEC-01: Entire Game State Exposed to Console — Zero Protection

Every meaningful variable is a global:

```javascript
// Console exploit — instant win:
gameState.budget = 999999999;
gameState.prestige = 99999;
gameState.researchPoints = 99999;
updateStats(); // reflects immediately in UI
```

All functions are global too:

```javascript
// Research everything instantly:
researchData.forEach(t => { t.researched = true; t.unlocked = true; });
gameState.unlockedTechs = researchData.map(t => t.id);
initResearch(); initDesign();

// Accept all orders for free money:
marketData.forEach(o => { gameState.budget += o.price; });
```

And the master data arrays:

```javascript
// Make everything free:
researchData.forEach(t => { t.cost.money = 0; t.cost.rp = 0; t.time = 1; });

// Give yourself components without research:
componentData.wings.forEach(c => delete c.tech);
```

> [!WARNING]
> For a client-side-only game this is somewhat expected, but the code makes **zero effort** to encapsulate anything. No IIFE, no module pattern, no `Object.freeze`, no closures around state. Every single game mechanic can be bypassed in one line of console JS.

---

### SEC-02: `prompt()` Return Value Used Without Sanitization

```javascript
// L1677
const aircraftName = prompt('Uçağınıza bir isim verin:', 'AF-1X Prototype');
```

The returned string is later injected into `innerHTML` via `addNotification()` (L1688) and `selectAircraftForProduction()` (L1747). A user can enter `<img src=x onerror=alert(1)>` as the aircraft name and it will execute.

**Severity: Medium.** Self-XSS in a single-player game, but it demonstrates a pattern of unescaped HTML injection throughout the codebase.

---

### SEC-03: Inline `onclick` Handlers with String Interpolation

```javascript
// L1465
onclick="startResearch('${tech.id}')"

// L1746
onclick="assignToLine(${lineIndex}, ${idx}); closeModal();"
```

All interactive behavior is wired through inline `onclick` attributes with template-literal interpolation. If any `id` value contained a quote character, it would break the handler and potentially create injection vectors.

---

## 4. Refactoring Recommendations (Actionable Improvements)

### REC-01: Centralize Timer Management — CRITICAL

Create a `TimerManager` singleton that tracks all `setInterval`/`setTimeout` IDs:

```javascript
const TimerManager = {
    _timers: new Map(),
    setInterval(key, fn, ms) {
        this.clear(key);
        this._timers.set(key, { id: setInterval(fn, ms), type: 'interval' });
    },
    setTimeout(key, fn, ms) {
        this.clear(key);
        this._timers.set(key, { id: setTimeout(fn, ms), type: 'timeout' });
    },
    clear(key) {
        const t = this._timers.get(key);
        if (t) {
            t.type === 'interval' ? clearInterval(t.id) : clearTimeout(t.id);
            this._timers.delete(key);
        }
    },
    clearAll() {
        this._timers.forEach((t, key) => this.clear(key));
    }
};
```

Use keyed timers: `TimerManager.setInterval('flight-sim', fn, 200)`. When closing flight test, call `TimerManager.clear('flight-sim')`.

---

### REC-02: Implement an Actual Game Loop

Replace the timer zoo with a single `requestAnimationFrame` loop:

```javascript
let lastTick = 0;
const TICK_RATE = 500; // ms

function gameLoop(timestamp) {
    if (timestamp - lastTick >= TICK_RATE) {
        lastTick = timestamp;
        updateResearchProgress();
        updateProductionProgress();
        updateFlightSimulation();
        updatePassiveIncome();
        checkAchievements();
        renderAll(); // single render pass
    }
    requestAnimationFrame(gameLoop);
}
```

This gives you pause/resume for free (`cancelAnimationFrame`), consistent timing, and a single render pass per tick.

---

### REC-03: Encapsulate State — IIFE or Module Pattern

Wrap the entire game in an IIFE to prevent console manipulation:

```javascript
(function() {
    'use strict';
    const gameState = Object.seal({ ... });
    // all functions defined here
    // only expose what's needed on window for onclick handlers
})();
```

Better yet, switch from inline `onclick` to `addEventListener` and expose **nothing** globally.

---

### REC-04: Separate Data from Mutated State

Clone master data at game start and never mutate the originals:

```javascript
const RESEARCH_TEMPLATE = Object.freeze([ ... ]);
let activeResearch = structuredClone(RESEARCH_TEMPLATE);
// On game reset:
activeResearch = structuredClone(RESEARCH_TEMPLATE);
```

This enables a "New Game" feature and prevents data corruption.

---

### REC-05: Escape All User Input Before HTML Injection

```javascript
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Usage:
addNotification(`💾 "${escapeHtml(aircraftName)}" tasarımı kaydedildi!`);
```

Apply to every location where user-supplied strings or dynamic data enter `innerHTML`.

---

### REC-06: Use `<link>` Instead of CSS `@import` for Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
```

---

### REC-07: Add a Save/Load System

The game has no persistence. A simple `localStorage` save/load cycle would dramatically improve UX:

```javascript
function saveGame() {
    localStorage.setItem('aeroforge_save', JSON.stringify({
        gameState,
        researchData: researchData.map(t => ({ id: t.id, researched: t.researched, unlocked: t.unlocked })),
        marketData
    }));
}
```

---

### REC-08: Split Into Multiple Files

A 2265-line single-file game is unmaintainable. Minimum viable split:

```
├── index.html          (structure only)
├── css/
│   └── style.css       (all styles)
├── js/
│   ├── state.js        (gameState, data templates)
│   ├── research.js     (research system)
│   ├── design.js       (design/component system)
│   ├── production.js   (production line system)
│   ├── testing.js      (test/flight system)
│   ├── market.js       (market/orders system)
│   ├── ui.js           (modal, notifications, stats)
│   └── main.js         (game loop, init, event binding)
```

---

### REC-09: Fix the `range` Calculation

```javascript
// Current (broken — overwrites base):
range = (design.engines.stats.fuel || 0) * 50;

// Fixed (additive):
range += (design.engines.stats.fuel || 0) * 50;
```

---

### REC-10: Production System Needs a State Machine

The production line status transitions (`idle` → `working` → completion → `idle`) are managed with string comparisons and implicit guard clauses. Replace with an explicit state machine:

```javascript
const ProductionState = {
    IDLE: 'idle',
    WORKING: 'working',
    COMPLETE: 'complete',
    OFFLINE: 'offline'
};

// Transition table:
const TRANSITIONS = {
    [ProductionState.IDLE]: [ProductionState.WORKING],
    [ProductionState.WORKING]: [ProductionState.IDLE, ProductionState.COMPLETE],
    [ProductionState.COMPLETE]: [ProductionState.IDLE],
    [ProductionState.OFFLINE]: [ProductionState.IDLE]
};

function transitionLine(line, newState) {
    if (!TRANSITIONS[line.status]?.includes(newState)) {
        throw new Error(`Invalid transition: ${line.status} → ${newState}`);
    }
    line.status = newState;
}
```

---

## Summary of Findings

| Category | Count | Severity |
|---|---|---|
| **Critical Bugs** | 3 | Timer leaks (BUG-01, BUG-06, BUG-07) |
| **Logic Errors** | 4 | State desync, incorrect calculations (BUG-03, BUG-04, BUG-08, BUG-09) |
| **Race Conditions** | 1 | Flight test dual exit (BUG-02) |
| **Data Integrity** | 1 | Shallow copy (BUG-05) |
| **Performance** | 4 | Interval leaks, full DOM rebuilds, render-blocking CSS |
| **Security** | 3 | Full state exposure, innerHTML injection, unescaped input |
| **Architecture** | N/A | No game loop, no encapsulation, no persistence, monolithic file |

> [!IMPORTANT]
> The most urgent fixes are **BUG-01** (flight timer leak), **BUG-06/07** (production timer stacking), and **SEC-02** (innerHTML injection). These are actively harmful during normal gameplay and will cause increasing performance degradation over time.
