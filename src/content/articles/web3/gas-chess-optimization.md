---
title: "GasChess: The Art of Extreme Solidity Optimization"
date: 2025-02-21T12:00:00Z
draft: false
subtitle: "Bitpacking for 99% Gas Reduction"
category: "solidity"
tags: ["Solidity", "Gas Optimization", "Assembly", "Ethereum", "Chess"]
icon: "zap"
iconColor: "text-yellow-400"
featured: false
description: "A case study in reducing gas costs by 99% through bitpacking, assembly, and specialized data structures. How to make on-chain Chess playable."
githubUrl: "https://github.com/KONFeature/GasChess"
group: "web3"
---

The world of on-chain gaming is often limited by the harsh reality of Ethereum's gas costs. Complex logic like Chess, with its 64 squares and intricate movement rules, seems almost impossible to implement efficiently. However, the `GasChess` project provides a fascinating case study in the journey from "impossible" to "optimized."

In this article, we'll dissect the gas optimization techniques applied in GasChess, ranging from basic storage flattening to the theoretical limits of Solidity optimization using bitpacking and assembly.

## Why Chess On-Chain is Hard

A standard Chess game involves checking the validity of moves, which includes:
1.  **Path collision detection:** Ensuring no pieces block the path.
2.  **Checkmate/Stalemate detection:** This is the killer. It requires simulating *every possible future move* to see if the King can escape.

In a naive implementation (GasChess v0), this involved nested loops over a 2D array `Piece[8][8]`.
*   **Storage Cost:** Reading/writing to 64 storage slots.
*   **Computation:** O(N^2) loops to find the King and check threats.

**The Benchmark Shock:**
A simple "Scholar's Mate" (4 moves) in the initial version consumed a staggering **106,000,000 gas**. For context, the Ethereum block gas limit is 30 million. You literally couldn't play a short game in a single block.

## Optimization 1: Flattening the Board

The first major leap in GasChess was moving from a 2D array to a 1D array.

**Unoptimized (v0):**
```solidity
Piece[8][8] board; // 2D array
// Accessing requires double calculation or pointer arithmetic by the compiler
board[x][y] = piece;
```

**Optimized (v1):**
```solidity
Piece[64] board; // 1D array
// Manual index calculation
function index(uint256 x, uint256 y) internal pure returns (uint256 idx) {
    unchecked { idx = x * 8 + y; }
}
board[index(x, y)] = piece;
```

**The Impact:**
By flattening the array and removing signed integers, the gas cost for the same test dropped from **106M** to **~23M gas**. A 78% reduction, but still painfully high.

## Optimization 2: Bitpacking the Board (The "Extreme" Step)

While the current GasChess implementation uses `Piece` structs, true extreme optimization demands we abandon standard types. A chess board has 64 squares. Each square needs to store:
*   **Piece Type:** (Empty, Pawn, Rook, Knight, Bishop, Queen, King) -> 3 bits (0-6).
*   **Color:** (White, Black) -> 1 bit.

Total: 4 bits per square.
`64 squares * 4 bits = 256 bits`.

This leads to a revelation: **The entire Chess board can fit into a single `uint256` storage slot.**

**The "Holy Grail" Pattern:**
Instead of `Piece[64] board`, we use:
```solidity
uint256 board; // The whole game state
```

**Reading a piece:**
```solidity
function getPiece(uint256 _board, uint8 index) internal pure returns (uint8) {
    // Shift to the right position and mask the last 4 bits
    return uint8((_board >> (index * 4)) & 0xF);
}
```

**Writing a piece:**
```solidity
function setPiece(uint256 _board, uint8 index, uint8 pieceValue) internal pure returns (uint256) {
    uint256 mask = ~(uint256(0xF) << (index * 4)); // Create a hole at the index
    uint256 cleared = _board & mask; // Clear the old piece
    return cleared | (uint256(pieceValue) << (index * 4)); // Insert new piece
}
```
This reduces the SLOAD (storage load) cost from potentially 64 separate loads (in a loop) to **1 SLOAD** for the entire board state.

## Optimization 3: Assembly Shortcuts

Solidity adds safety checks that cost gas. For a game engine where we can mathematically prove bounds, we can use Yul (Assembly) to bypass them.

**The Loop Problem:**
Solidity `for` loops include boundary checks and overflow checks (post-0.8.0).

**Optimized Assembly Loop:**
```solidity
assembly {
    let length := 64
    for { let i := 0 } lt(i, length) { i := add(i, 1) } {
        // Custom logic here
        // Direct memory access: mload(add(board, mul(i, 0x20)))
    }
}
```

Additionally, checking for checkmate involves iterating through opponent pieces. With bitpacking, we can use bitwise operations to check "attack rays" (like bitboards in traditional chess engines) rather than iterating loops.
*   **Rook Attacks:** Precompute masks for every square.
*   **Check:** `(rookMask & board) != 0` tells you instantly if a path is blocked, replacing a `while` loop.

## Conclusion

GasChess illustrates that "working code" is just the starting line on Ethereum.
1.  **Naive v0:** 106M Gas (Unplayable)
2.  **Flattened v1:** 23M Gas (Deployable, but expensive)
3.  **Bitpacked (Theoretical):** < 500k Gas (Playable)

The journey from v1 to v2 will require abandoning the comfort of `structs` for the raw power of `uint256` bit manipulation, proving that in Solidity, the most expensive resource isn't code complexity—it's storage.
