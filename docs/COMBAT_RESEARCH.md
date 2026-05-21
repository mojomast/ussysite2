# Combat Research

## Confirmed Current State

- The requested `/home/mojo/projects/ussysite2/app.js` file does not exist. The real combat implementation is currently in `js/main.js`; `js/flight/combat.js`, `js/flight/mission.js`, and `js/flight/state.js` look like partial extraction stubs rather than the active game logic.
- `js/flight/combat.js:1-15` exports combat arrays and empty functions only. It does not contain live combat behavior.
- `js/flight/state.js:1-62` exports a reduced `flightState`, pool limits, and mission message state, but it lacks several active runtime fields present in `js/main.js`, including yaw, pitch, roll, timers, cooldowns, energy costs, status text, and audio flags.
- `js/flight/mission.js:4-18` is mostly empty stubs. It only has a real `restockAtProject()` bridge to trader fuel state.
- `js/main.js:90-135` defines the active `flightState`: score, shield, armor, energy, ammo, missiles, fuel, timers, navigation, status, movement tuning, `fireCooldown: 140`, `missileCooldown: 900`, `laserEnergyCost: 2.5`, `missileEnergyCost: 18`, and `enemyFireCooldown: 1500`.
- `js/main.js:137-146` defines active pools and limits: `enemies`, `playerBullets`, `enemyBullets`, `playerMissiles`, `maxEnemies = 7`, `maxPlayerBullets = 32`, `maxEnemyBullets = 28`, `maxPlayerMissiles = 8`, `maxPlayerAmmo = 240`, and `maxPlayerMissilesStored = 8`.
- `js/main.js:1106-1222` creates the game objects: player ship mesh group, seven pooled enemy groups, player bullet pool, enemy bullet pool, missile pool, and nav line.
- Enemies are pooled `THREE.Group` objects with wireframe geometry and `userData` initialized as `{ active: false, health: 1, cooldown, radius: 0.62 }` at `js/main.js:1156-1175`.
- `spawnEnemy()` at `js/main.js:2370-2385` spawns enemies around the player, resets `health` to `1`, assigns `spawnDelay`, and randomizes fire cooldown.
- Player primary fire at `js/main.js:2963-2976` is not a pure overheat weapon. It requires ammo, energy, and cooldown; successful shots consume `1` ammo and `2.5` energy.
- Player missiles at `js/main.js:2977-2992` require missile stock, energy, and cooldown; successful launches consume `1` missile and `18` energy.
- Energy regenerates passively at `18 * dt` up to `100` in `js/main.js:2923-2929`.
- Combat update at `js/main.js:3053-3130` moves projectiles, moves enemies toward the player, fires enemy bullets within range, checks collisions, applies score, respawns enemies, and handles hull breach reset.
- Enemy health is currently not meaningful in collision resolution. A player bullet immediately awards `+1` and destroys/respawns the enemy; a missile awards `+2` and destroys/respawns the enemy at `js/main.js:3085-3119`.
- `applyPlayerDamage()` at `js/main.js:3132-3151` is shield-first damage. Shield absorbs all damage until depleted; leftover damage hits armor. There is no shield regeneration, regen delay, active bleedthrough while shields remain, damage resistance, or invulnerability window.
- Restocking at a project fully restores shield, armor, ammo, missiles, energy, fuel, thrust, and strafe through `restockAtProject()` at `js/main.js:2344-2361`.
- The previous notes claiming no `traderState` exists are now wrong. `js/main.js:3` imports `traderState`, docking/refuel behavior uses it around `js/main.js:2322-2361`, and bounty rewards add credits at `js/main.js:2295-2305`.
- No separate user-provided combat bullets were included with this request, so these notes verify the real code state against the requested topics and correct the stale `app.js` assumption.

## Enemy Archetypes

Arcade space shooters usually work best when enemy classes have distinct readable jobs rather than only bigger numbers.

| Archetype | Role | Typical Stats | Behavior Notes |
| --- | --- | --- | --- |
| Scout | Harasser and tutorial target | 1 health, very fast, low damage, low reward | Enters quickly, dies quickly, pressures aim without punishing hard. |
| Fighter | Baseline dogfighter | 2-4 health, medium speed, medium fire rate, medium reward | Main enemy. Circles, pursues, and trades shots predictably. |
| Gunboat | Slow pressure platform | 6-10 health, slow speed, high armor, burst fire, higher reward | Forces target priority. Should telegraph salvos and be easy to track. |
| Elite | Skill check variant | 8-14 health, high speed, high accuracy, high reward | Uses better aim, evasive movement, shields, or limited missiles. Spawn sparingly. |
| Boss | Mission climax | Large phased health, mixed weapons, unique reward | Uses patterns, weak points, adds, and phase transitions rather than only huge health. |

For the current codebase, archetypes can be plain data assigned into `enemy.userData`: class id, max health, current health, speed, engage range, fire cooldown range, bullet speed, damage, score reward, radius, and optional color/scale. The smallest useful first step is making `health` real and letting bullets/missiles apply damage instead of instant kills.

## Overheat Vs Ammo Cooldown

- Ammo is concrete and supports the existing restock loop: lasers use `ammo`, missiles use `missiles`, and docking restores both. It makes landing matter.
- Cooldown is already present: lasers have a `140ms` gate and missiles have a `900ms` gate. This prevents input spam but does not create burst management by itself.
- Energy already behaves like a soft heat/power budget because shots spend energy and energy regenerates over time.
- A full overheat model is good for 3D browser dogfights because it avoids hard failure far from docks and rewards burst discipline. It needs strong HUD/audio feedback or it feels arbitrary.
- Best fit here is hybrid: keep ammo/missiles for restock economy, keep energy as power cost, and optionally add laser heat only for sustained primary fire. Heat should rise per shot, cool when not firing, and briefly lock firing only at maximum heat.

## Shields And Bleedthrough

- Current shields are simple hit points in front of armor. There is no regen delay, regen rate, or bleedthrough.
- Standard arcade shield regen is: record the last damage time, wait a short delay after damage, then regenerate shield per second until full.
- Good starting numbers for this game style: 2.5-4 second regen delay, 8-15 shield per second, no regen while shield is taking damage.
- Bleedthrough keeps armor relevant. A simple model is 10-20% of incoming damage always hits armor, while the rest hits shield. A gentler model only bleeds through heavy hits, rams, missiles, or boss weapons.
- Avoid long control stun. Use hit flash, shield shimmer, brief camera impulse, or bark audio instead of taking movement away from the player.

## Hardpoints And Power Budgets

- The current player ship already has visible cannon geometry at four wing/layer positions in `js/main.js:1132-1147`, so hardpoints can map naturally to fixed local offsets.
- Fixed hardpoints are easiest first: left/right primary cannons, optional upper/lower pair, and one missile rack. Fire can alternate hardpoints or fire paired shots.
- A power budget gives loadouts tradeoffs without simulating a full space sim: ship has `powerCapacity`; weapons/modules have `powerDraw`; total draw must fit capacity or lower-priority modules are disabled.
- Useful module categories: primary weapon, missile rack, shield booster, armor plating, reactor, engine tuner, radar extender, cargo pod.
- Keep derived combat stats separate from base state. Recompute derived cooldowns, energy costs, damage, regen, and capacity after loadout or skill changes rather than inside every projectile collision.

## Plain-JS Skill Tree

- Use a plain object or array for skill definitions: id, label, description, cost, max rank, requirements, and effects.
- Store player progress separately: available points and current ranks by skill id.
- A skill is available when its prerequisites are met, it is below max rank, and the player has enough points.
- Effects should be data, not custom functions when possible: laser damage percent, energy cost reduction, shield regen rate, missile capacity, enemy reward multiplier, heat capacity, or hardpoint unlock.
- After a purchase, rebuild a `derivedStats` object from base stats plus skill effects. Combat should read derived stats for damage, cooldowns, regen, energy costs, and rewards.
- No framework is needed. Render skill nodes with DOM buttons, apply disabled/available/unlocked classes, and attach click handlers that call purchase and rerender.
- Persistence should only be added when progression needs to survive reloads. If added, save the small progress object to local storage or backend state, not the whole `flightState`.

## Adrenaline And Tension

- Screen effects should communicate state before becoming decoration: shield hit flash, low-shield vignette, armor warning flicker, missile lock tone, boost streaks, and subtle chromatic/noise overlays.
- Audio should scale with danger: faster combat barks, shield warning tones, higher engine pitch during boost, muffled ambience during heavy damage, and short kill-confirm stingers.
- Time scaling can add punch but must be tiny in 3D flight. Use 50-120ms hit-stop on major kills or impacts; avoid long slow motion because it can cause disorientation and input mismatch.
- A tension meter can drive presentation without changing core physics. Increase it for nearby enemies, incoming shots, low shields, low ammo, active mission objectives, and recent damage; decay it after safety.
- Use the tension meter to blend HUD intensity, audio filters, camera shake, and bark frequency. Keep the actual flight controls stable unless the design explicitly wants adrenaline to affect handling.

## Recommended Next Combat Direction

- Treat `js/main.js` as the source of truth until the extracted `js/flight/*` modules are wired into the app.
- Add enemy archetype data before adding new visuals. Make health, damage, and score reward real first.
- Add shield regen delay and optional small bleedthrough next because it deepens survivability without changing the control scheme.
- Preserve object pools and simple `userData` mutation. It matches the current performance-friendly browser architecture.
- Add hardpoints and heat as incremental extensions to the existing ammo, energy, and cooldown system rather than replacing the whole weapon loop at once.
