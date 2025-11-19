---
title: "Pico Kiln — Part 3: React Native UI with Deep Expo Integration"
date: 2025-11-19T09:00:00Z
draft: false
subtitle: "From Bare Metal to Polished UI"
category: "mobile"
tags: ["React Native", "Expo", "BLE", "IoT", "UI/UX"]
icon: "smartphone"
iconColor: "text-blue-400"
featured: false
description: "Building the React Native app for Pico Kiln: BLE communication, local-first state, and designing real-time temperature curves that felt native."
githubUrl: "https://github.com/frak-id/pico-kiln-app"
group: "kiln"
---

Most embedded web interfaces are terrible. They are usually server-side rendered HTML pages that require a full refresh to update a temperature reading. They feel clunky, unresponsive, and fragile.

For `pico-kiln`, I wanted the UI to feel like a native desktop application: instant state updates, smooth charts, and offline resilience. We achieved this by decoupling the frontend entirely from the firmware, serving a static React SPA from the Pico's flash memory.

## Architecture: Polling with Style

The Raspberry Pi Pico W is powerful, but it's not a server farm. While WebSockets are possible, they consume significant RAM and CPU on the Python side to maintain keep-alives.

Instead, we use a **High-Frequency Polling** architecture. The frontend hits a lightweight `/api/status` JSON endpoint every 1-2 seconds.

To make this performant, we lean heavily on **TanStack Query (React Query)**. It manages the polling interval, caching, and—crucially—the "stale" state. If the WiFi drops, the UI doesn't crash; it simply greys out and shows a "Reconnecting..." badge, retaining the last known good state.

### The API Client

We wrap `fetch` in a strongly-typed `PicoAPIClient`. This ensures that our frontend code knows exactly what the firmware returns.

```typescript
// web/src/lib/pico/client.ts

export class PicoAPIClient {
    async getStatus(): Promise<KilnStatus> {
        // Includes strict timeout handling to fail fast
        return this.request<KilnStatus>("/api/status", { timeout: 2000 });
    }

    async runProfile(profileName: string): Promise<RunProfileResponse> {
        return this.request<RunProfileResponse>("/api/run", {
            method: "POST",
            body: JSON.stringify({ profile: profileName }),
        });
    }
}
```

### React Query Integration

By wrapping the client in a custom hook, we get automatic polling management. The `refetchInterval` is dynamic: fast when running, slow when idle.

```typescript
// web/src/lib/pico/hooks.ts

export function useKilnStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: () => client.getStatus(),
    refetchInterval: (query) => {
      // Poll fast (1s) if running, slow (5s) if idle
      const state = query.state?.data?.state;
      return state === 'RUNNING' ? 1000 : 5000;
    },
    retry: false, // Fail fast to show connection error
  });
}
```

## Routing & Type Safety

We use **TanStack Router** for file-based routing. This provides type safety for URL parameters. If we link to `/toolbox/visualizer/$fileId`, the compiler ensures that `$fileId` is handled. This prevents broken links and runtime 404s, which is vital when the "server" is a microcontroller that might be busy processing PID loops.

## Hardcore Data Analysis

The app isn't just for control; it's for science. The `scripts/` directory contains a suite of Python tools that analyze CSV logs downloaded from the kiln.

### Physics-Based Phase Detection

One of the coolest features is the **Phase Detector** (`scripts/analyzer/data.py`). Instead of relying on the profile's *intended* steps, it looks at the *actual* physics to determine what the kiln was doing.

It uses the SSR duty cycle and temperature derivative ($\frac{dT}{dt}$) to classify phases:

1.  **Cooling:** SSR Output < 5% (Natural cooling).
2.  **Heating:** SSR Output > 5% AND $\frac{dT}{dt}$ > Threshold.
3.  **Plateau:** SSR Output > 5% AND $\frac{dT}{dt}$ $\approx$ 0.

```python
# scripts/analyzer/data.py

def detect_phases(data, plateau_threshold=0.5):
    # ... loop through data ...
    
    if avg_ssr < 5.0:
        phase_type = 'cooling'
    elif rate_per_min > plateau_threshold:
        phase_type = 'heating'
    elif abs(rate_per_min) <= plateau_threshold:
        phase_type = 'plateau'
```

This allows us to generate "Heatmaps" of the firing performance, showing exactly where the kiln struggled to maintain rate (e.g., during the quartz inversion at 573°C).

## Visualization

For live data, we use **Recharts** in the React app. It's lightweight enough to render thousands of data points without lagging the browser.

For post-firing analysis, the Python scripts generate static `matplotlib` plots. These high-resolution images allow us to inspect the PID behavior tick-by-tick, revealing integral windup or derivative noise that isn't visible on the live dashboard.
