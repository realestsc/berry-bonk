# 🐻 Berry Bonk – Game Plan Summary

**Engine**: Three.js  
**Game Type**: 3D third-person arena action game  
**Player**: Bearish – a cute bear with a giant hammer  
**Goal**: Bonk enemies, collect red/blue berries, upgrade hammers

---

## 🎮 Core Gameplay

- Bearish moves around a 3D arena using **WASD** and attacks with a **giant hammer** (`click` or `spacebar`).
- Enemies spawn in waves and **drop berries** when defeated:
  - **Red berries** = Score
  - **Blue berries** = Currency for upgrades

---

## 👾 Enemies

### 🐍 Snakes
- Slither along the ground in curving paths
- Deal damage on contact

### 🐇 Rabbits
- Jump unpredictably with pauses
- Deal damage when landing near/on Bearish

### 🐿️ Squirrels
- Dash between points
- Throw **nut projectiles** that deal damage
- Also deal damage on contact

All enemies damage Bearish via **collision**, and **squirrels** also via **projectiles**.

---

## ❤️ Health & Combat

- Bearish has a **health bar**
- Enemies or nut projectiles reduce health
- **Bonking** enemies defeats them (1–2 hits)
- Defeated enemies **explode into particles** and **drop red or blue berries**

---

## ✨ Power-Up: Golden Fish

- Spawns occasionally in the arena
- Collecting it makes Bearish **invincible for 60 seconds**
- While active:
  - No damage taken from enemies or projectiles
  - Glowing visual aura or trail
  - Health bar is protected or glows

---

## 🛠️ Hammer Upgrade System

**Blue berries** are used to purchase **new hammers** with enhanced abilities:

| Hammer Name      | Effect                                | Cost (Blue Berries) |
|------------------|----------------------------------------|----------------------|
| Spiked Hammer     | Wider arc, chance to **stun** enemies | 10                   |
| Honey Slammer     | Slow swing, **AoE splash** damage     | 20                   |
| Nutcracker        | Faster swings, **reflects nuts**      | 30                   |
| Golden Bonker     | Powerful slam, **knockback AoE**      | 50                   |

- Upgrades are purchased at a **station** (e.g. stump or tent)
- UI allows preview of hammer stats and costs

---

## 📦 Summary of Components

- **Bearish character controller**
- **Enemy AI** with unique movement + collision
- **Berry drop system**
- **Power-up logic** (Golden Fish timer)
- **Health tracking**
- **Upgrade system** using blue berries
- **Basic UI** for health, berry counts, and upgrade store

---
