# AeroForge

AeroForge is an Aircraft Manufacturing Tycoon Simulation ("Uçak İmalat Simülasyonu") game built as a single-page HTML5 application using Vanilla JavaScript and CSS.

## Overview

In AeroForge, players manage their own aviation company, overseeing the entire process of aircraft manufacturing. This includes:
- **Research & Development**: Unlocking new technologies and aircraft components.
- **Aircraft Design**: Assembling custom aircraft from various components (wings, fuselage, engines, tail, cockpit) to achieve optimal stats like speed, range, capacity, and safety.
- **Production**: Managing production lines to build aircraft efficiently.
- **Testing**: Conducting flight tests to ensure aircraft integrity and performance.
- **Market Sales**: Fulfilling market orders (e.g., Air Force contracts) to earn budget and prestige.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Architecture**: Single-page application with centralized state management.
- **Dependencies**: No external frameworks or libraries.

## Project Structure

```text
AeroForge/
├── index.html                 # Main HTML structure and game container
├── style.css                  # Styling, layout, and animations
├── js/                        # Modularized JavaScript game engine components
├── agents/                    # Optional agents or background processing components
└── aeroforge_documentation.md # Deep-dive system architecture and audit documentation
```

## System Architecture

The game utilizes a global `gameState` object that tracks player progress, including budget, prestige, unlocked techs, current designs, and production lines. Master data like technology trees and component stats are handled via global data objects.

The game's rendering logic dynamically rebuilds DOM sections using template literals based on state changes. Time-based events (research, production, flight tests) are managed via `setInterval` and `setTimeout` functions.

*(Note: The game was recently audited. Please see `aeroforge_documentation.md` for a comprehensive breakdown of the engine, known bugs, and ongoing refactoring guidelines.)*

## Getting Started

To play the game or test it locally:
1. Clone the repository.
2. Open `index.html` in any modern web browser.
3. No build step or local server is strictly required, though using a simple HTTP server (like VS Code Live Server) is recommended for development.

## Development

When contributing to AeroForge, please refer to the `aeroforge_documentation.md` for insight into critical bugs, state management, and the timer lifecycle to avoid introducing regressions such as memory leaks or race conditions.