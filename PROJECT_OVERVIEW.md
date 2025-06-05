# Project Overview

## Section 1: Introduction

This document provides a high-level overview of the Real-Time Strategy (RTS) game project, its structure, and its primary objectives. The game aims to deliver a deep strategic experience centered around computational warfare, advanced resource management, and a highly deterministic simulation environment. These objectives are architecturally supported by the "TrikeShed" deterministic data architecture and "Computronium" design patterns, which are central to the game's unique mechanics.

## Section 2: Filesystem Layout

The project is organized into several main directories:

*   `/` (Root): Contains main configuration files (e.g., `package.json`), the main `index.html`, and top-level project documentation like this overview and the `README.md`.
*   `js/`: Contains the main client-side JavaScript game logic.
    *   `js/core/`: Core game engine components, including simulation loops, unit and building class definitions, and fundamental game mechanics.
    *   `js/ai/`: Systems and logic related to Artificial Intelligence for game units and potentially faction-level strategies.
    *   `js/config/`: Game configuration files, such as unit type definitions, global constants, and simulation parameters.
    *   `js/rendering/`: Logic related to rendering the game state, including WebGL renderers and visual effects.
    *   `js/input/`: Code for handling player input (mouse, keyboard).
    *   `js/pathfinding/`: Algorithms and systems for unit movement and navigation.
    *   `js/terrain-generators/`: Modular terrain generation algorithms as outlined in `docs/terrain_code_splitting_plan.md`.
    *   `js/ui/`: Components and logic for the User Interface.
*   `src/`: Contains TypeScript source code, primarily for core architectural components.
    *   `src/trikeshed/`: Implementation of the "TrikeShed" tensor-based deterministic data architecture (`core.ts`).
*   `docs/`: Contains all project documentation, including the Global Game Design Document (GDD), architectural overviews, technical analyses, and implementation plans.
*   `models/`: Source 3D model files (e.g., in `.obj` format).
*   `processed_models/`: Optimized 3D models for in-game use (e.g., in `.glb` format).
*   `public/`: Static assets that are served directly to the client, such as images, icons, and potentially sounds.
*   `dist/`: The build output directory where compiled code and packaged assets are placed for deployment.
*   `scripts/`: Utility scripts for development, building, or other project-related tasks.
*   `gemini/`: Directory for AI experimentation and integration, likely related to Google's Gemini models.
*   `nvidia_nim/`: Directory for AI experimentation and integration, likely related to NVIDIA NIM inference microservices.

## Section 3: High-Level Project Goals

### Overall Vision
To realize a complex and engaging Real-Time Strategy game that emphasizes:
*   **Deep Strategic Choice:** Meaningful decisions with lasting consequences.
*   **Computational Warfare:** Information, C&C, and processing power (Computronium) as key battlegrounds.
*   **Tangible Technology:** Advanced technology with realistic costs, limitations, and physical presence.
*   **Dynamic World:** Terrain as a consumable resource, with actions visibly changing the environment.
*   **Deterministic & Verifiable Simulation:** Robust and replayable simulation for fair play, analysis, and community trust, built upon the TrikeShed architecture.

### Core Architectural Goals
*   **TrikeShed Implementation:** Successfully implement and leverage the "TrikeShed" deterministic data architecture (see `src/trikeshed/core.ts` and `docs/architecture.md`) as the foundation for all game state representation and logic.
*   **Computronium Integration:** Fully integrate "Computronium" not just as a resource, but as a core mechanic influencing advanced AI, Command & Control (C&C) systems, and unique unit capabilities, as detailed in `docs/the-rts-concepts.md`.
*   **Deterministic Simulation:** Ensure all game logic leads to deterministic outcomes through immutable state management principles (facilitated by tools like Immer.js, see `docs/ecs_evaluation.md`) and consistently applied rules.
*   **High Performance:** Achieve the necessary performance for complex, large-scale simulations with many interacting units and systems, as discussed in `README.md`.

### Key Gameplay Systems Development
*   **Resource Management:** Implement a comprehensive system for gathering and processing various resources including Mass, Energy, Specific Minerals, Specialized Alloys, and Computronium, featuring dynamic landscape consumption as per GDD section 4.2.
*   **Unit Design & Combat:** Develop a diverse roster of units with unique abilities, statistics, costs, and visual identities, governed by detailed combat mechanics including multiple damage types, shields, and armor systems (GDD sections 6, 7).
*   **Command & Control (C&C):** Create a sophisticated C&C system featuring hierarchical command structures, rank-based bonuses, considerations for command latency, advanced squad AI, and dynamic authority influenced by unit health, veterancy, and Computronium core capabilities (GDD section 8, `command-hierarchy-analysis.md`).
*   **Computational Warfare (PoW):** Implement defensive and offensive Proof-of-Work (PoW) mechanics that impact C&C security, provide strategic offensive capabilities, and consume Computronium resources (GDD section 9).
*   **Technology & Progression:** Design and implement a comprehensive technology tree allowing players to unlock new units, abilities, structures, and upgrades, with research often requiring specific resources like Computronium cycles (GDD section 12).
*   **Modular Terrain Generation:** Develop a flexible system for generating diverse game maps, enabling different environmental challenges and strategic landscapes (`terrain_code_splitting_plan.md`).

### (Optional) Meta-Features
*   **Replay System:** Develop a robust replay system that leverages the deterministic nature of the simulation for game analysis, learning, and sharing (GDD section 10.2).
*   **Decentralized Meta-Network:** Explore concepts for a Kademlia/IPFS-inspired decentralized network for community sharing of replays, mods, maps, and strategy guides, potentially secured by PoW (GDD section 11).

## Section 4: Key Milestones (Illustrative)

*(This section is illustrative and provides a high-level outlook. Actual milestones and timelines would require more detailed project planning.)*

*   **Milestone 1 (Core Engine & TrikeShed Proof of Concept):**
    *   Basic TrikeShed data structures (`Tensor`, `Series`) integrated and managing a core aspect of game state (e.g., unit positions and health).
    *   Minimalist rendering of a game scene displaying TrikeShed-managed data.
    *   Initial version of the modular terrain generation system functional.
*   **Milestone 2 (Alpha - Core Gameplay Loop):**
    *   Implementation of the primary gameplay loop: collection of Mass and Energy, construction of basic factories, and production of 2-3 distinct Tier 1 units for one or two factions.
    *   Functional basic combat mechanics between these units.
    *   Rudimentary AI for unit movement and target acquisition.
    *   Initial C&C system allowing direct unit control and basic grouping.
*   **Milestone 3 (Beta - Feature Expansion):**
    *   Expanded unit roster, including a wider variety of Tier 1 and Tier 2 units for multiple factions.
    *   Implementation of the Computronium resource and its basic "Dining Philosophers" core mechanics for select advanced units.
    *   Advanced C&C features, such as squad formations and a basic command hierarchy.
    *   Initial defensive Proof-of-Work (PoW) mechanics integrated into the C&C system.
    *   A significant portion of the technology tree implemented, allowing meaningful strategic choices.
    *   Replay system functional for recording and playback of game sessions.
*   **Milestone 4 (Release Candidate - Feature Complete):**
    *   All major gameplay systems outlined in the GDD are implemented, including advanced Computronium usage (e.g., unique abilities, complex AI behaviors), a full C&C hierarchy with dynamic authority, and offensive PoW capabilities.
    *   Multiple factions are fully playable with their complete unit rosters and unique mechanics.
    *   User Interface (UI) and User Experience (UX) are polished and intuitive.
    *   Comprehensive performance optimization and game balancing passes completed.

## Section 5: Further Detailed Documentation

*   For the complete game design, mechanics, and systems, refer to the Global Game Design Specification: [`docs/the-rts-concepts.md`](docs/the-rts-concepts.md).
*   For a detailed overview of the software architecture, see: [`docs/architecture.md`](docs/architecture.md).
*   For the core implementation details of the TrikeShed data architecture, consult: [`src/trikeshed/core.ts`](src/trikeshed/core.ts).
