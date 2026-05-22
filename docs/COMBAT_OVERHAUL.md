# Combat Overhaul

## Enemy Classes

| Class | HP | Shield Pips | Fire Rate | Burst | Reward | Role |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Audit Probe | 1 | 0 | 2200ms | 1 | 40CR / 8XP | OPENCLAWSSY policy chaff. Bad aim, low threat. |
| Swarm Specialist | 2 | 0 | 750ms | 2 | 140CR / 28XP | Fast SWARMUSSY tunnel-vision attacker. |
| DevPlan Enforcer | 5 | 4 | 700ms | 4 | 320CR / 70XP | Slow checklist siege platform with precise bursts. |
| Nexussy Operator | 3 | 2 | 520ms | 3 | 520CR / 120XP | Sanctioned ace with high accuracy and evasion. |
| HERMES-Dreadnought | 15 | 14 | 420ms | 6 | 1100CR / 250XP | End-game telemetry cruiser. |
| Phantom Process | 2 | 0 | 1100ms | 1 | 380CR / 85XP | Semi-transparent orphan process with top-tier evasion. |

## Weapon Loadout

| Weapon | Slot | Damage | Cooldown | Energy | Heat | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| STANDARD PULSE | Primary | 10 | 120ms | 2.5 | 8 | Entry weapon, fastest fire rate. |
| PHASE LANCE | Primary | 28 | 280ms | 5.5 | 14 | Hard single shot that rewards aim. |
| FRAG DISPERSAL | Primary | 10 x5 | 320ms | 7 | 22 | Close-range cluster shredder. |
| MASS DRIVER | Primary | 75 | 2200ms | 28 | 45 | Long-range sniper shot. |
| SEEKING PAYLOAD | Secondary | 65 | 1100ms | 20 | 0 | Reliable homing backup. |
| TWIN SEEKER | Secondary | 60 x2 | 1600ms | 32 | 0 | Expensive burst kill option. |
| SYSTEM DISRUPTOR | Secondary | 8 AoE | 3800ms | 28 | 0 | 22u EMP with 2200ms stun. |

## Skill Tree

```text
HULL:    hull_1 -> hull_2 -> hull_3 -> hull_4 -> hull_5
SHIELD:  shield_1 -> shield_2 -> shield_3 -> shield_4 -> shield_5
WEAPONS: weap_1 -> weap_3 -> weap_4 -> weap_5
         weap_2
ENGINES: eng_1 -> eng_2 -> eng_3 -> eng_4 -> eng_5
```

Tier 5 skills add build identity: Point Defense Grid blocks 20% of enemy bullets, Mirror Protocol reflects shielded hits into nearby enemies, Ghost Round bypasses evasion 15% of the time, and Cold Jump teleports 40 units forward on `F` with a 25s cooldown.

## Heat And Overheat

Primary weapons add heat per shot. Heat cools by `12/s`. At or above max heat, primary weapons are offline until heat cools to zero. Heat sinks raise max heat from `100` to `130`.

## Shield Bleedthrough

Damage records `lastHitAt`, interrupts regen, and raises adrenaline. Shields above 25 absorb direct damage. Low shields destabilize: armor takes 35% of the hit, modified by reactive armor, while shields absorb the burst impact.

## Difficulty Tiers

| Score | Tier | Classes |
| ---: | ---: | --- |
| `< 1` | 0 | Tutorial scouts only. |
| `< 200` | 1 | Audit Probes. |
| `< 800` | 2 | Audit Probes, Swarm Specialists. |
| `< 3000` | 3 | Audit Probes, Swarm Specialists, DevPlan Enforcers, Nexussy Operators. |
| `>= 3000` | 4 | All classes including HERMES-Dreadnoughts and Phantom Processes. |

Past tier 4, `getDifficultyMultiplier(score)` scales enemy fire cooldown and accuracy from `1.0x` at 3000 score toward a `2.0x` cap at 11000 score, so high-score runs keep escalating instead of flattening out.

## Station Equipment

| Station Category | Equipment |
| --- | --- |
| core | LASER Mk.II, EMP BURST |
| infrastructure | SCATTER CANNON, RAILGUN |
| security | RAILGUN, DUAL RACK |
| creative | LASER Mk.I, MISSILE RACK |
| governance | EMP BURST, LASER Mk.II |
| tools | SCATTER CANNON, MISSILE RACK |

## Adrenaline

Recent damage increases adrenaline by `0.15`, decaying by `0.04/s`. The value drives the red vignette opacity and high-tension combat barks when it spikes above `0.85`.

## XP Escalation

Enemy kills add the destroyed class' `xpReward`, so scouts and dreadnoughts no longer pay the same XP. Player-hit survival ticks add 5XP and mission completion adds 100XP. When `xp >= xpToNextPoint`, the player gains one skill point, XP rolls over, and the next threshold is multiplied by `1.35` and rounded. Skill effects are only reapplied when a new skill point is actually awarded.

## Upgrade Effects

`hull_4` adds slow armor regeneration while landed and grants a small dock bonus, capped above the normal hull maximum. `shield_4` overcharge is reset on launch, so it can fire once per flight session instead of every immediate re-dock. Strafe thrust is 15% stronger, and fuel drain scales by `1 + speed * 0.012` while burning.

## Flight Assists

Dogfight mode has optional assist controls layered on top of direct WASD flight:

| Key | Assist | Behavior |
| --- | --- | --- |
| `R` | Static throttle | Toggles throttle hold at the current throttle level. |
| `Z` / `X` | Throttle up/down | Raises or lowers static throttle in 10% steps while throttle is engaged. |
| `G` | Match speed | LERPs the ship velocity toward the nearest active enemy; without a target it emergency-brakes toward zero velocity. |
| `C` | Evasion roll | Applies a lateral/upward barrel-roll burst with a short cooldown. |
| `F` | Cold Jump | Teleports 40 units forward when `eng_5` is unlocked and its 25s cooldown is ready. |

Throttle mode keeps applying forward thrust at the selected percentage even when `W` is not held. `W` and `S` still bias the continuous thrust forward or reverse while throttle is enabled, and `A`/`D` strafe remains direct.

Enemy ships now publish their current velocity every combat tick. Match speed and the lead indicator use that velocity, while weakened-player pressure tightens enemy engagement distance when shields fall below 40%.

## HUD Feedback

Combat credit gains update the canonical trader credits balance and flash a short `+CR` indicator on the cockpit HUD when the player is actively flying.

The cockpit reticle now includes a yellow throttle arc and label while static throttle is engaged. A pink lead pip predicts the nearest active enemy's future position at close combat ranges, and up to four bogey arrows sit on the reticle edge to point toward active off-center enemies.
