---
name: "Pico Kiln"
tagline: "A 1977 industrial pottery kiln, rebuilt into a smart, dual-core controller that never crashes."
description: "Converting a 400kg vintage 3-phase pottery kiln into a safely automated, WiFi-connected smart kiln: electrical rewiring, physics-based PID control, a cross-platform Tauri app, and eventually a bare-metal Rust rewrite for firmware you can trust unattended overnight."
status: "personal"
role: "Creator"
period: "Nov 2025 - Jun 2026"
order: 3
icon: "flame"
iconColor: "text-orange-400"
tech: ["Raspberry Pi Pico W", "RP2350", "Rust", "Embassy", "no_std", "MicroPython", "Tauri", "React", "PID Control", "Python"]
metrics:
  - label: "Firing Temp"
    value: "~1222°C (cone 6)"
  - label: "Kiln Weight"
    value: "400kg"
  - label: "Uptime"
    value: "Zero crashes since Rust rewrite"
links:
  - label: "GitHub"
    url: "https://github.com/KONFeature/pico-kiln"
articleGroups: ["kiln"]
featured: false
draft: false
---

A kiln is a box that holds over 1000°C for hours, unattended, in a workshop. Pico Kiln is my project to control one safely: a 1977 "Bretagne" pottery kiln, originally wired for 380V 3-phase factory power, that I converted into a 220V single-phase smart kiln driven by a $6 microcontroller.

## What it does

The system rewires and controls a real, physically dangerous piece of equipment: three 1500W heating elements, solid-state relays, and a firing cycle that has to hold precise temperatures (cone 6, ~1222°C) for hours without supervision. On top of the hardware, it runs a physics-based PID control loop with gain scheduling to counter the kiln's non-linear radiative heat loss, a multi-mode auto-tuner, crash-recovery that resumes an interrupted firing from its own log, and a cross-platform app (web, macOS, Android) built once in React via Tauri.

## The point

This isn't a toy IoT project. Bugs in this codebase can mean a fire left unattended runs away, or a $600 kiln element burns out because a garbage collector paused the control loop at the wrong second. Embedded work with real physical stakes forces a different discipline than typical app development: every abstraction has to earn its place next to a 9kW heating element.

## My role

Sole creator, end to end: electrical rewiring of the 400kg unit, firmware, control theory, the app, and later the full rewrite.

## The journey

The series runs five parts. Part 1 covers the physical rewiring: taming 3-phase industrial power down to a safe 220V single-phase circuit, sizing breakers, and solving ground-fault issues. Part 2 builds the firmware in MicroPython on the Pico's dual-core RP2040, splitting real-time control from best-effort WiFi/HTTP handling. Part 3 ships a single React codebase as a web app, native macOS app, and Android APK via Tauri. Part 4 replaces eyeballed temperature curves with a physics-based thermal model and proper PID tuning from CSV firing logs.

Part 5 is the one I'm proudest of: after months of real firings validated the design in MicroPython, I tore out the interpreter and rewrote the firmware from scratch in bare-metal Rust on the RP2350. The rewrite is organized around one rule enforced at compile time, not by convention: the control brain never touches the world. Pure, host-testable logic; hardware access behind `embedded-hal` traits; golden-replay tests against real firing logs; and a linker-enforced safety boundary between the control core and everything else. It hasn't crashed, frozen, or hiccuped since. I sleep through overnight firings now.
