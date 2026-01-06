# Boss Attack Controller Integration Guide

## Starfox 64 Style Boss Fight System - Integration Documentation

This document provides comprehensive guidance for integrating the `BossAttackController` component into an existing React Three.js application, specifically designed to work alongside the `StarfoxPlayerController` for seamless boss battle sequences.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Dependency Requirements](#dependency-requirements)
4. [Architecture Overview](#architecture-overview)
5. [Integration Approaches](#integration-approaches)
6. [Step-by-Step Integration](#step-by-step-integration)
7. [Attack System Configuration](#attack-system-configuration)
8. [Connecting to Player Controller](#connecting-to-player-controller)
9. [State Management Integration](#state-management-integration)
10. [Custom Attack Creation](#custom-attack-creation)
11. [Visual Customization](#visual-customization)
12. [Audio Integration](#audio-integration)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Boss Attack Controller provides a complete QTE-style boss battle system featuring:

- **State Machine Attack Cycle**: Idle → Telegraph → Execute → Recovery
- **7 Unique Boss Attacks**: One signature attack per level/boss
- **2 Common Attacks**: Shared attack patterns used by all bosses
- **Visual Telegraph System**: Danger zones and indicators for player warning
- **Weak Point Mechanics**: Vulnerable points exposed during recovery phase
- **Dynamic Difficulty**: Attack frequency increases as boss health decreases
- **Evasion Timing Windows**: QTE-style perfect dodge opportunities

---

## Prerequisites

### Required Codebase Analysis

```bash
# Check for existing StarfoxPlayerController
ls src/components/game/ | grep -i player

# Verify Three.js dependencies
cat package.json | grep -E "(react|three|@react-three)"

# Check for existing boss/enemy systems
grep -r "boss\|enemy" src/ --include="*.jsx" --include="*.tsx" -l

# Identify state management
grep -r "zustand\|redux\|useContext" src/ --include="*.jsx" --include="*.tsx"
```

### Compatibility Requirements

| Requirement | Minimum Version | Notes |
|------------|-----------------|-------|
| React | 18.0+ | Hooks-based component |
| Three.js | 0.150+ | Modern Three.js APIs |
| @react-three/fiber | 8.0+ | Canvas provider required |
| @react-three/drei | 9.0+ | Html component for HUD |
| StarfoxPlayerController | 1.0+ | For player state integration |

---

## Dependency Requirements

### Installation

```bash
# If not already installed
npm install three @react-three/fiber @react-three/drei

# Copy component to your project
cp BossAttackController.jsx src/components/game/
```

### File Structure

```
src/
├── components/
│   └── game/
│       ├── StarfoxPlayerController.jsx
│       ├── BossAttackController.jsx
│       └── bosses/
│           ├── CorneriaB oss.jsx
│           ├── MeteoBoss.jsx
│           └── ...
├── config/
│   └── bossConfig.js
├── store/
│   └── gameStore.js
└── App.jsx
```

---

## Architecture Overview

### Attack Phase State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────┐    ┌───────────┐    ┌───────────┐    ┌─────────┐ │
│  │ IDLE │───▶│ TELEGRAPH │───▶│ EXECUTING │───▶│RECOVERY │ │
│  └──────┘    └───────────┘    └───────────┘    └─────────┘ │
│      ▲                                              │       │
│      └──────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

IDLE:      Boss is passive, selecting next attack
TELEGRAPH: Warning phase - danger zones pulse, indicators charge
EXECUTING: Attack is active - damage dealt if player in zone
RECOVERY:  Vulnerability window - weak points exposed
```

### Component Hierarchy

```
BossAttackController (Main Export)
├── BossFightScene
│   ├── BossMesh (Visual representation)
│   ├── WeakPoint[] (Targetable weak points)
│   ├── AttackIndicator (Charge-up visuals)
│   ├── DangerZone (Area effect visualization)
│   └── Html (HUD Layer)
│       ├── BossHPBar
│       └── EvasionPrompt
└── useBossAttackController (Core Logic Hook)
```

---

## Integration Approaches

### Approach A: Standalone Boss Scene (Simplest)

Use for dedicated boss arenas with scene transition:

```jsx
import BossAttackController from './BossAttackController';

function BossArena() {
  const handleVictory = () => {
    // Transition to results/next level
  };

  return (
    <BossAttackController
      bossLevel={1}
      bossName="CORNERIA MECH"
      onBossDefeated={handleVictory}
      onPlayerHit={(damage) => console.log(`Hit for ${damage}`)}
    />
  );
}
```

### Approach B: Integrated with Player Controller (Recommended)

Combine with existing game canvas for seamless transition:

```jsx
import { Canvas } from '@react-three/fiber';
import { GameController } from './StarfoxPlayerController';
import { BossFightScene } from './BossAttackController';

function GameLevel({ levelNumber }) {
  const [isBossFight, setIsBossFight] = useState(false);
  const [playerState, setPlayerState] = useState(null);

  return (
    <Canvas camera={{ fov: 75 }}>
      {!isBossFight ? (
        <GameController 
          onStateUpdate={setPlayerState}
          onReachEnd={() => setIsBossFight(true)}
        />
      ) : (
        <BossFightScene
          bossLevel={levelNumber}
          bossName={BOSS_NAMES[levelNumber]}
          playerIsInvulnerable={playerState?.isInvulnerable}
          onBossDefeated={() => advanceLevel()}
          onPlayerHit={handleDamage}
        />
      )}
    </Canvas>
  );
}
```

### Approach C: Hook-Only Integration (Maximum Flexibility)

Use the attack logic hook with custom visuals:

```jsx
import { useBossAttackController } from './BossAttackController';

function CustomBossBattle() {
  const {
    currentHP,
    phase,
    currentAttack,
    attackProgress,
    damageBoss,
    forceAttack,
  } = useBossAttackController({
    bossLevel: 1,
    maxHP: 2000,
    onBossDefeated: () => console.log('Victory!'),
    onPlayerHit: (damage) => playerHealth.current -= damage,
    playerIsInvulnerable: isBarrelRolling,
  });

  return (
    <>
      <CustomBossModel phase={phase} />
      <CustomDangerZones attack={currentAttack} />
      <CustomHUD hp={currentHP} />
    </>
  );
}
```

---

## Step-by-Step Integration

### Step 1: Copy Component Files

```bash
cp BossAttackController.jsx src/components/game/
```

### Step 2: Create Boss Configuration

```jsx
// src/config/bossConfig.js
import { BOSS_CONFIG as DEFAULT_CONFIG } from '../components/game/BossAttackController';

export const BOSS_CONFIG = {
  ...DEFAULT_CONFIG,
  // Override defaults for your game
  BASE_HP: 1500,
  ATTACK_INTERVAL_MIN: 2500,
  ATTACK_INTERVAL_MAX: 5000,
};

export const BOSS_DATA = {
  1: {
    name: 'GRANGA',
    subtitle: 'Corneria Defense Mech',
    hp: 1000,
    weakPoints: [[0, 2.5, -18], [-2, 0, -19], [2, 0, -19]],
    position: [0, 0, -20],
  },
  2: {
    name: 'METEO CRUSHER',
    subtitle: 'Asteroid Mining Platform',
    hp: 1200,
    weakPoints: [[0, 3, -18]],
    position: [0, 2, -22],
  },
  // ... more bosses
};
```

### Step 3: Create Level Manager

```jsx
// src/components/game/LevelManager.jsx
import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameController } from './StarfoxPlayerController';
import { BossFightScene } from './BossAttackController';
import { BOSS_DATA } from '../../config/bossConfig';
import { useGameStore } from '../../store/gameStore';

export function LevelManager({ levelNumber }) {
  const [gamePhase, setGamePhase] = useState('flying'); // 'flying' | 'boss' | 'victory'
  const [playerState, setPlayerState] = useState(null);
  
  const playerHealth = useGameStore(state => state.playerHealth);
  const takeDamage = useGameStore(state => state.takeDamage);
  const isInvulnerable = useGameStore(state => state.isInvulnerable);
  
  const bossData = BOSS_DATA[levelNumber];

  const handleBossDefeated = useCallback(() => {
    setGamePhase('victory');
    // Play victory fanfare, show results, etc.
  }, []);

  const handlePlayerHit = useCallback((damage) => {
    if (!isInvulnerable) {
      takeDamage(damage);
    }
  }, [isInvulnerable, takeDamage]);

  const handleReachBoss = useCallback(() => {
    setGamePhase('boss');
    // Play boss intro cutscene/warning
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ fov: 75 }}>
        <fog attach="fog" args={['#000022', 50, 200]} />
        
        {gamePhase === 'flying' && (
          <GameController
            onStateUpdate={setPlayerState}
            onReachEnd={handleReachBoss}
          />
        )}
        
        {gamePhase === 'boss' && (
          <BossFightScene
            bossLevel={levelNumber}
            bossName={bossData.name}
            bossPosition={bossData.position}
            maxHP={bossData.hp}
            weakPoints={bossData.weakPoints}
            onBossDefeated={handleBossDefeated}
            onPlayerHit={handlePlayerHit}
            playerIsInvulnerable={isInvulnerable}
            playerPosition={playerState?.position}
          />
        )}
        
        {gamePhase === 'victory' && (
          <VictoryScene levelNumber={levelNumber} />
        )}
      </Canvas>
    </div>
  );
}
```

### Step 4: Connect to State Management

```jsx
// src/store/gameStore.js
import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Player state
  playerHealth: 100,
  maxPlayerHealth: 100,
  isInvulnerable: false,
  score: 0,
  
  // Boss state
  currentBossHP: 0,
  bossDefeated: false,
  
  // Actions
  setInvulnerable: (value) => set({ isInvulnerable: value }),
  
  takeDamage: (amount) => {
    const { isInvulnerable, playerHealth } = get();
    if (!isInvulnerable && playerHealth > 0) {
      const newHealth = Math.max(0, playerHealth - amount);
      set({ playerHealth: newHealth });
      
      if (newHealth <= 0) {
        // Trigger game over
        get().handleGameOver();
      }
    }
  },
  
  setBossHP: (hp) => set({ currentBossHP: hp }),
  
  handleBossDefeated: () => {
    set({ bossDefeated: true });
    // Trigger victory sequence
  },
  
  handleGameOver: () => {
    // Game over logic
  },
  
  resetLevel: () => set({
    playerHealth: get().maxPlayerHealth,
    isInvulnerable: false,
    currentBossHP: 0,
    bossDefeated: false,
  }),
}));
```

---

## Attack System Configuration

### Available Attacks

#### Common Attacks (All Bosses)

| Attack | Damage | Telegraph | Execute | Recovery | Evasion |
|--------|--------|-----------|---------|----------|---------|
| Sweeping Laser | 25 | 1200ms | 1800ms | 800ms | Vertical |
| Missile Barrage | 15 | 1500ms | 2500ms | 1000ms | Barrel Roll |

#### Unique Attacks (Per Level)

| Level | Boss | Attack | Damage | Evasion |
|-------|------|--------|--------|---------|
| 1 | Corneria Mech | Seismic Stomp | 40 | Up |
| 2 | Asteroid Carrier | Debris Storm | 20 | Weave |
| 3 | Ice Walker | Cryo Blast | 35 | Horizontal |
| 4 | Magma Serpent | Solar Flare | 50 | Barrel Roll |
| 5 | Bio-Weapon | Toxic Spray | 30 | Retreat |
| 6 | Mech-Virus | System Corruption | 45 | Random |
| 7 | Final Boss | Andross's Wrath | 60 | Complex |

### Modifying Attack Parameters

```jsx
// Override attack timing
import { UNIQUE_ATTACKS, COMMON_ATTACKS } from './BossAttackController';

// Create modified attack
const CUSTOM_STOMP = {
  ...UNIQUE_ATTACKS.STOMP_SHOCKWAVE,
  damage: 50,  // Increased damage
  telegraphDuration: 2000,  // More warning time
  recoveryDuration: 2000,  // Longer vulnerability window
};

// Use in custom attack pool
const customAttacks = [
  COMMON_ATTACKS.SWEEPING_LASER,
  CUSTOM_STOMP,
];
```

---

## Connecting to Player Controller

### Barrel Roll Invulnerability

The boss attack system respects the player's invulnerability state during barrel rolls:

```jsx
// In your integrated scene
function BossBattle() {
  const [playerInvulnerable, setPlayerInvulnerable] = useState(false);
  
  const handlePlayerStateUpdate = (state) => {
    setPlayerInvulnerable(state.isInvulnerable);
  };

  return (
    <>
      <GameController onStateUpdate={handlePlayerStateUpdate} />
      <BossFightScene
        playerIsInvulnerable={playerInvulnerable}
        onPlayerHit={(damage) => {
          // Only called if player NOT invulnerable
          takeDamage(damage);
        }}
      />
    </>
  );
}
```

### Projectile Hit Detection

Connect player projectiles to boss weak points:

```jsx
// src/systems/BossHitDetection.jsx
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';

export function useBossHitDetection({ 
  projectiles, 
  weakPoints, 
  attackPhase,
  onWeakPointHit 
}) {
  useFrame(() => {
    // Only check during recovery phase
    if (attackPhase !== 'recovery') return;
    
    projectiles.forEach(projectile => {
      weakPoints.forEach((wpPosition, index) => {
        const distance = new Vector3(...wpPosition)
          .distanceTo(projectile.position);
        
        if (distance < 1.5) { // Hit radius
          onWeakPointHit(index, projectile.id);
        }
      });
    });
  });
}
```

---

## State Management Integration

### Using with Zustand

```jsx
// Extended game store for boss battles
export const useGameStore = create((set, get) => ({
  // ... existing state
  
  // Boss battle state
  bossPhase: 'idle',
  currentAttack: null,
  bossHP: 1000,
  bossMaxHP: 1000,
  
  // Boss actions
  setBossPhase: (phase) => set({ bossPhase: phase }),
  setCurrentAttack: (attack) => set({ currentAttack: attack }),
  
  damageBoss: (amount) => {
    const newHP = Math.max(0, get().bossHP - amount);
    set({ bossHP: newHP });
    
    if (newHP <= 0) {
      get().handleBossDefeated();
    }
  },
  
  initBossFight: (bossConfig) => set({
    bossHP: bossConfig.hp,
    bossMaxHP: bossConfig.hp,
    bossPhase: 'idle',
    currentAttack: null,
  }),
}));
```

### Using with React Context

```jsx
// src/context/BossContext.jsx
import { createContext, useContext, useReducer, useCallback } from 'react';
import { ATTACK_PHASE } from '../components/game/BossAttackController';

const BossContext = createContext();

const initialState = {
  hp: 1000,
  maxHP: 1000,
  phase: ATTACK_PHASE.IDLE,
  currentAttack: null,
  isDefeated: false,
};

function bossReducer(state, action) {
  switch (action.type) {
    case 'DAMAGE':
      const newHP = Math.max(0, state.hp - action.payload);
      return {
        ...state,
        hp: newHP,
        isDefeated: newHP <= 0,
      };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_ATTACK':
      return { ...state, currentAttack: action.payload };
    case 'RESET':
      return { ...initialState, maxHP: action.payload?.maxHP || 1000 };
    default:
      return state;
  }
}

export function BossProvider({ children }) {
  const [state, dispatch] = useReducer(bossReducer, initialState);
  
  const damageBoss = useCallback((amount) => {
    dispatch({ type: 'DAMAGE', payload: amount });
  }, []);
  
  const setPhase = useCallback((phase) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  }, []);
  
  return (
    <BossContext.Provider value={{ state, damageBoss, setPhase, dispatch }}>
      {children}
    </BossContext.Provider>
  );
}

export const useBoss = () => useContext(BossContext);
```

---

## Custom Attack Creation

### Adding New Common Attacks

```jsx
// src/config/customAttacks.js
export const CUSTOM_COMMON_ATTACKS = {
  CHAIN_LIGHTNING: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    type: 'common',
    damage: 20,
    telegraphDuration: 1000,
    executeDuration: 1500,
    recoveryDuration: 900,
    dangerZone: 'branching_lines',
    indicator: 'spark_buildup',
    sound: 'electric_charge',
    evasionDirection: 'barrel_roll',
    description: 'Electric arcs that jump between positions',
  },
};
```

### Adding New Unique Attacks

```jsx
// Add a new boss with unique attack
export const NEW_UNIQUE_ATTACK = {
  GRAVITY_WELL: {
    id: 'gravity_well',
    name: 'Gravity Well',
    type: 'unique',
    bossLevel: 8, // New level
    damage: 55,
    telegraphDuration: 2000,
    executeDuration: 2500,
    recoveryDuration: 1200,
    dangerZone: 'pull_vortex',
    indicator: 'distortion_field',
    sound: 'space_warp',
    evasionDirection: 'boost_escape',
    description: 'Creates a gravity vortex that pulls player in',
  },
};
```

### Custom Danger Zone Renderer

```jsx
// In BossAttackController.jsx, add to DangerZone component
case 'branching_lines':
  return (
    <group>
      {/* Lightning bolt segments */}
      {[...Array(5)].map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh 
            key={i}
            position={[Math.cos(angle) * 5, 0, Math.sin(angle) * 5]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.2, 0.2, 10]} />
            <meshBasicMaterial 
              color="#88ffff"
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
```

---

## Visual Customization

### Custom Boss Mesh

```jsx
// src/components/game/bosses/CustomBoss.jsx
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function CorneriaaBossMesh({ phase, healthPercent, isHit }) {
  const { nodes, materials } = useGLTF('/models/corneria_boss.glb');
  const meshRef = useRef();
  
  useFrame((state) => {
    // Idle animation
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    
    // Phase-based effects
    if (phase === 'telegraph') {
      materials.Body.emissiveIntensity = 
        0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
    }
  });
  
  // Color based on health
  useEffect(() => {
    if (healthPercent < 0.25) {
      materials.Body.color.setHex(0xff4444);
    }
  }, [healthPercent]);
  
  return (
    <group ref={meshRef}>
      <primitive object={nodes.BossBody} />
      <primitive object={nodes.BossArms} />
      <primitive object={nodes.BossCore} />
    </group>
  );
}
```

### Custom HUD Theme

```jsx
// Themed boss HP bar
function ThemedBossHPBar({ currentHP, maxHP, bossName, theme = 'fire' }) {
  const themes = {
    fire: { primary: '#ff4400', secondary: '#ffaa00', glow: 'rgba(255,68,0,0.5)' },
    ice: { primary: '#00aaff', secondary: '#88ffff', glow: 'rgba(0,170,255,0.5)' },
    tech: { primary: '#00ff88', secondary: '#88ffaa', glow: 'rgba(0,255,136,0.5)' },
  };
  
  const t = themes[theme];
  
  return (
    <div style={{
      background: 'rgba(0,0,0,0.8)',
      border: `2px solid ${t.primary}`,
      boxShadow: `0 0 20px ${t.glow}`,
      // ... rest of styling
    }}>
      {/* HP bar content */}
    </div>
  );
}
```

---

## Audio Integration

### Sound Effect Triggers

```jsx
// src/hooks/useBossAudio.js
import { useEffect, useRef } from 'react';
import { Howl } from 'howler';

const BOSS_SOUNDS = {
  laser_charge: new Howl({ src: ['/audio/boss/laser_charge.mp3'] }),
  missile_lock: new Howl({ src: ['/audio/boss/missile_lock.mp3'] }),
  attack_execute: new Howl({ src: ['/audio/boss/attack_execute.mp3'] }),
  boss_hit: new Howl({ src: ['/audio/boss/boss_hit.mp3'] }),
  weak_point_exposed: new Howl({ src: ['/audio/boss/weak_point.mp3'] }),
};

export function useBossAudio(phase, currentAttack, isHit) {
  const lastPhase = useRef(null);
  
  useEffect(() => {
    if (phase !== lastPhase.current) {
      // Phase transition sounds
      if (phase === 'telegraph' && currentAttack?.sound) {
        BOSS_SOUNDS[currentAttack.sound]?.play();
      }
      if (phase === 'executing') {
        BOSS_SOUNDS.attack_execute.play();
      }
      if (phase === 'recovery') {
        BOSS_SOUNDS.weak_point_exposed.play();
      }
      
      lastPhase.current = phase;
    }
  }, [phase, currentAttack]);
  
  useEffect(() => {
    if (isHit) {
      BOSS_SOUNDS.boss_hit.play();
    }
  }, [isHit]);
}
```

### Integrate Audio Hook

```jsx
function BossFightWithAudio({ bossLevel, ... }) {
  const { phase, currentAttack, isHit, ...rest } = useBossAttackController({...});
  
  // Add audio
  useBossAudio(phase, currentAttack, isHit);
  
  return <BossFightScene phase={phase} currentAttack={currentAttack} {...rest} />;
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Boss not attacking | Timer not started | Ensure `scheduleNextAttack()` called on mount |
| Player always takes damage | Invulnerability not connected | Pass `playerIsInvulnerable` prop correctly |
| Weak points not responding | Wrong attack phase | Weak points only active during `RECOVERY` phase |
| Danger zones not visible | Opacity calculation | Check `DANGER_ZONE_OPACITY` config |
| Attacks too fast/slow | Health scaling | Adjust `calculateNextAttackDelay()` multiplier |

### Debug Mode

```jsx
// Add debug overlay
function BossDebugOverlay({ phase, currentAttack, attackProgress, hp }) {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      background: 'rgba(0,0,0,0.8)',
      color: '#0f0',
      padding: 10,
      fontFamily: 'monospace',
      fontSize: 11,
      zIndex: 9999,
    }}>
      <div>Phase: {phase}</div>
      <div>Attack: {currentAttack?.name || 'None'}</div>
      <div>Progress: {(attackProgress * 100).toFixed(1)}%</div>
      <div>HP: {hp}</div>
    </div>
  );
}
```

### Performance Optimization

```jsx
// Memoize heavy components
const MemoizedDangerZone = React.memo(DangerZone);
const MemoizedBossMesh = React.memo(BossMesh);

// Use refs for frequently updated values
const attackProgressRef = useRef(0);

// Batch state updates
const [bossState, setBossState] = useState({
  phase: ATTACK_PHASE.IDLE,
  currentAttack: null,
  progress: 0,
});
```

---

## Quick Reference

### Exported Components

| Export | Type | Description |
|--------|------|-------------|
| `default` | Component | Complete standalone boss controller |
| `BossFightScene` | Component | Core boss battle scene (use inside Canvas) |
| `BossMesh` | Component | Placeholder boss visual |
| `BossHPBar` | Component | Boss health UI |
| `WeakPoint` | Component | Targetable weak point |
| `DangerZone` | Component | Attack area visualization |
| `AttackIndicator` | Component | Charge-up visual |
| `EvasionPrompt` | Component | QTE timing UI |
| `useBossAttackController` | Hook | Core attack logic |

### Configuration Constants

| Constant | Type | Description |
|----------|------|-------------|
| `BOSS_CONFIG` | Object | Timing and visual parameters |
| `ATTACK_PHASE` | Enum | Phase state constants |
| `ATTACK_REGISTRY` | Object | All attacks by ID |
| `COMMON_ATTACKS` | Object | Shared attack definitions |
| `UNIQUE_ATTACKS` | Object | Per-boss attack definitions |

### State Shape

```typescript
interface BossState {
  currentHP: number;
  maxHP: number;
  healthPercent: number;
  phase: 'idle' | 'telegraph' | 'executing' | 'recovery';
  currentAttack: Attack | null;
  attackProgress: number; // 0-1
  isHit: boolean;
}

interface Attack {
  id: string;
  name: string;
  type: 'common' | 'unique';
  damage: number;
  telegraphDuration: number;
  executeDuration: number;
  recoveryDuration: number;
  dangerZone: string;
  indicator: string;
  evasionDirection: string;
}
```

---

## Support & Resources

- **Three.js Documentation**: https://threejs.org/docs/
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber/
- **Drei Components**: https://github.com/pmndrs/drei
- **Zustand State Management**: https://github.com/pmndrs/zustand

---

*This integration guide covers common scenarios. For advanced customization or specific requirements, examine the source component and modify as needed.*
