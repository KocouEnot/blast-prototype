# 🎮 Blast Puzzle Prototype

Test task implementation of a mobile puzzle game inspired by **Blast mechanics**.  
Built with **Cocos Creator 2.4.15** using **TypeScript** and OOP/SOLID principles.

---

# 📌 Overview

This project implements a tile-based puzzle game with:

- Cluster-based explosions (min 3 tiles)
- Gravity & refill system
- Shuffle logic with limited retries
- Score & move system
- Win / Game Over states
- Boosters (Teleport & Bomb)
- Hint system (idle suggestion after 5 seconds)
- Clean separation of logic and rendering layers

---

# 🧩 Core Gameplay

### Board
- Size: **9 x 10**
- 5 tile colors
- Random generation on start

### Explosion Rules
- Minimum cluster size: **3**
- If less than 3 → board shake animation
- Valid explosion:
  - Tiles are removed
  - Gravity applied
  - New tiles spawned from top
  - Score increases
  - Moves decrease

---

# 🎯 Score System

- Target score configurable (`targetScore`)
- Default target: **300**
- Initial score: `0 / targetScore`

### Formula

gained = 2 * tilesCount - 1


Examples:

| Tiles | Points |
| ----- | ------ |
| 3     | 5      |
| 4     | 7      |
| 5     | 9      |
| 6     | 11     |

### Bomb Booster Score
Each tile destroyed by bomb gives:

+3 points per tile


---

# 🎮 Moves System

- Default moves: **40**
- Move decreases only on valid explosion
- No move decrease on:
  - Failed explosion (<3)
  - Booster activation
- When moves reach `0` → **Game Over**

---

# 🧠 Hint System

- If player does not make a move for **5 seconds**
- A random valid cluster (>=3) starts pulsing
- Hint resets after:
  - Any click
  - Explosion
  - Booster usage

---

# 🔄 Shuffle Logic

If no valid cluster (>=3) exists:

- Board reshuffles randomly
- Maximum reshuffles per game: **3**
- If after 3 reshuffles no valid moves → **Game Over**

Shuffle has animated transition.

---

# 🏆 Win / Lose Conditions

## Win
- Score >= targetScore
- Overlay shown: `YOU WIN`

## Lose
- Moves == 0
- OR no playable moves after 3 reshuffles
- Overlay shown: `GAME OVER`

---

# 💥 Boosters

## 1️⃣ Teleport Booster
- Allows selecting 2 tiles
- Swaps their positions
- Does not consume move
- Cancels selection if booster deactivated

## 2️⃣ Bomb Booster
- Explodes 3x3 area around selected tile
- Ignores color matching
- Gives +3 score per destroyed tile
- Triggers gravity & refill

### Booster UX
- Only one booster can be active at a time
- Selecting another booster automatically deactivates previous
- Active booster:
  - Slightly pressed
  - Highlight glow effect
- Deactivation resets selected tiles

---

# 🏗 Architecture

Project follows separation of concerns:

## 🔹 Logic Layer (Core)

`scripts/core/boardLogic.ts`
- Game rules
- Score system
- Move tracking
- Win/Lose state
- Shuffle logic
- Booster logic
- Gravity calculations

`scripts/core/boosterController.ts`
- Active booster management
- Single-selection logic

---

## 🔹 Data Layer (Model)

`scripts/model/boardModel.ts`
- Tile storage
- Grid state
- Basic grid operations

---

## 🔹 View Layer

`scripts/view/boardView.ts`
- Rendering
- Animations
- Input handling
- Hint animation
- Gravity animation
- Shuffle animation
- Overlay control

`scripts/view/tileView.ts`
- Individual tile behaviour

`scripts/view/boosterButton.ts`
- Booster visual state (pressed + glow)

---

# 📂 Project Structure

scripts/
│
├── controller/
│ ├── gameSceneController.ts
│ └── startSceneController.ts
│
├── core/
│ ├── boardLogic.ts
│ ├── boosterController.ts
│
├── model/
│ └── boardModel.ts
│
└── view/
│ ├── boardView.ts
│ ├── tileView.ts
│ ├── boosterButton.ts
│ ├── rotateOverlayDraw.ts
│ ├── other UI helpers


---

# 🎨 Animations Implemented

- Tile remove (scale down)
- Gravity fall
- Spawn drop from masked top
- Board shake (invalid move)
- Shuffle movement
- Booster press effect
- Booster glow effect
- Hint pulse animation
- Game Over fade overlay

---

# 🧱 Technical Constraints

- Cocos Creator 2.4.x
- No physics engine
- Pure TypeScript
- OOP + SOLID principles
- Logic separated from View

---

# 🛠 How to Run

1. Open project in **Cocos Creator 2.4.15**
2. Open main scene
3. Press ▶ Play

---

# 📈 Possible Improvements

- Combo multipliers
- Sound effects
- Particle effects
- Smooth score increment animation
- Persistent game state
- Restart button
- Level progression

---

# 🧑‍💻 Author

Test task implementation  
Architecture-focused approach  
Clean separation between logic and rendering  