import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, MathUtils, Color } from 'three';
import { Html } from '@react-three/drei';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const BOSS_CONFIG = {
  // Boss Stats
  BASE_HP: 1000,
  DAMAGE_FLASH_DURATION: 150,
  INVULNERABLE_AFTER_HIT: 200,
  
  // Attack Timing
  ATTACK_INTERVAL_MIN: 3000,
  ATTACK_INTERVAL_MAX: 6000,
  TELEGRAPH_DURATION: 1500,
  ATTACK_DURATION: 2000,
  RECOVERY_DURATION: 1000,
  
  // Danger Zones
  DANGER_ZONE_OPACITY: 0.4,
  DANGER_ZONE_PULSE_SPEED: 8,
  
  // Visual
  BOSS_SIZE: 5,
  WEAK_POINT_SIZE: 1,
  INDICATOR_DISTANCE: 15,
  
  // Player Evasion Window
  EVASION_WINDOW_START: 0.7,
  EVASION_WINDOW_END: 0.95,
};

// ============================================================================
// ATTACK DEFINITIONS
// ============================================================================

// Attack phases for state machine
const ATTACK_PHASE = {
  IDLE: 'idle',
  TELEGRAPH: 'telegraph',
  EXECUTING: 'executing',
  RECOVERY: 'recovery',
};

// Common attacks used by all bosses
const COMMON_ATTACKS = {
  SWEEPING_LASER: {
    id: 'sweeping_laser',
    name: 'Sweeping Laser',
    type: 'common',
    damage: 25,
    telegraphDuration: 1200,
    executeDuration: 1800,
    recoveryDuration: 800,
    dangerZone: 'horizontal_sweep',
    indicator: 'laser_charge',
    sound: 'laser_charge',
    evasionDirection: 'vertical',
    description: 'A horizontal laser that sweeps across the arena',
  },
  MISSILE_BARRAGE: {
    id: 'missile_barrage',
    name: 'Missile Barrage',
    type: 'common',
    damage: 15,
    telegraphDuration: 1500,
    executeDuration: 2500,
    recoveryDuration: 1000,
    dangerZone: 'tracking_missiles',
    indicator: 'lock_on',
    sound: 'missile_lock',
    evasionDirection: 'barrel_roll',
    description: 'Multiple tracking missiles that require barrel roll to evade',
  },
};

// Unique attacks - one per boss level
const UNIQUE_ATTACKS = {
  // Level 1 - Corneria: Ground Mech Boss
  STOMP_SHOCKWAVE: {
    id: 'stomp_shockwave',
    name: 'Seismic Stomp',
    type: 'unique',
    bossLevel: 1,
    damage: 40,
    telegraphDuration: 1800,
    executeDuration: 1200,
    recoveryDuration: 1500,
    dangerZone: 'ground_ring',
    indicator: 'leg_raise',
    sound: 'mechanical_charge',
    evasionDirection: 'up',
    description: 'Boss raises leg and slams down creating a ground shockwave',
  },
  
  // Level 2 - Meteo: Asteroid Carrier Boss
  DEBRIS_STORM: {
    id: 'debris_storm',
    name: 'Debris Storm',
    type: 'unique',
    bossLevel: 2,
    damage: 20,
    telegraphDuration: 2000,
    executeDuration: 3000,
    recoveryDuration: 800,
    dangerZone: 'scattered_zones',
    indicator: 'asteroid_gather',
    sound: 'rumble',
    evasionDirection: 'weave',
    description: 'Boss pulls in asteroids and hurls them at player',
  },
  
  // Level 3 - Fichina: Ice Walker Boss
  CRYO_BLAST: {
    id: 'cryo_blast',
    name: 'Cryo Blast',
    type: 'unique',
    bossLevel: 3,
    damage: 35,
    telegraphDuration: 1400,
    executeDuration: 1600,
    recoveryDuration: 1200,
    dangerZone: 'cone_forward',
    indicator: 'frost_buildup',
    sound: 'ice_charge',
    evasionDirection: 'horizontal',
    description: 'Boss charges and releases a freezing cone attack',
  },
  
  // Level 4 - Solar: Magma Serpent Boss
  SOLAR_FLARE: {
    id: 'solar_flare',
    name: 'Solar Flare',
    type: 'unique',
    bossLevel: 4,
    damage: 50,
    telegraphDuration: 2200,
    executeDuration: 1000,
    recoveryDuration: 2000,
    dangerZone: 'full_arena_flash',
    indicator: 'heat_buildup',
    sound: 'plasma_charge',
    evasionDirection: 'barrel_roll',
    description: 'Massive arena-wide blast requiring perfect timing',
  },
  
  // Level 5 - Zoness: Bio-Weapon Boss
  TOXIC_SPRAY: {
    id: 'toxic_spray',
    name: 'Toxic Spray',
    type: 'unique',
    bossLevel: 5,
    damage: 30,
    telegraphDuration: 1600,
    executeDuration: 2200,
    recoveryDuration: 900,
    dangerZone: 'spreading_cloud',
    indicator: 'gas_buildup',
    sound: 'hiss',
    evasionDirection: 'retreat',
    description: 'Boss releases expanding toxic cloud',
  },
  
  // Level 6 - Sector X: Mech-Virus Boss
  SYSTEM_CORRUPTION: {
    id: 'system_corruption',
    name: 'System Corruption',
    type: 'unique',
    bossLevel: 6,
    damage: 45,
    telegraphDuration: 1000,
    executeDuration: 2800,
    recoveryDuration: 1100,
    dangerZone: 'glitch_zones',
    indicator: 'static_interference',
    sound: 'digital_screech',
    evasionDirection: 'random',
    description: 'Creates glitching danger zones that shift unpredictably',
  },
  
  // Level 7 - Venom: Final Boss
  ANDROSS_WRATH: {
    id: 'andross_wrath',
    name: "Andross's Wrath",
    type: 'unique',
    bossLevel: 7,
    damage: 60,
    telegraphDuration: 2500,
    executeDuration: 3500,
    recoveryDuration: 1500,
    dangerZone: 'multi_phase',
    indicator: 'power_surge',
    sound: 'ultimate_charge',
    evasionDirection: 'complex',
    description: 'Multi-phase devastating attack requiring multiple evasions',
  },
};

// Build complete attack registry
const ATTACK_REGISTRY = {
  ...Object.fromEntries(
    Object.entries(COMMON_ATTACKS).map(([key, val]) => [val.id, val])
  ),
  ...Object.fromEntries(
    Object.entries(UNIQUE_ATTACKS).map(([key, val]) => [val.id, val])
  ),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function getAttacksForBoss(bossLevel) {
  const commonAttacks = Object.values(COMMON_ATTACKS);
  const uniqueAttack = Object.values(UNIQUE_ATTACKS).find(
    attack => attack.bossLevel === bossLevel
  );
  
  return {
    common: commonAttacks,
    unique: uniqueAttack,
    all: uniqueAttack ? [...commonAttacks, uniqueAttack] : commonAttacks,
  };
}

function selectRandomAttack(attacks, weights = null) {
  if (!weights) {
    return attacks[Math.floor(Math.random() * attacks.length)];
  }
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < attacks.length; i++) {
    random -= weights[i];
    if (random <= 0) return attacks[i];
  }
  
  return attacks[attacks.length - 1];
}

function calculateNextAttackDelay(bossHealthPercent) {
  // Boss attacks faster as health decreases
  const rageMultiplier = 1 - (bossHealthPercent * 0.3);
  const baseDelay = MathUtils.randFloat(
    BOSS_CONFIG.ATTACK_INTERVAL_MIN,
    BOSS_CONFIG.ATTACK_INTERVAL_MAX
  );
  return baseDelay * rageMultiplier;
}

// ============================================================================
// DANGER ZONE COMPONENT
// ============================================================================
function DangerZone({ 
  type, 
  progress, 
  phase,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = '#ff0000',
}) {
  const ref = useRef();
  const [pulseIntensity, setPulseIntensity] = useState(0);
  
  useFrame((state) => {
    if (!ref.current) return;
    
    // Pulsing effect during telegraph
    if (phase === ATTACK_PHASE.TELEGRAPH) {
      const pulse = Math.sin(state.clock.elapsedTime * BOSS_CONFIG.DANGER_ZONE_PULSE_SPEED);
      setPulseIntensity((pulse + 1) / 2);
    } else if (phase === ATTACK_PHASE.EXECUTING) {
      setPulseIntensity(1);
    } else {
      setPulseIntensity(0);
    }
  });
  
  const opacity = BOSS_CONFIG.DANGER_ZONE_OPACITY * pulseIntensity;
  
  const renderZone = () => {
    switch (type) {
      case 'horizontal_sweep':
        return (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[30, 4]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={opacity}
              side={2}
            />
          </mesh>
        );
        
      case 'ground_ring':
        return (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            <ringGeometry args={[2, 15 * progress, 32]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={opacity}
              side={2}
            />
          </mesh>
        );
        
      case 'cone_forward':
        return (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[8 * scale, 20, 16, 1, true]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={opacity * 0.5}
              side={2}
            />
          </mesh>
        );
        
      case 'full_arena_flash':
        return (
          <mesh>
            <sphereGeometry args={[25 * progress, 16, 16]} />
            <meshBasicMaterial 
              color={phase === ATTACK_PHASE.EXECUTING ? '#ffffff' : color} 
              transparent 
              opacity={phase === ATTACK_PHASE.EXECUTING ? 0.8 : opacity * 0.3}
              side={1}
            />
          </mesh>
        );
        
      case 'tracking_missiles':
        return (
          <group>
            {[...Array(5)].map((_, i) => (
              <mesh 
                key={i}
                position={[
                  Math.sin(i * 1.25) * 8,
                  Math.cos(i * 1.25) * 6,
                  -10 - i * 3
                ]}
              >
                <sphereGeometry args={[1.5, 8, 8]} />
                <meshBasicMaterial 
                  color={color} 
                  transparent 
                  opacity={opacity}
                />
              </mesh>
            ))}
          </group>
        );
        
      case 'scattered_zones':
        return (
          <group>
            {[...Array(8)].map((_, i) => (
              <mesh 
                key={i}
                position={[
                  Math.sin(i * 0.8 + progress * 2) * 10,
                  Math.cos(i * 0.6 + progress) * 6,
                  -5 - Math.abs(Math.sin(i)) * 10
                ]}
              >
                <boxGeometry args={[2, 2, 2]} />
                <meshBasicMaterial 
                  color={color} 
                  transparent 
                  opacity={opacity * 0.7}
                />
              </mesh>
            ))}
          </group>
        );
        
      case 'spreading_cloud':
        return (
          <mesh position={[0, 0, -10]}>
            <sphereGeometry args={[5 + progress * 10, 16, 16]} />
            <meshBasicMaterial 
              color="#44ff44"
              transparent 
              opacity={opacity * 0.4}
            />
          </mesh>
        );
        
      case 'glitch_zones':
        const time = Date.now() * 0.001;
        return (
          <group>
            {[...Array(6)].map((_, i) => (
              <mesh 
                key={i}
                position={[
                  Math.sin(time * 3 + i) * 8,
                  Math.cos(time * 2 + i * 0.7) * 5,
                  -8 - i * 2
                ]}
              >
                <boxGeometry args={[3, 3, 0.5]} />
                <meshBasicMaterial 
                  color={i % 2 ? '#ff00ff' : '#00ffff'}
                  transparent 
                  opacity={opacity}
                />
              </mesh>
            ))}
          </group>
        );
        
      case 'multi_phase':
        return (
          <group>
            {/* Phase 1: Outer ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[18, 20, 32]} />
              <meshBasicMaterial 
                color="#ff0000"
                transparent 
                opacity={progress < 0.33 ? opacity : opacity * 0.3}
                side={2}
              />
            </mesh>
            {/* Phase 2: Cross pattern */}
            <group rotation={[0, 0, progress * Math.PI]}>
              <mesh>
                <boxGeometry args={[40, 2, 0.5]} />
                <meshBasicMaterial 
                  color="#ff8800"
                  transparent 
                  opacity={progress >= 0.33 && progress < 0.66 ? opacity : opacity * 0.2}
                />
              </mesh>
              <mesh>
                <boxGeometry args={[2, 40, 0.5]} />
                <meshBasicMaterial 
                  color="#ff8800"
                  transparent 
                  opacity={progress >= 0.33 && progress < 0.66 ? opacity : opacity * 0.2}
                />
              </mesh>
            </group>
            {/* Phase 3: Center blast */}
            <mesh>
              <sphereGeometry args={[progress >= 0.66 ? 12 * (progress - 0.66) * 3 : 0, 16, 16]} />
              <meshBasicMaterial 
                color="#ffff00"
                transparent 
                opacity={progress >= 0.66 ? 0.6 : 0}
              />
            </mesh>
          </group>
        );
        
      default:
        return (
          <mesh>
            <boxGeometry args={[5, 5, 5]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={opacity}
            />
          </mesh>
        );
    }
  };
  
  return (
    <group ref={ref} position={position} rotation={rotation}>
      {renderZone()}
    </group>
  );
}

// ============================================================================
// ATTACK INDICATOR COMPONENT
// ============================================================================
function AttackIndicator({ 
  type, 
  progress, 
  phase,
  bossPosition = [0, 0, 0],
}) {
  const ref = useRef();
  
  useFrame((state) => {
    if (!ref.current) return;
    
    // Animate indicators
    if (type === 'laser_charge') {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 10) * 0.1);
    }
  });
  
  if (phase !== ATTACK_PHASE.TELEGRAPH) return null;
  
  const renderIndicator = () => {
    switch (type) {
      case 'laser_charge':
        return (
          <group position={[0, 0, -2]}>
            <mesh>
              <sphereGeometry args={[0.5 + progress * 1.5, 16, 16]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
            <pointLight color="#ff0000" intensity={5 * progress} distance={10} />
          </group>
        );
        
      case 'lock_on':
        return (
          <group>
            {[...Array(5)].map((_, i) => (
              <mesh 
                key={i}
                position={[
                  Math.sin(i * 1.25 + progress * 5) * 3,
                  Math.cos(i * 1.25 + progress * 5) * 2,
                  -3
                ]}
                rotation={[0, 0, progress * Math.PI * 2]}
              >
                <ringGeometry args={[0.3, 0.5, 4]} />
                <meshBasicMaterial color="#ff0000" />
              </mesh>
            ))}
          </group>
        );
        
      case 'leg_raise':
        return (
          <group position={[0, 2 * progress, 0]}>
            <mesh>
              <boxGeometry args={[1, 3, 1]} />
              <meshStandardMaterial color="#666666" emissive="#ff4400" emissiveIntensity={progress} />
            </mesh>
          </group>
        );
        
      case 'frost_buildup':
        return (
          <group position={[0, 0, -2]}>
            <mesh>
              <icosahedronGeometry args={[1 + progress, 1]} />
              <meshStandardMaterial 
                color="#88ccff" 
                emissive="#4488ff" 
                emissiveIntensity={progress}
                transparent
                opacity={0.7}
              />
            </mesh>
            <pointLight color="#88ccff" intensity={3 * progress} distance={8} />
          </group>
        );
        
      case 'heat_buildup':
        return (
          <group>
            <mesh scale={1 + progress * 0.5}>
              <sphereGeometry args={[2, 16, 16]} />
              <meshBasicMaterial 
                color={new Color().lerpColors(
                  new Color('#ff4400'),
                  new Color('#ffffff'),
                  progress
                )}
                transparent
                opacity={0.6 + progress * 0.4}
              />
            </mesh>
            <pointLight 
              color="#ffaa00" 
              intensity={10 * progress} 
              distance={15}
            />
          </group>
        );
        
      case 'power_surge':
        return (
          <group>
            {/* Energy rings */}
            {[...Array(3)].map((_, i) => (
              <mesh 
                key={i}
                rotation={[Math.PI / 2, 0, progress * Math.PI * (i + 1)]}
                position={[0, 0, -i * 2]}
              >
                <ringGeometry args={[2 + i, 2.5 + i, 6]} />
                <meshBasicMaterial 
                  color={['#ff0000', '#ff8800', '#ffff00'][i]}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            ))}
            <pointLight 
              color="#ff4400" 
              intensity={15 * progress} 
              distance={20}
            />
          </group>
        );
        
      default:
        return (
          <mesh>
            <sphereGeometry args={[0.5 + progress, 8, 8]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.5 + progress * 0.5} />
          </mesh>
        );
    }
  };
  
  return (
    <group ref={ref} position={bossPosition}>
      {renderIndicator()}
    </group>
  );
}

// ============================================================================
// WEAK POINT COMPONENT
// ============================================================================
function WeakPoint({ 
  position, 
  isVulnerable, 
  onHit,
  size = BOSS_CONFIG.WEAK_POINT_SIZE,
}) {
  const ref = useRef();
  const [hitFlash, setHitFlash] = useState(false);
  
  useFrame((state) => {
    if (!ref.current) return;
    
    if (isVulnerable) {
      ref.current.rotation.y += 0.02;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });
  
  const handleHit = useCallback(() => {
    if (!isVulnerable) return;
    
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), BOSS_CONFIG.DAMAGE_FLASH_DURATION);
    onHit?.();
  }, [isVulnerable, onHit]);
  
  return (
    <group ref={ref} position={position}>
      <mesh onClick={handleHit}>
        <octahedronGeometry args={[size, 0]} />
        <meshStandardMaterial
          color={hitFlash ? '#ffffff' : isVulnerable ? '#ff0000' : '#880000'}
          emissive={isVulnerable ? '#ff4400' : '#220000'}
          emissiveIntensity={isVulnerable ? 0.8 : 0.2}
        />
      </mesh>
      {isVulnerable && (
        <pointLight color="#ff0000" intensity={2} distance={5} />
      )}
    </group>
  );
}

// ============================================================================
// BOSS MESH COMPONENT (Placeholder)
// ============================================================================
function BossMesh({ 
  position,
  rotation = [0, 0, 0],
  scale = 1,
  phase,
  currentAttack,
  healthPercent,
  isHit,
}) {
  const ref = useRef();
  const [animOffset, setAnimOffset] = useState(0);
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Idle hover animation
    setAnimOffset(Math.sin(state.clock.elapsedTime * 2) * 0.3);
    
    // Shake during attack execution
    if (phase === ATTACK_PHASE.EXECUTING) {
      ref.current.position.x = position[0] + (Math.random() - 0.5) * 0.3;
      ref.current.position.y = position[1] + animOffset + (Math.random() - 0.5) * 0.3;
    } else {
      ref.current.position.x = position[0];
      ref.current.position.y = position[1] + animOffset;
    }
  });
  
  // Color based on state
  const getColor = () => {
    if (isHit) return '#ffffff';
    if (phase === ATTACK_PHASE.TELEGRAPH) return '#ff8844';
    if (phase === ATTACK_PHASE.EXECUTING) return '#ff0000';
    if (healthPercent < 0.25) return '#ff4444';
    if (healthPercent < 0.5) return '#ffaa44';
    return '#8844ff';
  };
  
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      {/* Main body - placeholder cube */}
      <mesh>
        <boxGeometry args={[BOSS_CONFIG.BOSS_SIZE, BOSS_CONFIG.BOSS_SIZE, BOSS_CONFIG.BOSS_SIZE]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={phase === ATTACK_PHASE.EXECUTING ? 0.5 : 0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[BOSS_CONFIG.BOSS_SIZE * 0.4, 16, 16]} />
        <meshBasicMaterial
          color={phase === ATTACK_PHASE.EXECUTING ? '#ff0000' : '#ff44ff'}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Decorative elements */}
      <mesh position={[BOSS_CONFIG.BOSS_SIZE * 0.6, 0, 0]}>
        <boxGeometry args={[1, 3, 1]} />
        <meshStandardMaterial color="#444488" metalness={0.8} />
      </mesh>
      <mesh position={[-BOSS_CONFIG.BOSS_SIZE * 0.6, 0, 0]}>
        <boxGeometry args={[1, 3, 1]} />
        <meshStandardMaterial color="#444488" metalness={0.8} />
      </mesh>
      
      {/* Eye/sensor */}
      <mesh position={[0, 0, BOSS_CONFIG.BOSS_SIZE * 0.5 + 0.1]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={phase === ATTACK_PHASE.IDLE ? '#00ff00' : '#ff0000'} />
        <pointLight 
          color={phase === ATTACK_PHASE.IDLE ? '#00ff00' : '#ff0000'} 
          intensity={2} 
          distance={10} 
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// BOSS HP BAR UI COMPONENT
// ============================================================================
function BossHPBar({ 
  currentHP, 
  maxHP, 
  bossName = 'BOSS',
  phase,
  currentAttack,
}) {
  const healthPercent = (currentHP / maxHP) * 100;
  const isLowHealth = healthPercent < 25;
  const isCritical = healthPercent < 10;
  
  return (
    <div style={{
      position: 'absolute',
      top: 30,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '60%',
      maxWidth: 600,
      fontFamily: '"Courier New", monospace',
      color: '#ffffff',
      textShadow: '0 0 10px #000000',
      pointerEvents: 'none',
    }}>
      {/* Boss Name */}
      <div style={{
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff4444',
        textShadow: '0 0 20px #ff0000',
        marginBottom: 8,
        letterSpacing: 4,
      }}>
        {bossName}
      </div>
      
      {/* HP Bar Container */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        border: `2px solid ${isCritical ? '#ff0000' : isLowHealth ? '#ff8800' : '#ff4444'}`,
        borderRadius: 4,
        padding: 4,
        boxShadow: isCritical 
          ? '0 0 20px #ff0000, inset 0 0 10px rgba(255,0,0,0.3)' 
          : '0 0 10px rgba(255,68,68,0.5)',
      }}>
        {/* HP Fill */}
        <div style={{
          height: 20,
          background: `linear-gradient(90deg, 
            ${isCritical ? '#ff0000' : isLowHealth ? '#ff4400' : '#ff2222'} 0%, 
            ${isCritical ? '#ff4444' : isLowHealth ? '#ff8844' : '#ff6666'} 100%)`,
          width: `${healthPercent}%`,
          transition: 'width 0.3s ease-out',
          borderRadius: 2,
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)',
        }} />
      </div>
      
      {/* HP Text */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 4,
        fontSize: 12,
      }}>
        <span>{Math.ceil(currentHP)} / {maxHP}</span>
        <span style={{ color: isCritical ? '#ff0000' : isLowHealth ? '#ff8800' : '#888888' }}>
          {healthPercent.toFixed(1)}%
        </span>
      </div>
      
      {/* Attack Status */}
      {phase !== ATTACK_PHASE.IDLE && currentAttack && (
        <div style={{
          textAlign: 'center',
          marginTop: 10,
          padding: '8px 16px',
          background: phase === ATTACK_PHASE.TELEGRAPH 
            ? 'rgba(255, 136, 0, 0.3)' 
            : 'rgba(255, 0, 0, 0.3)',
          border: `1px solid ${phase === ATTACK_PHASE.TELEGRAPH ? '#ff8800' : '#ff0000'}`,
          borderRadius: 4,
          animation: phase === ATTACK_PHASE.TELEGRAPH ? 'pulse 0.5s infinite' : 'none',
        }}>
          <div style={{ 
            fontSize: 14, 
            fontWeight: 'bold',
            color: phase === ATTACK_PHASE.TELEGRAPH ? '#ffaa00' : '#ff4444',
          }}>
            {phase === ATTACK_PHASE.TELEGRAPH ? '⚠ WARNING' : '💥 ATTACKING'}
          </div>
          <div style={{ fontSize: 18, marginTop: 4 }}>
            {currentAttack.name}
          </div>
          {phase === ATTACK_PHASE.TELEGRAPH && (
            <div style={{ fontSize: 11, marginTop: 4, color: '#88ff88' }}>
              EVADE: {currentAttack.evasionDirection.toUpperCase()}
            </div>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EVASION PROMPT UI
// ============================================================================
function EvasionPrompt({ currentAttack, phase, progress }) {
  if (phase !== ATTACK_PHASE.TELEGRAPH) return null;
  
  const isInWindow = progress >= BOSS_CONFIG.EVASION_WINDOW_START && 
                     progress <= BOSS_CONFIG.EVASION_WINDOW_END;
  
  const getDirectionIcon = () => {
    switch (currentAttack?.evasionDirection) {
      case 'up': return '⬆';
      case 'down': return '⬇';
      case 'horizontal': return '⬅ ➡';
      case 'vertical': return '⬆ ⬇';
      case 'barrel_roll': return '🔄';
      case 'retreat': return '⬅⬅';
      case 'weave': return '↔';
      default: return '⚡';
    }
  };
  
  return (
    <div style={{
      position: 'absolute',
      bottom: 150,
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      fontFamily: '"Courier New", monospace',
      pointerEvents: 'none',
    }}>
      {/* Direction indicator */}
      <div style={{
        fontSize: 48,
        color: isInWindow ? '#00ff00' : '#ffaa00',
        textShadow: isInWindow ? '0 0 30px #00ff00' : '0 0 20px #ffaa00',
        animation: isInWindow ? 'bounce 0.3s infinite' : 'none',
      }}>
        {getDirectionIcon()}
      </div>
      
      {/* Timing bar */}
      <div style={{
        width: 200,
        height: 10,
        background: 'rgba(0,0,0,0.5)',
        border: '2px solid #888',
        borderRadius: 5,
        margin: '10px auto',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Optimal window zone */}
        <div style={{
          position: 'absolute',
          left: `${BOSS_CONFIG.EVASION_WINDOW_START * 100}%`,
          width: `${(BOSS_CONFIG.EVASION_WINDOW_END - BOSS_CONFIG.EVASION_WINDOW_START) * 100}%`,
          height: '100%',
          background: 'rgba(0, 255, 0, 0.3)',
        }} />
        
        {/* Progress indicator */}
        <div style={{
          position: 'absolute',
          left: `${progress * 100}%`,
          top: -2,
          width: 4,
          height: 14,
          background: isInWindow ? '#00ff00' : '#ffffff',
          borderRadius: 2,
          boxShadow: isInWindow ? '0 0 10px #00ff00' : 'none',
        }} />
      </div>
      
      {isInWindow && (
        <div style={{
          fontSize: 20,
          color: '#00ff00',
          fontWeight: 'bold',
          textShadow: '0 0 15px #00ff00',
        }}>
          DODGE NOW!
        </div>
      )}
      
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MAIN BOSS ATTACK CONTROLLER HOOK
// ============================================================================
function useBossAttackController({
  bossLevel = 1,
  maxHP = BOSS_CONFIG.BASE_HP,
  onBossDefeated,
  onPlayerHit,
  playerIsInvulnerable = false,
}) {
  const [currentHP, setCurrentHP] = useState(maxHP);
  const [phase, setPhase] = useState(ATTACK_PHASE.IDLE);
  const [currentAttack, setCurrentAttack] = useState(null);
  const [attackProgress, setAttackProgress] = useState(0);
  const [isHit, setIsHit] = useState(false);
  
  const attackTimerRef = useRef(null);
  const phaseTimerRef = useRef(null);
  const attackStartTimeRef = useRef(0);
  const currentPhaseDurationRef = useRef(0);
  
  const attacks = useMemo(() => getAttacksForBoss(bossLevel), [bossLevel]);
  
  const healthPercent = currentHP / maxHP;
  
  // Damage the boss
  const damageBoss = useCallback((amount) => {
    setIsHit(true);
    setTimeout(() => setIsHit(false), BOSS_CONFIG.DAMAGE_FLASH_DURATION);
    
    setCurrentHP(prev => {
      const newHP = Math.max(0, prev - amount);
      if (newHP <= 0) {
        onBossDefeated?.();
      }
      return newHP;
    });
  }, [onBossDefeated]);
  
  // Start an attack sequence
  const startAttack = useCallback((attack) => {
    setCurrentAttack(attack);
    setPhase(ATTACK_PHASE.TELEGRAPH);
    attackStartTimeRef.current = Date.now();
    currentPhaseDurationRef.current = attack.telegraphDuration;
    
    // Transition to execution phase
    phaseTimerRef.current = setTimeout(() => {
      setPhase(ATTACK_PHASE.EXECUTING);
      attackStartTimeRef.current = Date.now();
      currentPhaseDurationRef.current = attack.executeDuration;
      
      // Check if player should be hit (if not invulnerable and didn't dodge)
      const hitCheckDelay = attack.executeDuration * 0.3;
      setTimeout(() => {
        if (!playerIsInvulnerable) {
          onPlayerHit?.(attack.damage);
        }
      }, hitCheckDelay);
      
      // Transition to recovery phase
      phaseTimerRef.current = setTimeout(() => {
        setPhase(ATTACK_PHASE.RECOVERY);
        attackStartTimeRef.current = Date.now();
        currentPhaseDurationRef.current = attack.recoveryDuration;
        
        // Return to idle
        phaseTimerRef.current = setTimeout(() => {
          setPhase(ATTACK_PHASE.IDLE);
          setCurrentAttack(null);
          setAttackProgress(0);
          
          // Schedule next attack
          scheduleNextAttack();
        }, attack.recoveryDuration);
        
      }, attack.executeDuration);
      
    }, attack.telegraphDuration);
    
  }, [playerIsInvulnerable, onPlayerHit]);
  
  // Schedule the next attack
  const scheduleNextAttack = useCallback(() => {
    if (currentHP <= 0) return;
    
    const delay = calculateNextAttackDelay(healthPercent);
    
    attackTimerRef.current = setTimeout(() => {
      // Weight unique attack higher when below 50% health
      const attackPool = attacks.all;
      const weights = attackPool.map(atk => {
        if (atk.type === 'unique' && healthPercent < 0.5) return 2;
        return 1;
      });
      
      const selectedAttack = selectRandomAttack(attackPool, weights);
      startAttack(selectedAttack);
    }, delay);
    
  }, [attacks, healthPercent, currentHP, startAttack]);
  
  // Force a specific attack (for scripted sequences)
  const forceAttack = useCallback((attackId) => {
    const attack = ATTACK_REGISTRY[attackId];
    if (attack) {
      clearTimeout(attackTimerRef.current);
      clearTimeout(phaseTimerRef.current);
      startAttack(attack);
    }
  }, [startAttack]);
  
  // Update attack progress
  useFrame(() => {
    if (phase !== ATTACK_PHASE.IDLE && currentPhaseDurationRef.current > 0) {
      const elapsed = Date.now() - attackStartTimeRef.current;
      setAttackProgress(Math.min(1, elapsed / currentPhaseDurationRef.current));
    }
  });
  
  // Initialize attack cycle
  useEffect(() => {
    scheduleNextAttack();
    
    return () => {
      clearTimeout(attackTimerRef.current);
      clearTimeout(phaseTimerRef.current);
    };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(attackTimerRef.current);
      clearTimeout(phaseTimerRef.current);
    };
  }, []);
  
  return {
    currentHP,
    maxHP,
    healthPercent,
    phase,
    currentAttack,
    attackProgress,
    isHit,
    damageBoss,
    forceAttack,
    attacks: attacks.all,
  };
}

// ============================================================================
// BOSS FIGHT SCENE COMPONENT
// ============================================================================
function BossFightScene({
  bossLevel = 1,
  bossName = 'BOSS',
  bossPosition = [0, 0, -20],
  maxHP = BOSS_CONFIG.BASE_HP,
  weakPoints = [[0, 2, -18]],
  onBossDefeated,
  onPlayerHit,
  playerIsInvulnerable = false,
  playerPosition = [0, 0, 0],
}) {
  const {
    currentHP,
    healthPercent,
    phase,
    currentAttack,
    attackProgress,
    isHit,
    damageBoss,
  } = useBossAttackController({
    bossLevel,
    maxHP,
    onBossDefeated,
    onPlayerHit,
    playerIsInvulnerable,
  });
  
  const handleWeakPointHit = useCallback(() => {
    damageBoss(50); // Weak point deals extra damage
  }, [damageBoss]);
  
  return (
    <>
      {/* Dark void background lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 10, -10]} intensity={0.5} color="#4444ff" />
      <pointLight position={bossPosition} intensity={1} color="#ff4444" distance={30} />
      
      {/* Boss mesh */}
      <BossMesh
        position={bossPosition}
        phase={phase}
        currentAttack={currentAttack}
        healthPercent={healthPercent}
        isHit={isHit}
      />
      
      {/* Weak points */}
      {weakPoints.map((pos, i) => (
        <WeakPoint
          key={i}
          position={pos}
          isVulnerable={phase === ATTACK_PHASE.RECOVERY}
          onHit={handleWeakPointHit}
        />
      ))}
      
      {/* Attack indicator */}
      {currentAttack && (
        <AttackIndicator
          type={currentAttack.indicator}
          progress={attackProgress}
          phase={phase}
          bossPosition={bossPosition}
        />
      )}
      
      {/* Danger zone */}
      {currentAttack && (phase === ATTACK_PHASE.TELEGRAPH || phase === ATTACK_PHASE.EXECUTING) && (
        <DangerZone
          type={currentAttack.dangerZone}
          progress={attackProgress}
          phase={phase}
          position={[0, 0, -10]}
        />
      )}
      
      {/* HUD */}
      <Html fullscreen>
        <BossHPBar
          currentHP={currentHP}
          maxHP={maxHP}
          bossName={bossName}
          phase={phase}
          currentAttack={currentAttack}
        />
        <EvasionPrompt
          currentAttack={currentAttack}
          phase={phase}
          progress={attackProgress}
        />
      </Html>
    </>
  );
}

// ============================================================================
// MAIN EXPORT COMPONENT
// ============================================================================
export default function BossAttackController({
  bossLevel = 1,
  bossName = 'LEVEL BOSS',
  onBossDefeated,
  onPlayerHit,
}) {
  const [playerState, setPlayerState] = useState({
    position: [0, 0, 0],
    isInvulnerable: false,
  });
  
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 75 }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={['#000000', 30, 80]} />
        <BossFightScene
          bossLevel={bossLevel}
          bossName={bossName}
          onBossDefeated={onBossDefeated}
          onPlayerHit={onPlayerHit}
          playerIsInvulnerable={playerState.isInvulnerable}
          playerPosition={playerState.position}
        />
      </Canvas>
    </div>
  );
}

// ============================================================================
// NAMED EXPORTS FOR INTEGRATION
// ============================================================================
export {
  // Main components
  BossFightScene,
  BossMesh,
  BossHPBar,
  WeakPoint,
  DangerZone,
  AttackIndicator,
  EvasionPrompt,
  
  // Hooks
  useBossAttackController,
  
  // Configuration
  BOSS_CONFIG,
  ATTACK_PHASE,
  ATTACK_REGISTRY,
  COMMON_ATTACKS,
  UNIQUE_ATTACKS,
  
  // Utilities
  getAttacksForBoss,
  selectRandomAttack,
  calculateNextAttackDelay,
};
