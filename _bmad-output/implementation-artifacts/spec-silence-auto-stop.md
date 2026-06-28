---
title: 'Auto Silence Detection and Recording Upgrades'
type: 'feature'
created: '2026-06-28'
status: 'done'
baseline_commit: '1c4c1f88824b3f0b383004919a1029b03bcda73e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current recording implementation in the AI Speaking Lab requires manual stop, which feels dated and inconvenient. Speech recognition also does not provide visual feedback for voice levels, making it unclear if the microphone is working correctly.

**Approach:** Implement automatic silence detection using the Web Audio API alongside Speech Recognition. If no speech is detected after 4 seconds initially, or if a user stops speaking for 1.5 seconds, automatically stop the recording. In addition, introduce a premium real-time visual voice volume level indicator.

## Boundaries & Constraints

**Always:**
- Use the Web Audio API with `AudioContext` and `AnalyserNode` to analyze volume levels.
- Clean up all Web Audio nodes, close the `AudioContext`, and stop microphone tracks when recording stops to prevent memory and resources leaks.
- Ensure the silence auto-stop triggers the same submit logic as manual stopping in both tabs (Shadowing and AI Coach).

**Ask First:**
- N/A

**Never:**
- Avoid using third-party non-standard packages for audio visualization or voice detection; use native browser Web Audio and Web Speech APIs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Initial Silence | Start recording, no speaking for 4s | Auto-stops recording | N/A |
| Normal Speech with Auto-Stop | Start recording, speak, then stop for 1.5s | Auto-stops and processes speech (sends chat or scores shadow) | N/A |
| Manual Stop | Start recording, click Stop manually before timeout | Stops and processes immediately, clears audio context | N/A |
| Mic Access Denied | Mic permission denied | Logs error, speech recognition fails or uses browser fallback gracefully | Show error message or console log |

</frozen-after-approval>

## Code Map

- `src/components/AISpeakingLab.tsx` -- Main React component implementing the AI Speaking Lab, which holds the speech recognition handlers and voice recording buttons.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/AISpeakingLab.tsx` -- Update recording handlers to include Web Audio silence detection, clean up resources on stop, and add visual volume level indicator.

**Acceptance Criteria:**
- Given the user starts recording on the Shadowing tab, when they don't speak for 4 seconds, then the recording automatically stops.
- Given the user is speaking on the Coach tab, when they pause speaking for 1.5 seconds, then the recording automatically stops and the message is sent to the AI coach.
- Given the user is recording, when speaking, then a visual volume level indicator shows active voice amplitude.

## Design Notes

We will track volume level via a `volumeLevel` state (0-100) and render a pulsing border or amplitude bar near the mic button:
```tsx
const [volumeLevel, setVolumeLevel] = useState(0);
```

## Verification

**Manual checks (if no CLI):**
- Verify type checks via `npm run lint` (tsc --noEmit).
- Run `npm run dev` and manually test Shadowing and Coach recording tabs.
- Confirm auto-stop occurs on silence, and check for memory leaks in browser console.

## Suggested Review Order

**Recording State and Helpers**

- Declare Web Audio state, refs, and volume handlers at the top of the component.
  [`AISpeakingLab.tsx:180-192`](../../src/components/AISpeakingLab.tsx#L180-L192)

- Audio stream volume analysis, threshold check, and centralized stopRecording function.
  [`AISpeakingLab.tsx:193-294`](../../src/components/AISpeakingLab.tsx#L193-L294)

- Auto-stop active recording unconditionally when the active tab switches.
  [`AISpeakingLab.tsx:295-305`](../../src/components/AISpeakingLab.tsx#L295-L305)

**Shadowing Tab Updates**

- Trigger silence detection on record start, and use centralized stopRecording on record end.
  [`AISpeakingLab.tsx:724-744`](../../src/components/AISpeakingLab.tsx#L724-L744)

- Display dynamic, premium 15-bar voice spectrum visualizer under Shadowing record button.
  [`AISpeakingLab.tsx:1682-1725`](../../src/components/AISpeakingLab.tsx#L1682-L1725)

**Interactive Coach Tab Updates**

- Trigger silence detection on record start, and stop recording for final result processing.
  [`AISpeakingLab.tsx:1270-1285`](../../src/components/AISpeakingLab.tsx#L1270-L1285)

- Display dynamic voice spectrum visualizer above inputs bar when recording.
  [`AISpeakingLab.tsx:1875-1908`](../../src/components/AISpeakingLab.tsx#L1875-L1908)

