---
title: "From Idea to Innovation: Unveiling Our WebAuthN Smart Wallet Demo"
date: 2025-02-23T12:00:00Z
draft: false
subtitle: ""
category: "solidity"
tags: ["WebAuthN", "Smart Wallets", "Account Abstraction", "ERC-4337", "UX"]
icon: "code-2"
iconColor: "text-red-400"
featured: false
description: "Welcome to an exciting milestone at [Frak-Labs](https://frak.id/)! Before we unveil our latest Proof of Concept (POC) and the unique challenge it aims to tackle, let’s take a moment to revisit our ..."
mediumUrl: "https://medium.com/frak-defi/from-idea-to-innovation-unveiling-our-webauthn-smart-wallet-demo-4310eae5ae66"
group: "frak"
---




![captionless image](/assets/webauthn-release/1*WRrrKvDmuDGDnkU10Mm3-g.png)

Welcome to an exciting milestone at [Frak-Labs](https://frak.id/)! Before we unveil our latest Proof of Concept (POC) and the unique challenge it aims to tackle, let’s take a moment to revisit our roots and the journey that brought us here.

At the heart of Frak-Labs, our mission emerged from witnessing transformative shifts within the content market, initially inspired by the burgeoning creator economy. However, as we navigated through this evolving landscape, we uncovered a series of persistent challenges. Central to these was the issue of **centralization** — a system where intermediaries disproportionately benefited at the expense of creators and publishers, eroding the profits meant for those who actually create value.

Moreover, publishers face a slew of emerging hurdles: the impending **end of cookies**, an oversaturated subscription model leading to **subscription fatigue**, and a noticeable decline in household spending on subscriptions. These challenges not only threaten the sustainability of content publishing but also stifle innovation and fairness within the ecosystem.

Building on the success of our MVP, which introduced a novel revenue stream for content creators by rewarding users for their engagement and investment in content, we’re now setting our sights on addressing a critical question: **How can we revolutionize the content publishing space?**

This ambition led to the creation of our latest POC, leveraging the power of WebAuthN based smart wallets and account abstraction to unlock unprecedented potential within the Frak ecosystem. Stay tuned as we unveil the details of this innovative solution, designed to empower creators and publishers alike, paving the way for a more equitable and decentralized content market.

**Disclaimer:** This is a Proof of Concept (POC), not ready for production and runs on the Polygon Mumbai testnet. Please refrain from transferring real assets to wallet addresses, and be prepared for potential bugs. Your feedback is valuable as we work towards improvement.

## Why This POC?

**High churn rates** in the newspaper market sparked our initiative. Users often back away at the sight of a paywall — discouraged by the tedious steps of account creation, entering payment details, and navigating through subscriptions. Not to mention, the **high fees** that companies incur with each subscription add to the dilemma.

Our journey with the MVP taught us valuable lessons about **user experience**. We’ve been creating numerous wallets, aiming for the simplest UX possible. This experience led us to believe in a better solution.

Enter the world of **smart wallets** and **account abstraction**. This sector is on fire with innovations. Technologies like **WebAuthN** stand out, promising a future where accessing wallets through **biometrics** is streamlined, yet remains decentralized — no complex setups like MPC needed.

This sparked an idea: What if we could **eliminate traditional paywalls** by instantly creating wallets for users? Imagine swapping the convoluted subscription process for a quick **biometric check**.

![captionless image](/assets/webauthn-release/1*BwT263kA4_-ZMAjKAlj6RQ.png)

That’s the core reason behind our POC. We’re on a mission to show how blockchain technology can meet real-world needs. Imagine unlocking an article or subscribing with a few tokens — all made simple, aiming to **reduce churn rates** for newspapers.

Using a **smart wallet** for these tasks offers more than convenience. It allows for anonymous tracking of reader preferences — like favorite articles and topics — without invading privacy. As the era of cookies ends, this presents a **privacy-centric solution** for content providers.

## The Demo Itself

Dive into our Proof of Concept (POC) through this hands-on demo. It’s designed to showcase the seamless integration of our technology in real-world scenarios. Here’s what makes up the demo:

**1. Frak-SDK**

*   A **simple SDK** for content publishers to integrate with the Frak ecosystem easily.
*   Provides user-specific information for content, such as **unlock status, pricing**, and **balance checks**.
*   **Fully offchain** compatibility, perfect for PWA apps distributing content with the Frak wallet installed — ensuring no connectivity issues.
*   **Secure communication** through various methods including verification hashes, data obfuscation, and origin checks.

**2. Newspaper Website**

*   A straightforward implementation showcasing an article without any blockchain or external API knowledge.
*   Utilizes **Frak-SDK** to obtain real-time access information (user permissions, pricing for unlocks) and initiates the unlock process.

**3. The Wallet Website**

*   A **Progressive Web App (PWA)**, installable on phones for offline use.
*   Built using **account abstraction** (thanks to ZeroDev for the Kernel account, and Pimlico for the bundler and paymaster).
*   Account creation and transactions are **WebAuthN** enabled, allowing for biometric operations.
*   Soon to support **multiple asset types** and integration with WalletConnect, making it usable on any dApp in the market.
*   Handles **Frak-SDK requests**, facilitating communication with the content provider.

**What the Demo Showcases:**

*   **Kernel wallet** creation and recovery using only biometrics — no backend required.
*   Wallet interactions solely through biometrics.
*   **Secure cross-domain communication** client-side, enabling smooth operation on offline devices.
*   A glimpse into the **future of content paywalls**, leveraging blockchain for a frictionless user experience.

**Visual Demonstrations:**

This GIF guides new users from clicking the unlock link at the bottom of an article through the intuitive setup and use of the wallet.

![captionless image](/assets/webauthn-release/1*Z8lw8dMVfVhTlHaR_xjwNQ.gif)

**Experience the Flow Yourself:**

1.  **Start by visiting** our FrakDemo Twitter account at [https://twitter.com/FrakDemo](https://twitter.com/FrakDemo) to find a selection of article links.
2.  **Click on** “Unlock with FRK” after selecting an article, and then pick a pricing option.
3.  **Simply follow** the prompts — a seamless process requiring no more than three clicks to complete the flow (or just two clicks if you already have a wallet!).
4.  **Dive into** your chosen content and enjoy.

**Additional Tips:**

*   **Checking Your Wallet**: Visit [poc-wallet.frak.id](https://poc-wallet.frak.id/) to view your wallet. If you aren’t automatically logged in after an article unlock or purchase — something that might occur on Apple devices due to their specific sandboxing — don’t worry. Simply use the **Recover wallet** feature with the same passkey from the unlocking process to regain access to your wallet.
*   **What to Expect in Your Wallet**: For now, the wallet page may look a bit sparse, but expect this to change dramatically in the next few weeks. You’ll currently find a **history section** with links to your unlocked articles. In the settings, there’s an option to **acquire test FRK tokens**, allowing for further exploration of the flow. Rest assured, we’re working on enriching the wallet’s functionalities and interface, aiming to significantly enhance your experience shortly.

## How Does It Work Under the Hood?

Got a flair for the technical? If you’re the kind who enjoys puzzles more complex than trying to find your way in a new city without GPS, here’s a treat. Check out our sequence flow diagram — it’s like the blueprint for a secret tech lair, minus the secret handshake: [https://github.com/frak-id/wallet/blob/main/docs/graphs.md](https://github.com/frak-id/wallet/blob/main/docs/graphs.md)

Integrating a **smart wallet with a WebAuthN validator** introduces complex challenges, prominently the **domain lock** issue, which significantly influenced our architecture:

*   **Domain Lock Challenge**: Passkeys are restricted to a specific domain — our case being [frak.id](http://frak.id/). They are only functional within this domain, affecting both their creation and use for signing transactions.

This challenge led us to develop an SDK that simplifies the interaction between content providers and our wallet, making transaction initiation straightforward:

*   **SDK Overview**: Our SDK enables content providers to fetch user-specific details like content unlock status, pricing, and balance. Designed for full off-chain functionality, it ensures seamless operation, even in PWA apps, without connectivity issues.
*   **Secure Transmission**: Data security is paramount, achieved through obfuscation and multiple verification layers. Future updates will incorporate asymmetric signatures or HMAC for even stronger security.

**Transaction Process**: Upon requesting a transaction, users are redirected to their wallet page or app, filled with necessary transaction details. After validation, the user is prompted to authorize the transaction. Thanks to collaboration with Pimlico and their SDK, the transaction is then bundled and sent to the bundler, facilitating a swift user experience without unnecessary wait times on the wallet page.

**Communication Between Content Provider and Wallet**: Maintaining a secure and efficient communication line is crucial. Post-transaction, content providers can query the wallet for the transaction’s status, ensuring a seamless flow of information.

**Implementing Secure and Efficient Communication**: We faced the challenge of ensuring robust communication that supports offline access and is easy for publishers to integrate, regardless of their technology stack. Our solution involves using an iframe for secure, cross-domain communication, establishing a direct and secure channel within the browser environment.

**Security and Accessibility**: Security and user-friendliness are our top priorities. We’ve designed the system to be inclusive, allowing for easy integration across various technology levels while ensuring a secure exchange of information to prevent fraudulent access.

**Future Directions**: We plan to expand the SDK features, including signature requests and external APIs, based on publisher feedback. This POC is a glimpse into a future where digital content is more accessible, potentially eliminating traditional paywalls and introducing new monetization strategies for content providers.

![captionless image](/assets/webauthn-release/1*dAJa5H68_H7jyqoAt8tekQ.png)

## What’s Next?

As we forge ahead, our team is thrilled to enhance the demo of our wallet with an array of **new functionalities** in the coming weeks:

1.  **Global ERC-20 Asset Management**: Users will soon be able to receive, send, and track a variety of assets directly within the wallet’s UI, making asset management seamless and intuitive.
2.  **Expanded Content Unlocking Demos**: We’re exploring beyond articles — what would you like to unlock next? Cinema tickets? Music streaming access? Let us know your thoughts!
3.  **NFT Asset Handling**: The integration of NFTs is on our roadmap, enabling users to manage their digital collectibles and art within our ecosystem.
4.  **WalletConnect Integration**: To ensure our wallet’s versatility, we’ll introduce WalletConnect support, allowing it to be used on any website.

Following these updates, our focus will shift towards **developing a production-ready version** of the wallet. In collaboration with our partners, we’ll launch an alpha release to our current users for thorough testing. This phase is crucial for ensuring reliability and user satisfaction.

Once we’re confident in the wallet’s performance, we’ll roll it out for public use. This means **you** could soon experience the convenience and security of our WebAuthN-based smart wallet firsthand.

Stay tuned for these updates and more as we continue to innovate at the intersection of blockchain technology and user experience. Together, we’re not just building a wallet; we’re shaping the future of digital interactions and transactions.

## Acknowledgments

We’d like to extend our heartfelt thanks to the teams and individuals who’ve played a crucial role in bringing this POC to life:

*   [**Yoan**](https://twitter.com/slovaye) **from** [**Cometh**](https://www.cometh.io/): An expert in the WebAuthN space whose guidance has been indispensable throughout our journey.
*   [**ZeroDev**](https://zerodev.app/): For providing the foundational [Kernel smart wallet](https://github.com/zerodevapp/kernel) technology and invaluable support during the custom validator implementation.
*   [**Pimlico**](https://www.pimlico.io/): For their [permissionless SDK](https://github.com/pimlicolabs/permissionless.js), bundler, and paymaster services that have been instrumental in our development process, along with their ongoing support.

This project stands as a testament to the power of collaboration within the blockchain community. A big thank you to everyone involved for their contributions, insights, and unwavering support.

## Conclusion

As we reach the end of this journey together, we hope you’ve found inspiration and insight in the possibilities that our Proof of Concept opens up — not just for content publishing but for the broader landscape of digital interactions. Our journey is far from over, and your support plays a pivotal role in shaping its direction.

**We warmly invite you to:**

*   **Clap and Share**: If this article resonated with you, please don’t hesitate to applaud it and share it within your networks. Each clap and share not only amplifies our message but also fuels our passion and commitment to innovation.
*   **Explore the Demo**: Dive into the experience yourself by exploring our demo. Witness firsthand the simplicity and power of our solution, and if it inspires or excites you, we’d be thrilled if you shared it with others who might appreciate it as well.

This project is a testament to the power of collaboration, innovation, and community support. Together, we’re not just imagining the future — we’re actively building it. So, whether you’re a developer, content publisher or creator, or simply an enthusiast for cutting-edge technology, your engagement, feedback, and shares are invaluable to us.

Let’s continue to break new ground, challenge the status quo, and reshape the world of digital content together. Thank you for being an integral part of our journey.

**Your voice, your support, and your curiosity are what drive us forward. Let’s make waves, together.**

## Further Reading

Dive deeper into our exploration and collaborative insights with this curated list of articles on Medium. These pieces, co-authored with Yoan from Cometh, delve into various facets of blockchain technology, smart wallets, and our journey in developing this POC:

*   [Explore Our Collaborative Articles on Medium](https://medium.com/@quentin.nivelais/list/webauthn-collaboration-fc06acc0823b)

This collection provides a comprehensive look at our collaborative efforts, offering valuable perspectives and insights into the evolving landscape of blockchain technology.