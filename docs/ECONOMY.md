# Economy

## Commodities

| ID | Name | Base Price | Category | Restriction |
| --- | --- | ---: | --- | --- |
| `devplans` | DEVPLANS | 45 | core | none |
| `agents` | AGENT CORES | 120 | core | core rep `>= 20` |
| `audiodata` | AUDIO DATA | 70 | creative | none |
| `mediafiles` | MEDIA FILES | 55 | creative | none |
| `govdata` | GOV DATA | 90 | governance | none |
| `shellcreds` | SHELL CREDS | 150 | infrastructure | none |
| `exploitkit` | EXPLOIT KIT | 200 | security | security rep `>= -20` |
| `rawlogs` | RAW LOGS | 30 | tools | none |
| `contraband` | CONTRABAND | 400 | security | black market only |

## Station Profiles

| Project Category | Produces | Demands |
| --- | --- | --- |
| `core` | `devplans`, `agents` | `shellcreds` |
| `creative` | `audiodata`, `mediafiles` | `devplans` |
| `infra` / infrastructure | `shellcreds` | `rawlogs` |
| `ai` / security | `exploitkit` | `govdata` |
| governance | `govdata` | `agents` |
| tools | `rawlogs` | `audiodata` |
| default | `rawlogs` | `devplans` |

All stations have fuel available and track local fuel stock.

## Price Formula

```text
base = commodity.basePrice
multiplier = 0.78 if station produces commodity
multiplier = 1.35 if station demands commodity
drift = deterministic station/commodity noise, adjusted by recent trades
buyRepMultiplier = 0.85 allied, 0.92 friendly, 1.0 neutral, 1.1 unfriendly, 1.2 hostile
sellRepMultiplier = 2 - buyRepMultiplier
price = round(base * (multiplier + drift) * actionRepMultiplier)
```

The baseline drift starts as deterministic per station and commodity. Buying a commodity pushes that station price up by `0.03`; selling pushes it down by `0.03`. Drift is capped at `+/-0.35` and recovers toward baseline every 30 seconds while flying. Allied reputation discounts purchases and improves sell prices; hostile reputation does the inverse.

## Faction Reputation

Reputation is tracked per faction from `-100` to `100` in `js/economy/reputation.js`:

```text
core, creative, infrastructure, security, governance, tools
```

Successful trades grant `+2` reputation with the station faction. Completed mission contracts grant their configured reputation reward. Enemy kills apply a small `-1` reputation decay to the nearest station faction. Reputation changes market prices and local enemy aggression; friendly/allied stations discount buys, pay better sell prices, and make nearby enemies less aggressive, while unfriendly/hostile standing does the inverse. The inventory panel shows current faction standing labels.

## Restricted Goods

Restricted commodities require minimum reputation with the docked station faction when using regular station markets. `AGENT CORES` require FRIENDLY core standing (`>= 20`), and `EXPLOIT KIT` requires security standing of at least `-20`. Failed clearance checks return `TRADE DENIED: SECURITY CLEARANCE REQUIRED.` Black market trades skip clearance checks.

## Black Market

Stations where faction reputation is `<= -50` replace `VIEW MARKET` with `BLACK MARKET`. The black market lists all commodities, including `CONTRABAND`, ignores normal restricted-good clearance checks, and applies a 30% buy-side risk premium. `CONTRABAND` is black-market-only and is hidden from the regular market and inventory cargo grid.

## Faction Missions

Docked stations expose a `MISSIONS` option after startup. Each station deterministically offers one daily faction mission seeded by station ID plus day of week:

```text
escort: destroy 2 hostiles near another station, reward 50-300cr + 5 rep
delivery: buy 1 local commodity and sell it at another station, reward 100-200cr + 8 rep
bounty: destroy 3 enemies, reward 150-350cr + 6 rep
```

Faction missions use the same `missionState` and contract-step flow as existing objectives.

## Fuel

Fuel drains at `0.35` units per second while thrusting or while autopilot is engaged. At zero fuel, thrust drops to emergency drift and a critical system message is announced. Refuel cost is:

```text
round((maxFuel - currentFuel) * fuelCostPerUnit)
```

## Trade Menu

```text
Dock/Land
  -> Station Welcome
      -> View Market / Black Market
          -> Select Commodity
              -> Buy Quantity
              -> Sell Quantity
      -> Refuel
      -> View Cargo
      -> Shipyard
      -> Missions
      -> Dismiss
```
