---
title: "ERC-2612: The Ultimate Guide to Gasless ERC-20 Approvals — part 1"
date: 2023-03-13T12:00:00Z
draft: false
subtitle: "How to use EIP-712 signatures to save gas, batch approvals and increase security for your ERC-20 tokens."
category: "solidity"
tags: ["ERC-2612", "ERC-20", "EIP-712", "Gasless", "Solidity"]
icon: "code-2"
iconColor: "text-red-400"
description: "How to use EIP-712 signatures to save gas, batch approvals and increase security for your ERC-20 tokens."
mediumUrl: "https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-2cd32ddee534"
group: "web3"
---




![Generated via mid journey, prompt : A futuristic cityscape with Ethereum logo](/assets/erc-2612-part-1/1*vLvlrzsOeqOin6rx9uXKCg.png)

If you are a developer or a user of ERC-20 tokens, you probably know how annoying and costly it is to approve a spender contract before it can transfer tokens on your behalf. You have to send a transaction, pay gas fees, wait for confirmation and hope that nothing goes wrong.

But what if I told you that there is a better way to do approvals? A way that is **faster**, **cheaper**, **safer** and more **user-friendly**? A way that uses EIP-712 signatures instead of transactions?

I’ve discovered that [**ERC-2612**](https://eips.ethereum.org/EIPS/eip-2612) was the solution to those issues. It’s an extension for [**ERC-20**](https://eips.ethereum.org/EIPS/eip-20) tokens that allows users to approve spenders via [**EIP-712**](https://eips.ethereum.org/EIPS/eip-2612) signatures instead of transactions. EIP-712 is a standard for hashing and signing typed structured data as opposed to just bytestrings.

In this article, I will explain what is ERC-2612 and how it can improve the **user experience** and **security** of ERC-20 approvals. I will also show you how to implement it in Solidity contracts and how to test it with [**Hardhat**](https://hardhat.org/) or [**Foundry**](https://github.com/foundry-rs/foundry). Finally, I will demonstrate how to use it with [**Ether.js**](https://github.com/ethers-io/ethers.js) and [**Fireblocks**](https://www.fireblocks.com/) libraries.

By implementing ERC-2612 at Frak, we makes it easier and cheaper for users to interact with our platform and other DeFi protocols.

This will be a series of articles divided into four parts:

*   _Part 1: General overview of ERC-2612 (March 13, 2023)_
*   [Part 2: Solidity development of ERC-2612](https://medium.com/p/9c90c01eb69d)
*   Part 3: Unit testing with Hardhat or Forge
*   Part 4: Implementation with Ether.js and Fireblocks

By the end of this series, you will be able to use ERC-2612 for your own ERC-20 tokens or interact with existing ones that support it. You will also learn how [**Frak**](https://frak.id/) leverages ERC-2612 to enable gasless token transfers and frictionless DeFi interactions.

Let’s get started!

### How does ERC-2612 work?

ERC-2612 introduces a new function called **permit** that takes an **EIP-712 signature** as an input and updates the allowance mapping accordingly. The signature must contain the following fields:

*   **owner**: The address of the token owner who signed the message
*   **spender**: The address of the spender contract who can transfer tokens on behalf of the owner
*   **value**: The maximum amount of tokens that can be transferred by the spender
*   **nonce**: A unique number that prevents replay attacks
*   **deadline**: A timestamp after which the signature is invalid
*   **v, r, s:** The components of the EIP-712 signature that proves the owner’s consent

The signature must follow a specific format defined by **EIP-712**. It must include a **domain separator** and a **type hash** that identify the token contract and the permit function. It must also encode and hash the parameters according to a **specific schema**.

In our case, the parameter for the signature are the following:

![Permit signature format, following the ERC-2612](/assets/erc-2612-part-1/1*bBueyoHdmADcTTl8BVjU6Q.png)

The token contract then verifies that the signature is valid and matches the parameters. If so, it **updates the allowance** mapping accordingly.

This means that the token contract performs **two checks** before updating the allowance mapping:

1.  It checks that the signature is valid. This involves **hashing** the parameters using EIP-712 and **recovering** the signer’s address from the signature using ‘_ecrecover’_. Then it compares the recovered address with the owner address provided in the parameters. If they match, it means that the owner has signed the message and consented to approve the spender. Otherwise, it means that someone else has forged or tampered with the signature and it should be rejected.
2.  It checks that the parameters are valid. This involves checking that the **deadline** has not expired, that the **value** is not greater than the owner’s balance, and that the **nonce** is the current one for the owner (to prevent replay attack’s). If these conditions are met, it means that the approval is still valid and can be executed. Otherwise, it means that something has changed since the owner signed the message and it should be rejected.

If both checks pass, then it means that everything is in order and there is no reason to deny or delay the approval. Therefore, it updates the allowance mapping.

This allows the _spender_ to transfer up to _value_ tokens on behalf of _owner._

This way, the owner does not have to send a transaction to approve the spender. They can sign a message offline and send it to anyone who can submit it to the token contract. They can also revoke or change their approval at any time by signing a new message with a different value.

ERC-2612 has been adopted by many popular ERC-20 tokens, such as **DAI**, **UNI**, **COMP** etc. It has also been integrated with many DeFi protocols and platforms, such as [**Uniswap**](https://uniswap.org/), [**Compound**](https://compound.finance/), [**Aave**](https://aave.com/), [**Frak**](https://frak.id/) etc. It has become a de facto standard for gasless ERC-20 approvals and transfers.

## What are the benefits of ERC-2612?

In my experience, using EIP-712 signatures for approvals has several **advantages** over using **transactions**.

*   **Gas savings**: Users don’t have to send any transactions or pay any gas fees to approve spenders. They can simply sign a message with their private key and send it to the spender contract or a third-party service that can relay it to the contract.
*   **Batching**: Users can approve multiple spenders with one signature by using different **nonces** or **values**. This **reduces friction** and **complexity** for users who want to interact with multiple contracts or services. In my experience with Frak, where we have custodial wallets and pay for a lot of user gas fees, batching has been particularly important.
*   **Security**: Users can include additional parameters such as expiry time or maximum amount in their signatures. This gives them more control and flexibility over their approvals and prevents replay attacks or unlimited spending.

## Pain points of implementing ERC-2612

While ERC-2612 offers many benefits for ERC-20 approvals, it also comes with some **challenges** and **trade-offs** that you should be aware of before implementing it.

One of the main pain points is the **complexity** of EIP-712 signatures. EIP-712 is a standard for hashing and signing typed structured data as opposed to just bytestrings. This means that you have to define a domain separator and a type hash for your permit function, as well as encode and hash the parameters according to a specific format.

This can be tricky and error-prone, especially if you are not familiar with EIP-712 or low-level Solidity operations. Fortunately, there are some **libraries** and **tools** that can help you with this task, such as OpenZeppelin contracts, Hardhat EIP-712 plugin, Ether.js utils, Fireblocks SDK, etc.

Another challenge I have encountered is ensuring compatibility with different wallets and providers. Not all wallets support EIP-712 signatures natively which may require workarounds or fallbacks to make your permit function work with them. For example, some wallets may require a signature prefix (such as “_\x19Ethereum Signed Message:\n32”_) or a different chain id than expected. (I’ve lost a day or two with this !)

You also have to consider how your users will sign their permits. Will they use MetaMask, WalletConnect, Ledger, Trezor, etc.? Will they sign on-chain or off-chain? Will they sign using their private key or a smart contract (such as EIP-1271 )? These factors may affect how you implement and test your permit function.

Finally, you have to be careful about security issues and edge cases when using permits. For instance, you have to prevent replay attacks by using nonces and validating chain ids . You also have to handle expiration dates and invalid signatures gracefully. You may also want to add some extra checks or events for debugging purposes.

As you can see, implementing ERC-2612 is not trivial and requires some attention to detail.

However, once you get it right, you will enjoy the benefits of gasless ERC-20 approvals for yourself and your users. Stay tuned for the second part of this article series where I will cover the **Solidity implementation** of ERC 2612.

I hope this article has provided valuable insights into its **benefits** and **challenges**. If you found it helpful, please don’t hesitate to **follow** me and give this article a **clap**.