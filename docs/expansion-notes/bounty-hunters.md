# Bounty Hunter Intercepts

Research scope: Phase 1 bounty hunter intercept design. Source read in full from `js/flight/enemies.js`, `js/flight/combat-state.js`, `js/flight/state.js`, `js/flight/navgraph.js`, `js/flight/world.js`, and `js/flight/autopilot.js`. This is research-only; no application code changes.

## Existing Systems

Current reputation and bounty-related fields:

| Location | Field | Current role |
| --- | --- | --- |
| `reputationState.scores.security` | number `-100..100` | Security standing. Below `-30` can spawn a bounty hunter; above `40` can spawn friendly escort. |
| `combatState.activeBountyHunter` | enemy/null | Tracks the single active random security hunter. Blocks another hunter while set. |
| `combatState.bountyPending` | number | Present but unused by the inspected code. Good candidate for future explicit player bounty. |
| `gameOrchestrator.bountyPendingReward` | number | Reward pool for director `BOUNTY` waves. Paid when every active bounty-event enemy is cleared. |
| `enemy.userData.isBountyHunter` | boolean | Marks the random security hunter spawned by `checkBountyHunterSpawn()`. |
| `enemy.userData.bountyEventId` | string/null | Marks enemies spawned by orchestrated bounty events. |
| `enemy.userData.reward` | number | Overrides credit payout; current hunter reward is `220`. |
| `enemy.userData.label` | string | Current hunter label is `BOUNTY HUNTER`; friendly escort uses `FRIENDLY ESCORT`. |

Current behavior:

| System | Behavior |
| --- | --- |
| Random hunter spawn | `checkBountyHunterSpawn()` runs every combat update and has an `8%` random chance when security reputation is below `-30`, no boss is active, and no current bounty hunter exists. It spawns one `elite` enemy. |
| Security penalty source | `configureCombat({ onEnemyKill })` calls `loseReputation(getNearestStationFaction(pos), 1)` for kills. Security standing is one of the reputation categories, but there is no explicit separate bounty value yet. |
| Hunter death | `handleEnemyDestroyed()` clears `activeBountyHunter`, pays the hunter reward, and increases security reputation by `+8` but clamps it to at most `-30`, easing pressure without making the player neutral. |
| Orchestrated bounties | Director `BOUNTY` events spawn waves and pay `gameOrchestrator.bountyPendingReward` after all active bounty enemies are cleared. This is a contract bounty, not a wanted-level intercept. |
| Autopilot combat lock | Route autopilot refuses boss/nearby hostiles and disengages with `HOSTILE INTERDICTION` when active enemies are within half `COMBAT_ZONE_RADIUS`. |

## Intercept Trigger Table

Trigger on new nav-node arrival/progression, not every frame. The clean hook is after route autopilot advances `routeIndex` or enters `ARRIVED`, using the nav node id as a debounce key. Manual travel can use nearest-node changes from navigation/HUD with the same debounce.

| Player bounty | Security rep | Nav-node trigger | Intercept tier | Spawn count | Chance | Cooldown | Kill feed comms |
| ---: | ---: | --- | --- | ---: | ---: | ---: | --- |
| `0-99` | any | any node | none | 0 | 0% | none | none |
| `100-249` | `< -20` | New station/planet node | SCOUT | 1 | 20% | 6 min | `BOUNTY PING // SKIPTRACE SCOUT ON VECTOR` |
| `250-499` | `< -30` | New station/planet/jump node | SCOUT | 1 | 45% | 5 min | `WARRANT LOCK // HUNTER SCOUT INTERCEPT` |
| `500-899` | `< -45` | New station/planet/jump node | WING | 2 | 65% | 4 min | `BOUNTY ESCALATED // HUNTER WING DEPLOYED` |
| `900-1499` | `< -60` | New station/planet/jump node | WING | 3 | 80% | 3 min | `DEADMARK ACTIVE // MULTIPLE HUNTERS INBOUND` |
| `1500+` | `< -75` | Any new nav node, plus jump gates guaranteed | SQUADRON | 4-5 | 100% at jump, 90% elsewhere | 2 min | `BLACK WARRANT // SQUADRON INTERDICTION` |

Design notes:

| Topic | Recommendation |
| --- | --- |
| Debounce | Store `flightState.lastBountyInterceptNodeId`; do not roll more than once per node visit unless the player leaves and returns after cooldown. |
| Boss safety | Preserve current `combatState.bossActive` block. Bosses should suppress hunter intercepts. |
| Friendly escort conflict | If `activeFriendlyEscort` exists, allow intercepts but add kill feed flavor: `SECURITY ESCORT BROADCASTING COUNTER-WARRANT`. |
| Spawn style | Reuse pooled enemies; spawn at `120-180u` ahead/side of player rather than at the node, so intercepts read as interdictions. |
| Bounty source | Add explicit bounty value rather than overloading negative reputation. Reputation controls faction hostility; bounty controls intercept intensity. |

## Elite Tier Design

| Tier | Intended enemy classes | Count | Stats | Behavior | Rewards |
| --- | --- | ---: | --- | --- | --- |
| SCOUT | `elite` visual or fast `interceptor` variant | 1 | `4 HP`, no shield, high evasion | Tests player, opens with a kill-feed warning, flees at `20%` HP unless disabled quickly. | `220cr`, small bounty reduction only if destroyed. |
| WING | One `elite` lead plus one `interceptor`/`gunboat` support | 2-3 | Lead `5 HP + 1 shield`; supports normal class stats | Lead flanks; support pressures at range. If lead flees, surviving wing gets a morale burst/cooldown reduction. | `350-600cr` total; all destroyed lowers bounty. |
| SQUADRON | `elite` commander, `gunboat`, `interceptor`, optional `phantom` | 4-5 | Commander `7 HP + 2 shield`; support normal or +10% difficulty multiplier | Commander marks the player; squadron coordinates bursts. At `20%` commander HP, commander flees and escalates bounty hard. | `900-1400cr` total; clearing all hunters gives major bounty drop. |

Flee and escalation:

| Event | Result |
| --- | --- |
| Hunter reaches `<= 20%` HP and is not stunned | Set `enemy.userData.fleeing = true`, stop attacking, accelerate away along vector from player, despawn after crossing `220u`. |
| Any hunter flees | Increase explicit bounty by tier amount, e.g. SCOUT `+75`, WING `+150`, SQUADRON `+300`; kill feed: `HUNTER ESCAPED // BOUNTY SIGNAL AMPLIFIED`. |
| All hunters in the current intercept destroyed | Reduce bounty by tier amount, e.g. SCOUT `-100`, WING `-250`, SQUADRON `-500`; kill feed: `INTERCEPT CLEARED // BOUNTY PRESSURE REDUCED`. |
| Partial clear with flee | Pay normal kill rewards, but do not apply full bounty decrease. Escaped hunters should leave `combatState.bountyEscalationPending` or directly raise bounty. |

## Hunter Factions

| Faction | Color | Callsigns | Personality | Preferred tier/style |
| --- | --- | --- | --- | --- |
| Vesper Bailiffs | `#ffcc00` | `LIEN-1`, `WAGELOCK`, `GARNISH` | Corporate repo pilots, legalistic comms. | SCOUT/WING, fast interceptors, precise warnings. |
| Redline Reclaimers | `#ff3355` | `CLAIMJUMP`, `BLOODNOTE`, `TOWHOOK` | Violent salvage bounty crew. | WING/SQUADRON, gunboat support, heavy burst pressure. |
| Null Choir Marshals | `#b026ff` | `QUIETUS`, `BLACKSEAL`, `NO-VOICE` | Silent deep-space warrants and anomaly-adjacent hunters. | High-bounty SQUADRON, elite/phantom mix, fewer but scarier messages. |

Kill feed comms should carry faction identity without opening a full game-message modal unless the tier is SQUADRON:

| Trigger | Example kill feed line |
| --- | --- |
| Spawn | `VESPER BAILIFFS // LIEN-1 INTERCEPTING` |
| First hit on player | `REDLINE RECLAIMERS // CLAIMJUMP HAS TONE` |
| Flee | `NULL CHOIR // QUIETUS BROKE CONTACT, WARRANT UPLINKED` |
| Clear | `HUNTER WING CLEARED // BOUNTY -250` |

## Autopilot Interruption

Use interdiction as an explicit route-autopilot interruption, not just a consequence of active enemies appearing.

| Autopilot state | Intercept behavior |
| --- | --- |
| `PLOTTING` | Allow plotting to finish, then block engagement with `BOUNTY INTERDICT`. |
| `ENGAGED` | On intercept fire, call `disengage(flightState, 'BOUNTY INTERDICTION')`, set `hyperspeedMult` to `1`, and spawn hunters after a short `600-1200ms` delay. |
| `DECELERATING` | Spawn hunters immediately if near a node; player is already slow enough for a readable ambush. |
| `ARRIVED` | Delay `300ms`, show kill feed comms, then spawn. |

Avoid spawning while hyperspeed immunity is active unless autopilot is first forced out of hyperspeed. The current `isHyperspeedCombatImmune()` ignores combat when `hyperspeedMult > 5`, so bounty interdiction must lower hyperspeed before hunters become active.

## Radar Distinction

Current radar already receives `enemies` and draws contacts by type. Bounty hunters need a separate visual category rather than only `isBountyHunter` text.

| Contact | Radar marker |
| --- | --- |
| Normal enemy | Existing hostile marker/color. |
| Friendly escort | Existing/continued green allied marker from `isFriendly`/`teamColor`. |
| Bounty hunter | Diamond or chevron marker with faction color and a thin pulsing warrant ring. |
| Fleeing hunter | Same marker, but hollow/outlined and moving toward radar edge. |
| Squadron commander | Larger bounty marker with double pulse; should be the highlighted target if no nearer enemy is selected. |

## New Field List

Recommended `combatState` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `bounty` | number | Explicit wanted value driving intercept thresholds. Replaces use of negative security rep as the only pressure value. |
| `bountyTier` | `'NONE'|'SCOUT'|'WING'|'SQUADRON'` | Last resolved pressure tier for HUD/comms. |
| `activeBountyHunters` | array | Current intercept group; supersedes single `activeBountyHunter` while preserving that field during migration if needed. |
| `bountyInterceptId` | string/null | Current intercept encounter id, used to determine all-cleared outcomes. |
| `bountyFactionId` | string/null | Selected hunter faction for the active intercept. |
| `lastBountyInterceptAt` | number | `performance.now()` cooldown gate. |
| `lastBountyInterceptNodeId` | string/null | Prevents rerolling on the same nav node. |
| `bountyEscalationPending` | number | Optional queued bounty increase from fled hunters. |
| `bountyHuntersDestroyed` | number | Count for current intercept clear logic and debrief. |
| `bountyHuntersFled` | number | Count for escalation and kill-feed summary. |

Recommended `flightState` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `currentNavNodeId` | string/null | Stable id for the node the player is currently visiting or passing. |
| `previousNavNodeId` | string/null | Detects new-node transitions outside autopilot. |
| `lastBountyInterceptNodeId` | string/null | Flight-local duplicate of combat debounce if preferred near navigation code. |
| `bountyInterdictedUntil` | number | Short window where autopilot cannot re-engage after an intercept. |
| `autopilotInterruptedBy` | string/null | Records `BOUNTY_INTERDICTION` for HUD status/debugging. |

Recommended `enemy.userData` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `isBountyHunter` | boolean | Already exists; continue using it for radar/combat branching. |
| `bountyInterceptId` | string | Groups hunters for all-cleared logic. |
| `bountyFactionId` | string | Drives color, callsign, and comms. |
| `bountyTier` | string | SCOUT/WING/SQUADRON behavior and reward scaling. |
| `hunterCallsign` | string | Kill feed and HUD label. |
| `fleeing` | boolean | Movement/attack branch for escaping hunters. |
| `fleeStartedAt` | number | Despawn timeout and escalation timing. |
| `bountyEscalationValue` | number | Amount added if this hunter escapes. |
| `bountyReductionValue` | number | Amount removed if the full group is destroyed. |

## Concise Summary

Add an explicit player bounty value and trigger bounty hunter intercept rolls when the player enters a new nav node. Scale encounters from SCOUT to WING to SQUADRON, identify them through faction-colored kill feed comms and radar markers, interrupt autopilot with `BOUNTY INTERDICTION`, let wounded hunters flee at `20%` HP to escalate bounty, and reduce bounty only when the entire hunter group is destroyed.
