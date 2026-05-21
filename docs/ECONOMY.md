# Economy

## Commodities

| ID | Name | Base Price | Category |
| --- | --- | ---: | --- |
| `devplans` | DEVPLANS | 45 | core |
| `agents` | AGENT CORES | 120 | core |
| `audiodata` | AUDIO DATA | 70 | creative |
| `mediafiles` | MEDIA FILES | 55 | creative |
| `govdata` | GOV DATA | 90 | governance |
| `shellcreds` | SHELL CREDS | 150 | infrastructure |
| `exploitkit` | EXPLOIT KIT | 200 | security |
| `rawlogs` | RAW LOGS | 30 | tools |

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
repMultiplier = 0.85 allied, 0.92 friendly, 1.0 neutral, 1.1 unfriendly, 1.2 hostile
price = round(base * (multiplier + drift) * repMultiplier)
```

The baseline drift starts as deterministic per station and commodity. Buying a commodity pushes that station price up by `0.03`; selling pushes it down by `0.03`. Drift is capped at `+/-0.35` and recovers toward baseline every 30 seconds while flying.

## Faction Reputation

Reputation is tracked per faction from `-100` to `100` in `js/economy/reputation.js`:

```text
core, creative, infrastructure, security, governance, tools
```

Successful trades grant `+2` reputation with the station faction. Completed mission contracts grant `+5` reputation with the docked station faction. Reputation changes market prices and local enemy aggression; friendly/allied stations discount prices while unfriendly/hostile standing raises prices and makes nearby enemies fire more aggressively. The inventory panel shows current faction standing labels.

## Fuel

Fuel drains at `0.35` units per second while thrusting or while autopilot is engaged. At zero fuel, thrust drops to emergency drift and a critical system message is announced. Refuel cost is:

```text
round((maxFuel - currentFuel) * fuelCostPerUnit)
```

## Trade Menu

```text
Dock/Land
  -> Station Welcome
      -> View Market
          -> Select Commodity
              -> Buy Quantity
              -> Sell Quantity
      -> Refuel
      -> View Cargo
      -> Shipyard
      -> Dismiss
```
