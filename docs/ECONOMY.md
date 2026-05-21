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
noise = ((sum(charCodes(projectId + commodityId)) % 100) / 100) * 0.24 - 0.12
price = round(base * (multiplier + noise))
```

The noise is deterministic per station and commodity for a session.

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
      -> Dismiss
```
