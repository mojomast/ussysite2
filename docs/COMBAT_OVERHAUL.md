# Combat Overhaul

## Enemy Classes

| Class | HP | Shield Pips | Fire Rate | Burst | Reward | Role |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Scout | 1 | 0 | 1500ms | 1 | 50CR / 10XP | Tutorial and baseline harassment. |
| Interceptor | 2 | 0 | 900ms | 1 | 120CR / 25XP | Fast flanker with light evasion. |
| Gunboat | 5 | 4 | 700ms | 3 | 280CR / 60XP | Slow burst-fire pressure target. |
| Elite Ace | 3 | 2 | 600ms | 2 | 450CR / 100XP | Accurate evasive ace. |
| Dreadnought | 12 | 11 | 500ms | 5 | 900CR / 200XP | Heavy late-tier cruiser. |

## Weapon Loadout

| Weapon | Slot | Damage | Cooldown | Energy | Heat | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| LASER Mk.I | Primary | 12 | 140ms | 2.5 | 8 | Standard pulse laser. |
| LASER Mk.II | Primary | 20 | 200ms | 4 | 14 | Stronger laser, hotter. |
| SCATTER CANNON | Primary | 8 x4 | 380ms | 6 | 22 | Wide spread. |
| RAILGUN | Primary | 55 | 1800ms | 22 | 45 | High damage precision shot. |
| MISSILE RACK | Secondary | 60 | 900ms | 18 | 0 | Single homing missile. |
| DUAL RACK | Secondary | 55 x2 | 1400ms | 30 | 0 | Twin homing launch. |
| EMP BURST | Secondary | 5 AoE | 4500ms | 35 | 0 | Stuns enemies in range. |

## Skill Tree

```text
HULL:    hull_1 -> hull_2 -> hull_3 -> hull_4
SHIELD:  shield_1 -> shield_2 -> shield_3 -> shield_4
WEAPONS: weap_1 -> weap_3 -> weap_4
         weap_2
ENGINES: eng_1 -> eng_2 -> eng_3 -> eng_4
```

## Heat And Overheat

Primary weapons add heat per shot. Heat cools by `12/s`. At or above max heat, primary weapons are offline until heat cools to zero. Heat sinks raise max heat from `100` to `130`.

## Shield Bleedthrough

Damage records `lastHitAt`, interrupts regen, and raises adrenaline. Shields above 25 absorb direct damage. Low shields destabilize: armor takes 35% of the hit, modified by reactive armor, while shields absorb the burst impact.

## Difficulty Tiers

| Score | Tier | Classes |
| ---: | ---: | --- |
| `< 1` | 0 | Tutorial scouts only. |
| `< 500` | 1 | Scouts. |
| `< 1500` | 2 | Scouts, interceptors. |
| `< 4000` | 3 | Scouts, interceptors, gunboats, elites. |
| `>= 4000` | 4 | All classes including dreadnoughts. |

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

`hull_4` adds slow armor regeneration while landed and grants a small dock bonus, capped above the normal hull maximum. `shield_4` overcharge is reset on launch, so it can fire once per flight session instead of every immediate re-dock.

## HUD Feedback

Combat credit gains update the canonical trader credits balance and flash a short `+CR` indicator on the cockpit HUD when the player is actively flying.
