---
title: "ERC-2612: The Ultimate Guide to Gasless ERC-20 Approvals — part 2"
date: 2023-03-23T12:00:00Z
draft: false
subtitle: "A deep dive into the Solidity code of gasless ERC-20 approvals ERC-2612"
category: "solidity"
tags: ["ERC-2612", "ERC-20", "EIP-712", "Solidity", "Smart Contracts"]
icon: "code-2"
iconColor: "text-red-400"
featured: false
description: "A deep dive into the Solidity code of gasless ERC-20 approvals ERC-2612"
mediumUrl: "https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-part-2-9c90c01eb69d"
---



![Generated via mid journey, prompt : A person who handles a contract to a machine ethereum](/assets/erc-2612-part-2/1*d73bfBrfgkwqNMlshB0fPw.png)

Hi everyone, welcome back to the second article of my series on ERC-2612! If you missed the [first article](https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-2cd32ddee534), we covered the general overview of ERC-2612, an ERC-20 token extension that leverages EIP-712 signatures for approving spenders.

This ingenious combination simplifies and streamlines user interactions with DeFi platforms, like the one I worked on at [Frak](https://frak.id/).

Today, we’re diving into the nitty-gritty of implementing ERC-2612 in Solidity while incorporating EIP-712. We’ll explore the domain separator, the Permit type, the permit function, and the implementation intricacies, such as nonce management and deadlines.

Here’s a breakdown of the article series:

1.  [Part 1: General overview of ERC-2612 (March 13, 2023)](https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-2cd32ddee534)
2.  _Part 2: Solidity development of ERC-2612 (this article)_
3.  Part 3: Unit testing with Hardhat or Forge (coming soon)
4.  Part 4: Implementation with Ether.js and Fireblocks (coming soon)

By the end of this article, you’ll be well-equipped to implement ERC-2612 and EIP-712 in Solidity and fully leverage their benefits for your own ERC-20 tokens, enhancing user experience, flexibility, and integration with other DeFi protocols.

So let’s dive in!

## 1. Adding EIP-712 Support

To implement EIP-712 in our existing ERC-20 token contract, we’ll first define the required domain separator type hashes.

![EIP712 domain type hash](/assets/erc-2612-part-2/1*eqOETe2hVw_OmBEGmCRJGg.png)

> You can add a “bytes32 salt” at the end of the domain typehash, if you’re protocol contain multiple implementation.
> 
> The chainId is optional, we use it at Frak since we are planning on bridging our FrkToken to multiple chain.

Next, we need to store the domain separator itself:

![Contract variable that hold the domain separator](/assets/erc-2612-part-2/1*iFmw6e2rp_hvkiV8w9PDlg.png)

Initialize the `DOMAIN_SEPARATOR` in the constructor of your ERC-20 token contract, by calling a function similar to this one ([github](https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/utils/EIP712Base.sol#L53)):

![EIP712 Domain separator creation](/assets/erc-2612-part-2/1*_wl6r8L2QmrOY3Qzs1BNiw.png)

The `getChainId()` method is just a simple helper function that return the current chainId. If you are using solidity 0.8+ you can simply use `block.chainid`.

![Small helper to retrieve the chainId](/assets/erc-2612-part-2/1*pRtw5_EH9YDZBm_2D2I6aQ.png)

## 2. Adding ERC-2612 Support

Now, let’s add support for ERC-2612 by creating the `Permit` type hash and adding the `nonces` mapping:

![Permit typehash](/assets/erc-2612-part-2/1*lJAVxBGInkxyvGNv8w8hlg.png)![Contract variable that hold user nonces](/assets/erc-2612-part-2/1*yfuZAuTSBSYwHHtrpXZb-A.png)

Next, implement the `permit` function ([github](https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/tokens/FrakTokenL2.sol#L124)):

![Permit function in the ERC20](/assets/erc-2612-part-2/1*L6NgBqYMarAjBVV-zNAD4w.png)

The `permit` function constructs the EIP-712 typed data structure, hashes it, and verifies the signer's address using the `ecrecover` function. If the signature is valid and the deadline has not expired, it calls the internal `_approve` function to update the allowance mapping.

For the error, we are using assembly and error to be more gas efficient (less memory used and no need to send a string)

Here we are using a small helper function `toTypedMessageHash()` , that help us create EIP-712 typed data hashes ([github](https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/utils/EIP712Base.sol#L72)).

![Creation of typed message hash](/assets/erc-2612-part-2/1*x5vcOTb8LGtMpydeprADOg.png)

We are using assembly here to be more gas efficient.

With these changes in place, your ERC-20 token contract now supports both ERC-2612 and EIP-712. Users can approve spenders via signatures instead of transactions, making interactions with your token contract more efficient and user-friendly.

## 3. Some pitfalls of implementation

### 3.1 Deadlines and Time Synchronization

When implementing the `permit` function, it's essential to manage deadlines effectively. Using `block.timestamp` for deadline comparisons can help prevent attacks related to manipulating block time. However, it's worth noting that the `block.timestamp` value is determined by miners and can be off by a few seconds, so take this into account when setting deadlines for permit signatures.

### 3.2 Signature Security

Always be cautious about the security aspects of signature handling. For example, ensure that your implementation properly validates the recovered address to avoid potential vulnerabilities. Additionally, be aware that the `ecrecover` function returns the zero address if the signature is invalid, so always check for this scenario in your implementation.

### 3.3 Gas Costs

While using signatures for approvals can reduce gas costs for users, the actual `permit` function itself might be gas-intensive due to the cryptographic operations involved, such as `keccak256` and `ecrecover`. It's crucial to analyze and optimize gas costs during the development process to ensure that your implementation remains efficient and cost-effective.

### 3.4 Chain ID Changes

The EIP-712 domain separator includes the chain ID to prevent replay attacks across different networks. However, it’s essential to remember that the chain ID can change in certain situations, such as during a network upgrade or a hard fork. When this occurs, the domain separator must be updated accordingly. One solution is to implement a function that allows the contract owner to update the domain separator when a chain ID change occurs.

### 3.5 Debugging Signature Issues

During the implementation process, you may encounter issues related to signature verification. Debugging these issues can be challenging, as cryptographic functions tend to be less intuitive and harder to trace. To help overcome this pain point, it’s crucial to become familiar with the EIP-712 specification, understand the expected input format for the `ecrecover` function, and use test cases to verify the correctness of your signature generation and verification code.

From my personal experience, I highly recommend setting up Foundry unit tests and emitting numerous events at each step of the process to confirm the accuracy of your implementation. Utilizing a Foundry test case with a high verbosity output (e.g., -vvvv) will allow you to monitor all events, making it much easier to identify and resolve potential issues that may arise.

By keeping these potential pitfalls in mind, you can ensure a robust and secure implementation of ERC-2612 and EIP-712 in your ERC-20 token contract.

## Conclusion

Congratulations! You’ve now unlocked the full potential of ERC-2612 and EIP-712 in Solidity. By combining these standards, your ERC-20 tokens will enjoy improved user experience and seamless integration with the ever-evolving DeFi ecosystem.

But don’t stop here! Keep an eye out for the next articles in this series, where we’ll cover unit testing with Hardhat or Forge and implementing ERC-2612 using Ether.js and Fireblocks. If you found this article helpful, please give it a clap, share it, and follow me for more insightful articles on Solidity and the DeFi world.

Ready for the next adventure? Let’s continue our journey into the world of DeFi together!