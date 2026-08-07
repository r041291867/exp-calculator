# 0001 - Skip centralizing the "reset on level change" effects

## Status

Accepted

## Context

An architecture review (2026-08) flagged that `Calculator.tsx`, `BaseRateCalculator.tsx`, and `ExpRateCalculator.tsx` each run a `useEffect(() => { ... }, [currentLevel])` that resets some local state when the character's level changes:

- `Calculator.tsx`: clears `hasCalculated` and clamps `targetLevel` if it's no longer above `currentLevel`.
- `BaseRateCalculator.tsx`: zeroes `totalExp`.
- `ExpRateCalculator.tsx`: zeroes `totalExp`.

On the surface this looks like the same policy duplicated three times ("changing level invalidates downstream input"), which was proposed as candidate #5 in the review: centralize it into one shared place.

## Decision

We will **not** centralize these effects.

Looking closer, the three effects don't share a policy — they share only the fact that they listen to `currentLevel`. What each one *does* on change is different and specific to that component's own local state (a boolean + a clamped select vs. zeroing an exp field). Centralizing them would require either:

- a shared function taking a callback (moves the code around without removing any of it), or
- a new abstraction (e.g. a shared "on level change" hook/registry) that none of the three call sites would use identically.

Either path is speculative generality: building a shared shape to fit needs that aren't actually shared, in service of removing a duplication that isn't really there.

## Consequences

- Each component keeps its own short, self-contained `useEffect(() => { ... }, [currentLevel])`.
- If a future feature needs several of these resets to coordinate (e.g. two of them must fire in a specific order relative to each other), revisit this decision then — at that point there will be a concrete shared need to design around, rather than a guess.
- Future architecture reviews should not re-flag this pattern as duplication without a new, concrete reason beyond "three `useEffect`s depend on the same value."
