# Verification record

The simulator was created as a new local Git repository. No existing application or repository was used as its starting point.

## Flight model

All 12 headless tests passed, including deterministic replay and complete guided orbital insertion. The fixed-step ascent produced:

- Mission elapsed time at objective completion: 408.13 simulated seconds.
- Altitude: 219.02 km.
- Velocity: 7.807 km/s.
- Periapsis: 180.45 km.
- Apoapsis: 360.88 km.
- Remaining upper-stage propellant: 9,955.75 kg.

These values were obtained by integrating the simulation from the launch pad. No orbital state was injected into the complete-flight test.

## Browser

All three browser tests passed. Desktop Chrome at 1440 × 960 and mobile layout at 390 × 844 completed the actual UI-driven launch, orbital flight, camera selection, pause, reset, engineering view, and prelaunch abort tests.

Screenshots are generated from live rendered application states. Browser audio is checked for activation and error handling; an automated test cannot establish subjective sound quality.

## Rendering measurement

A 90-frame sample in desktop Chrome during prelaunch with reduced motion enabled measured a mean frame interval of 16.68 ms and a 95th percentile of 16.80 ms (approximately 60 frames per second). This measures that browser and scene; it does not establish performance across devices or every flight phase.

The TypeScript check and Vite production build passed.

## Limits

Results establish behavior of this simplified software model. They are not evidence of real-vehicle accuracy, aerospace certification, or external deployment. There is no remote repository or public hosting configured by this build.
