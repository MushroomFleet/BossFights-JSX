# 🎮 BossFights-JSX

**QTE-Style Boss Battle System for React Three.js Games**

A complete boss fight controller component inspired by Starfox 64, featuring telegraphed attacks, danger zones, weak point mechanics, and dynamic difficulty scaling. Perfect for rail shooters, arcade games, and any project requiring cinematic boss encounters.

![Boss Fight Preview](https://img.shields.io/badge/React-18%2B-61DAFB?logo=react) ![Three.js](https://img.shields.io/badge/Three.js-r150%2B-000000?logo=three.js) ![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **4-Phase Attack State Machine** — Idle → Telegraph → Execute → Recovery cycle creates readable, fair combat
- **9 Attack Patterns** — 2 common attacks (all bosses) + 7 unique signature attacks (one per level)
- **Visual Telegraph System** — Pulsing danger zones and charge-up indicators warn players before attacks land
- **Weak Point Mechanics** — Target vulnerable points during recovery phase for bonus damage
- **QTE Timing Windows** — Optimal evasion windows with visual feedback for skillful dodging
- **Dynamic Difficulty** — Attack frequency increases as boss health decreases
- **Full HUD System** — Boss HP bar, attack status, evasion prompts included
- **Flexible Architecture** — Use as standalone component, integrated scene, or hook-only for custom implementations

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BossFights-JSX.git

# Install dependencies
npm install three @react-three/fiber @react-three/drei
```

### Basic Usage

```jsx
import BossAttackController from './BossAttackController';

function BossArena() {
  return (
    <BossAttackController
      bossLevel={1}
      bossName="CORNERIA MECH"
      onBossDefeated={() => console.log('Victory!')}
      onPlayerHit={(damage) => console.log(`Hit for ${damage}`)}
    />
  );
}
```

---

## 📁 Repository Contents

| File | Description |
|------|-------------|
| `BossAttackController.jsx` | Main React component with all boss fight logic |
| `boss-demo.html` | Interactive browser demo — no build required |
| `BossAttacks-integration.md` | Comprehensive integration guide |
| `README.md` | This file |

---

## 🎯 Demo Preview

**Open `boss-demo.html` in any browser for an instant preview** — no npm install or build step required.

The demo includes:
- 🎮 **Level selector** — Switch between all 7 boss types
- ⚡ **Attack triggers** — Test each attack pattern manually
- 🔴 **Visual feedback** — See telegraph, execute, and recovery phases
- 💎 **Weak point interaction** — Click to damage during vulnerability windows
- ⏱️ **Timing visualization** — Watch the evasion window indicator

### Demo Controls

| Input | Action |
|-------|--------|
| Click weak point | Deal damage (recovery phase only) |
| 1-9 keys | Trigger specific attacks |
| R | Reset boss |
| Level dropdown | Switch boss type |

---

## 🔧 Integration Guide

For detailed integration into your project, see **[BossAttacks-integration.md](./BossAttacks-integration.md)**

The guide covers:
- Three integration approaches (standalone, combined, hook-only)
- Connecting to existing player controllers
- State management patterns (Zustand, Context)
- Custom attack creation
- Audio integration
- Troubleshooting

### Integration Approaches

**Approach A: Standalone** — Drop-in component with its own Canvas
```jsx
<BossAttackController bossLevel={1} bossName="BOSS" />
```

**Approach B: Integrated Scene** — Add to existing Canvas
```jsx
<Canvas>
  <YourGameElements />
  <BossFightScene bossLevel={1} onBossDefeated={handleVictory} />
</Canvas>
```

**Approach C: Hook Only** — Maximum flexibility
```jsx
const { phase, currentAttack, damageBoss } = useBossAttackController({...});
// Render your own custom boss visuals
```

---

## ⚔️ Attack Reference

### Common Attacks (All Bosses)

| Attack | Damage | Evasion |
|--------|--------|---------|
| Sweeping Laser | 25 | Vertical movement |
| Missile Barrage | 15 | Barrel Roll |

### Unique Attacks (Per Level)

| Level | Boss | Signature Attack | Damage |
|-------|------|------------------|--------|
| 1 | Corneria Mech | Seismic Stomp | 40 |
| 2 | Asteroid Carrier | Debris Storm | 20 |
| 3 | Ice Walker | Cryo Blast | 35 |
| 4 | Magma Serpent | Solar Flare | 50 |
| 5 | Bio-Weapon | Toxic Spray | 30 |
| 6 | Mech-Virus | System Corruption | 45 |
| 7 | Final Boss | Andross's Wrath | 60 |

---

## ⚙️ Configuration

```jsx
const BOSS_CONFIG = {
  BASE_HP: 1000,
  ATTACK_INTERVAL_MIN: 3000,    // ms between attacks (min)
  ATTACK_INTERVAL_MAX: 6000,    // ms between attacks (max)
  TELEGRAPH_DURATION: 1500,     // Warning phase duration
  ATTACK_DURATION: 2000,        // Active attack duration
  RECOVERY_DURATION: 1000,      // Vulnerability window
  EVASION_WINDOW_START: 0.7,    // Optimal dodge timing (70-95%)
  EVASION_WINDOW_END: 0.95,
};
```

---

## 📦 Exports

```jsx
// Default export - complete standalone component
import BossAttackController from './BossAttackController';

// Named exports - for integration
import {
  BossFightScene,      // Core scene component
  BossMesh,            // Boss visual
  BossHPBar,           // HP bar UI
  WeakPoint,           // Targetable point
  DangerZone,          // Attack area visual
  AttackIndicator,     // Charge-up effect
  EvasionPrompt,       // QTE timing UI
  useBossAttackController,  // Core logic hook
  BOSS_CONFIG,         // Configuration
  ATTACK_PHASE,        // Phase constants
  COMMON_ATTACKS,      // Shared attacks
  UNIQUE_ATTACKS,      // Per-boss attacks
} from './BossAttackController';
```

---

## 🔗 Related Projects

This component is designed to work alongside rail shooter player controllers. For a compatible player controller, see the Starfox-style tunnel shooter implementation.

---

## 📄 License

MIT License — Free for personal and commercial use.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{bossfights_jsx,
  title = {BossFights-JSX: QTE-Style Boss Battle System for React Three.js},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BossFights-JSX},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
