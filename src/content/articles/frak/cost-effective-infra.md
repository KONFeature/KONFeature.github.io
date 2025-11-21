---
title: "Building Cost-Effective Blockchain Infrastructure: A Journey with eRPC and Ponder"
date: 2025-01-07T12:00:00Z
draft: false
subtitle: ""
category: "devops"
tags: ["Blockchain Infrastructure", "DevOps", "eRPC", "Ponder", "Cost Optimization"]
icon: "code-2"
iconColor: "text-red-400"
description: "Every blockchain project starts with a dream and a limited budget. At [Frak](https://frak.id), we built a platform for **automated on-chain reward distribution** that powers marketing campaigns thr..."
heroImage: "./assets/cost-effective-infra/1*DD14czyaEcv4zp54WF-rhQ.png"
mediumUrl: "https://medium.com/frak-defi/unlocking-the-future-webauthn-meets-erc-4337-smart-wallets-e472b340452b"
group: "frak"
---

![captionless image](./assets/cost-effective-infra/1*DD14czyaEcv4zp54WF-rhQ.png)

Every blockchain project starts with a dream and a limited budget. At [Frak](https://frak.id), we built a platform for **automated on-chain reward distribution** that powers marketing campaigns through smart contracts. Running entirely on Arbitrum, our infrastructure needs to handle:

*   **High-frequency events**: Processing ~8 user tx per week per active user
*   **Complex queries**: Real-time analytics and reward calculations
*   **Multi-contract indexing:** 8 master contracts and 3 active factories (with, at the time of writing, ~100 contracts deployed).

When your core business logic lives on-chain, your infrastructure needs to be bulletproof while keeping costs under control. Here’s how we built it using open-source tools.

### The Challenge

Every blockchain application faces three core challenges:

1.  Reliable and cost-effective RPC access
2.  Efficient event indexing and data access
3.  Scalable infrastructure that doesn’t break the bank

Most teams throw money at the problem. We took a different approach.

## eRPC: Your Chain’s Traffic Controller

[eRPC](https://www.erpc.cloud/) is like the air traffic controller for your blockchain requests — but one that also has a photographic memory and cost-optimization superpowers. Written in Go for maximum performance, it’s a fault-tolerant EVM RPC load balancer that makes your typical proxy look like a rusty gate.

### Key Features That Made Us Choose eRPC

**Intelligent Load Balancing**

*   Per-method routing (because let’s face it, not all RPCs are created equal)
*   Project-specific configurations (different strokes for different folks)
*   Automatic fallback handling (because uptime is not just a nice-to-have)

**Smart Caching**

*   Reorg-aware permanent caching (no more stale data nightmares)
*   Method-specific cache rules (cache what matters, ignore what doesn’t)
*   Selector-level granularity (because sometimes you only need to cache specific contract calls)

**Developer Experience Superpowers**

*   Need to scale your dev team? Got smart contract tests hitting your RPC like a MEV bot during an airdrop? eRPC’s project system lets you:
*   Create dedicated environments for different teams
*   Implement IP-based or wallet signature auth
*   Configure aggressive caching for test environments
*   Zero config changes for developers (it just works™)

### Power in Simplicity

Want to see how easy it is to do complex things? Here’s an eRPC config that handles multi-provider load balancing, rate limiting, method-specific routing and caching:

```
export default initErpcConfig({
    logLevel: "info",
    database: {
        // Here you can list every db used (pg, redis, in memory etc), and then config which one are used depending on the type of data, or even the method used
        // Frak config here: https://github.com/frak-id/infra-blockchain/blob/6e907c50db2117083a113ee74e2d38d1a6b596ea/packages/erpc/src/storage.ts
        evmJsonRpcCache: cacheConfig,
    },
})
    .addRateLimiters({
        // Yup, you can even go in depth with per method rate limiting
        alchemy: [{ method: "*", maxCount: 300, period: "1s", waitTime: "5s" }],
        pimlico: [{ method: "*", maxCount: 100, period: "1s", waitTime: "5s" }],
        drpc: [{ method: "*", maxCount: 100, period: "1s", waitTime: "5s" }],
        // And yup, rate limits can also be applied to networks, auth strategies, projects, etc
        walletProject: [{ method: "*", maxCount: 1000, period: "1s", waitTime: "5s" }],
    })
    // Add a few networks to the config
    .decorate("networks", {
        arbitrum: arbNetwork,
        arbitrumSepolia: arbSepoliaNetwork,
    })
    // Add a few upstreams to the config
    // Frak upstreams config: https://github.com/frak-id/infra-blockchain/blob/main/packages/erpc/src/upstreams.ts
    .decorate("upstreams", {
        alchemy: alchemyUpstream,
        drpc: drpcUpstream,
        pimlico: pimlicoUpstream,
    })
    .addProject(({ store: { upstreams, networks } }) => ({
        id: "wallet-rpc",
        // Smart routing: Pimlico for AA, Alchemy for everything else, dRPC as fallback
        upstreams: [            upstreams.alchemy,
            upstreams.pimlico,
            upstreams.drpc
        ],
        networks: [networks.arbitrum, networks.arbitrumSepolia],
        // Rate limiting with the budget defined before
        rateLimitBudget: "walletProject"
    }))
    .build();
```

In this example we are using the [erpc-config-generator](https://github.com/KONFeature/erpc-config-generator) package that provide the builder pattern, you can also directly use the [erpc typescript config](https://github.com/erpc/erpc/tree/main/typescript/config).

### Our Production Setup

And here’s how eRPC makes blockchain load balancing and multi-RPC routing look easy and helps us achieve virtually no downtime:

**Indexing Projects**

*   Primary: Envio + dRPC
*   Fallback: Alchemy
*   Why? Cost optimization for high-volume historical queries

**General Purpose (Frontend + Backend + Foundry)**

*   Primary: Alchemy + Pimlico
*   Fallback: dRPC
*   Auxiliary: Free RPCs for non-critical paths

## Ponder: The Indexer That Sparks Joy

If you’ve ever wrestled with The Graph’s hosting service, [Ponder](https://ponder.sh/) feels like a warm hug from your favorite dev tool. It’s the indexer that makes you remember why you loved blockchain development in the first place.

```
// Track when a campaign distribute a reward
ponder.on("CampaignBanks:RewardAdded", async ({ event, context }) => {
    // Try to find a rewarding contract for the given event emitter
    const bankingContract = await context.db.find(bankingContractTable, {
        id: event.log.address,
    });
    if (!bankingContract) {
        console.error(`Banking contract not found: ${event.log.address}`);
        return;
    }
    // Update the total amount of distributed token for the rewarding contract
    await context.db
        .update(bankingContractTable, {
            id: event.log.address,
        })
        .set({
            totalDistributed:
                bankingContract.totalDistributed + event.args.amount,
        });
    // Update the current user reward (insert it if not found)
    await context.db
        .insert(rewardTable)
        .values({
            contractId: bankingContract.id,
            user: event.args.user,
            pendingAmount: event.args.amount,
            totalReceived: event.args.amount,
            totalClaimed: 0n,
        })
        .onConflictDoUpdate((current) => ({
            pendingAmount: current.pendingAmount + event.args.amount,
            totalReceived: current.totalReceived + event.args.amount,
        }));
    // Insert the reward event
    await context.db.insert(rewardAddedEventTable).values({
        id: event.log.id,
        contractId: bankingContract.id,
        user: event.args.user,
        emitter: event.args.emitter,
        amount: event.args.amount,
        txHash: event.log.transactionHash,
        timestamp: event.block.timestamp,
    });
    // Update the current campaigns stats for the distributed amount
    await safeIncreaseCampaignsStats({
        productId: bankingContract.productId,
        context,
        blockNumber: event.block.number,
        increments: {
            totalRewards: event.args.amount,
        },
    });
});
```

### Real-World Indexing at Frak

We’re not talking about toy contracts here. We’re indexing:

*   8 master contracts
*   3 active factory contracts
*   On Arbitrum (hello, short block times 👋)
*   Complex marketing campaign tracking
*   Real-time statistics generation

### Why Ponder Won Our Hearts

**Blazing Fast Indexing**

*   Reindexing that doesn’t require a coffee break
*   Internal caching that makes updates feel instant
*   Direct PostgreSQL integration that just works

**Real-world Performance**

*   Handles complex on-chain marketing campaigns
*   Real-time statistics generation
*   Shared database with Web2 backend (bye-bye, unnecessary data transfer)

**Developer Experience That Doesn’t Suck**

*   TypeScript all the way down
*   Built-in HTTP server via Hono
*   Caching and rate limiting included

## Deployment: Because YOLOing to Production is So 2017

[SST](https://sst.dev/) v3 orchestrates our entire deployment with the elegance of a perfectly executed flash loan:

![captionless image](./assets/cost-effective-infra/0*MsLG-cXUT1he-wl7)

### Infrastructure as Code Benefits

*   Zero-touch deployments
*   Version-controlled infrastructure
*   Easy environment replication
*   Pulumi under the hood (because when we eventually move to k8s, we won’t need therapy)

### Open Source All The Way Down

Every tool in our stack is open source and actively maintained:

*   [eRPC](https://github.com/erpc): The RPC infrastructure that scales with you
*   [Ponder](https://github.com/ponder-sh/ponder): The indexer that just makes sense
*   [SST](https://github.com/sst/sst): Infrastructure as code that doesn’t make you cry

Want to see how it all fits together? Check out our [blockchain infrastructure repo](https://github.com/frak-id/infra-blockchain) for the complete picture.

### Bootstrap Like a Chad, Spend Like a Bear Market

Here’s the secret sauce for launching your blockchain infrastructure without needing a Series A: smart use of free tiers and efficient architecture. Think of it as yield farming cloud credits and RPC calls.

## The Zero-to-One Infrastructure Stack

**Cloud Foundation** 🌩️

*   AWS Free Tier = 12 months of free t2.micro instances
*   GCP = $300 initial credits
*   Choose your poison, both work great with our stack

**RPC Strategy** 🔌

```
.addProject({
  id: "bootstrap-rpc",
  upstreams: [    // Free RPCs, strategically load balanced
    llamaNodes,     // 25k requests/day
    publicNodes,    // Variable limits
    ankr.free,      // 20k requests/day
    // Add more as you grow
  ]
})
```

**Indexing & API** 📊

*   Self-hosted Ponder = $0 (runs on your free tier instance)
*   PostgreSQL = Free tier on cloud provider
*   Hono endpoints = Comes free with Ponder

### Cost Breakdown for MVP

*   Infrastructure: $0 (cloud credits)
*   RPC Calls: $0 (load balanced free tiers)
*   Indexing: $0 (self-hosted)
*   Your time: Minimal (thanks to these tools)

### When You’re Ready to Scale 📈

Hit the free tier limits? Congratulations, you’ve got traction! When it’s time to graduate from farming free RPCs, check out eRPC’s [aggregator service](https://www.erpc.cloud/aggregator). It’s one unified endpoint for all chains with pre-negotiated provider rates. They’ll even host the eRPC instance for you if infrastructure management isn’t your thing.

## The Results

This setup has allowed us to:

*   Start lean (your VCs will thank you)
*   Scale smoothly as user base grew
*   Maintain high reliability
*   Keep infrastructure complexity manageable
*   Process complex on-chain marketing campaigns in real-time

## What’s Next?

While our current setup is solid, we’re exploring:

*   Kubernetes migration for more deployment flexibility
*   On-premise solutions for cost optimization
*   Further RPC usage pattern optimization

## Conclusion

Building blockchain infrastructure doesn’t have to feel like solving a Rubik’s cube blindfolded. With **open-source tools** like [eRPC](https://www.erpc.cloud/), [Ponder](https://ponder.sh/), and [SST](https://sst.dev/), you can build a **robust, scalable system** that grows with your needs.

At Frak, this infrastructure powers a platform that’s revolutionizing brand advocacy:

*   **Real-time reward distribution** for authentic shares
*   **Transparent, cost-effective** customer acquisition
*   **Direct value flow** from brands to advocates
*   **Scalable word-of-mouth** marketing automation

The best infrastructure is like a good smart contract — it just works, and you only notice it when something goes wrong. And when **87% of people** read reviews before purchasing and **79% trust** customer reviews like friends’ recommendations, you really can’t afford for things to go wrong.