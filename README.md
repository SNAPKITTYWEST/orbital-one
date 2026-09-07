# orbital-one

[![MIT License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r180-black?style=flat-square)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-purple?style=flat-square)](https://vitejs.dev/)

A browser spacecraft simulator and **headless flight-model SDK**.

Launch from the pad, fly a two-stage ascent to orbit, and keep flying — or import the simulation engine directly into your own project to drive physics, guidance, and telemetry without a browser.

![Flight deck](media/flight-deck.png)

Authors: Ahmad Ali Parr, Jessica L. Williams (SNAPKITTYWEST)

---

## Quick start (browser app)

```sh
npm ci
npm run dev        # → http://127.0.0.1:5173
npm run build      # → dist/  (static, serve over HTTP)
npm run preview    # → http://127.0.0.1:4173
```

Requires Node.js 22.12+. The `dist/` output is fully self-contained — copy it anywhere and serve over HTTP.

---

## SDK — headless flight model

The `src/sim/` modules are pure TypeScript with zero browser dependencies. Import them directly to drive the physics engine from Node.js, a test harness, a server, or another UI framework.

### Install

```sh
npm install
```

### Basic usage

```ts
import { createState }  from './src/sim/state.js';
import { tick }         from './src/sim/physics.js';
import { telemetry }    from './src/sim/telemetry.js';

// Create a fresh mission
const s = createState();

// Arm all systems and launch
for (const sys of s.systems) s.systems[sys] = true;
s.engineArmed = true;
s.launchArmed = true;

// Advance the simulation (each tick = 1/60 simulated second)
for (let i = 0; i < 600; i++) tick(s);

const t = telemetry(s);
console.log(`Altitude: ${(t.altitude / 1000).toFixed(1)} km`);
console.log(`Speed: ${t.speed.toFixed(0)} m/s`);
console.log(`Phase: ${s.phase}`);
```

### Time scaling

```ts
import { STEP } from './src/sim/math.js';

// Real-time: call tick(s) once per animation frame
// 20× pace: call tick(s, STEP * 20) per frame (the app default)
// Batch: run 6000 ticks in a loop (= 100 simulated seconds at 1×)
for (let i = 0; i < 6000; i++) tick(s, STEP);
```

---

## SDK reference

### `src/sim/state.ts`

| Export | Description |
|--------|-------------|
| `createState()` | Returns a fresh `FlightState` at the launch pad |
| `FlightState` | Full mission state interface (position, velocity, systems, phase…) |
| `Phase` | `'PRELAUNCH' \| 'COUNTDOWN' \| 'IGNITION' \| 'ASCENT' \| 'ORBIT INSERTION' \| 'ORBITAL FLIGHT' \| 'ABORT' \| 'LANDED' \| 'IMPACT'` |
| `SYSTEMS` | `['power','avionics','navigation','comms','life support','propulsion','computers']` |
| `log(s, text)` | Append a timestamped event to `s.events` |
| `phase(s, next)` | Transition phase and log it |

### `src/sim/physics.ts`

| Export | Description |
|--------|-------------|
| `tick(s, dt?)` | Advance one integration step. Default `dt = STEP` (1/60 s). Integrates gravity, drag, thrust, parachute, ground contact. |

### `src/sim/guidance.ts`

| Export | Description |
|--------|-------------|
| `guide(s)` | Automated ascent guidance — sets `pitch`, `throttle`, `yaw` to reach periapsis > 180 km / apoapsis < 400 km. Called by `tick`. |

Set `s.guidance = false` to fly manually with `s.pitchInput`, `s.yawInput`, `s.rollInput`.

### `src/sim/navigation.ts`

| Export | Description |
|--------|-------------|
| `navigation(s)` | Returns `{ altitude, speed, vertical, horizontal, gravity, density, apoapsis, periapsis, circularSpeed }` |
| `basis(s)` | Returns `{ up, north, east }` unit vectors at the vehicle position |

### `src/sim/propulsion.ts`

| Export | Description |
|--------|-------------|
| `propulsion(s, dt, density)` | Consume propellant, update thrust, engine temperature, vehicle mass |
| `STAGES[0\|1]` | Stage specs: `{ thrust, isp, dryMass, capacity }` |

### `src/sim/telemetry.ts`

| Export | Description |
|--------|-------------|
| `telemetry(s)` | All navigation data + `fuelPercent`, `throttlePercent` |
| `warnings(s)` | Array of `{ level: 'caution' \| 'critical', text: string }` |
| `clock(seconds)` | Format seconds as `HH:MM:SS` |

### `src/sim/mission.ts`

| Export | Description |
|--------|-------------|
| `mission(s, dt)` | Countdown, launch interlocks, staging logic, orbit detection, abort |

### `src/sim/math.ts`

| Export | Value | Description |
|--------|-------|-------------|
| `R` | 6,371,000 m | Earth radius |
| `MU` | 3.986 × 10¹⁴ | Earth gravitational parameter |
| `G0` | 9.80665 m/s² | Standard gravity |
| `STEP` | 1/60 s | Fixed integration timestep |
| `V3` | `[number,number,number]` | 3D vector type |
| `add`, `mul`, `dot`, `cross`, `len`, `unit`, `clamp`, `lerp` | — | Vector math |

---

## Architecture

```
src/
├── sim/               ← Pure SDK (no browser deps)
│   ├── state.ts       Mission state: FlightState, Phase, SYSTEMS
│   ├── physics.ts     Fixed-step integrator: gravity + drag + thrust
│   ├── guidance.ts    Ascent autopilot targeting 180–400 km orbit
│   ├── navigation.ts  Orbital parameters, reference frames
│   ├── propulsion.ts  Two-stage engines, propellant, mass
│   ├── mission.ts     Countdown, interlocks, staging, abort
│   ├── telemetry.ts   Derived display values, warnings
│   └── math.ts        SI constants, V3 operations
├── render/world.ts    Procedural Three.js world + spacecraft + camera
├── ui/cockpit.ts      Accessible HTML cockpit markup
├── ui/instruments.ts  Canvas flight director + nav display
├── input.ts           Keyboard, pointer, touch
├── audio.ts           Web Audio oscillators + speech synthesis
├── main.ts            Frame loop, presentation binding
└── style.css          Responsive cockpit layout
tests/
├── flight.test.ts     Headless SDK tests (Node.js)
├── browser/flight.spec.ts  Playwright browser tests
└── profile.ts         Performance profiling
```

---

## Physics model

The integrator runs at **60 fixed steps per simulated second** (configurable via `dt`).

| Modelled | Detail |
|----------|--------|
| Gravity | Inverse-square, Earth-centered (`MU/r²`) |
| Atmosphere | Exponential density, velocity-dependent drag |
| Propulsion | Two independent stages, real Isp, changing mass |
| Orbital mechanics | Apoapsis, periapsis, eccentricity, circular speed |
| Guidance | Closed-loop pitch program to bound orbit |
| Parachute | Drag-limited, deploys below 10 km on abort |
| Abort | Capsule separation (6,000 kg), recovery below 12 m/s |

Not modelled: Earth rotation, aerodynamic lift, RCS, real avionics, structural FEM.

---

## Controls (browser)

| Key | Action |
|-----|--------|
| W / S | Throttle up / down |
| A / D | Roll left / right |
| ↑ / ↓ | Pitch toward vertical / horizon |
| ← / → | Yaw |
| Enter | Initiate launch |
| Space | Stage separation |
| Escape | Pause / resume |
| R | Reset mission |
| E | Engineering telemetry |

---

## Tests

```sh
npm test                  # headless flight-model tests (Node.js)
npm run build             # TypeScript check + production build
npm run test:browser      # Playwright browser tests (requires Chrome)
```

---

## License

MIT — see [LICENSE](LICENSE).
