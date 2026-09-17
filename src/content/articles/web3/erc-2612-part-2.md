---
title: "ERC-2612 Part 2: Solidity Implementation with EIP-712"
date: 2023-03-23T12:00:00Z
draft: false
subtitle: "A deep dive into the Solidity code of gasless ERC-20 approvals ERC-2612"
category: "solidity"
tags: ["ERC-2612", "ERC-20", "EIP-712", "Solidity", "Smart Contracts"]
icon: "code-2"
iconColor: "text-red-400"
description: "Implement ERC-2612 permit in Solidity: the EIP-712 domain separator, the Permit typehash, nonce management, and the pitfalls worth knowing upfront."
mediumUrl: "https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-part-2-9c90c01eb69d"
group: "web3"
---



![Illustration of handing a signed permit to a smart contract, ERC-2612 in Solidity](./assets/erc-2612-part-2/erc-2612-contract-machine-hero.png)

Hi everyone, welcome back to the second article of my series on ERC-2612! If you missed the [first article](/articles/web3/erc-2612-part-1/), we covered the general overview of ERC-2612, an ERC-20 token extension that leverages EIP-712 signatures for approving spenders.

This ingenious combination simplifies and streamlines user interactions with DeFi platforms, like the one I worked on at [Frak](https://frak.id/).

Today, we’re diving into the nitty-gritty of implementing ERC-2612 in Solidity while incorporating EIP-712. We’ll explore the domain separator, the Permit type, the permit function, and the implementation intricacies, such as nonce management and deadlines.

Here’s a breakdown of the article series:

1.  [Part 1: General overview of ERC-2612](/articles/web3/erc-2612-part-1/)
2.  _Part 2: Solidity development of ERC-2612 (this article)_
3.  [Part 3: Unit testing with Hardhat and Forge](/articles/web3/erc-2612-part-3/)

By the end of this article, you’ll be well-equipped to implement ERC-2612 and EIP-712 in Solidity and fully leverage their benefits for your own ERC-20 tokens, enhancing user experience, flexibility, and integration with other DeFi protocols.

So let’s dive in!

## 1. Adding EIP-712 Support

To implement EIP-712 in our existing ERC-20 token contract, we’ll first define the required domain separator type hashes. If you need the fundamentals first, start with the [general ERC-2612 overview](/articles/web3/erc-2612-part-1/).

```solidity
bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
    keccak256(bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"));
```

> You can add a “bytes32 salt” at the end of the domain typehash, if you’re protocol contain multiple implementation.
> 
> The chainId is optional, we use it at Frak since we are planning on bridging our FrkToken to multiple chain.

Next, we need to store the domain separator itself:

```solidity
bytes32 internal domainSeperator;
```

Initialize the `DOMAIN_SEPARATOR` in the constructor of your ERC-20 token contract, by calling a function similar to this one ([github](https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/utils/EIP712Base.sol#L53)):

```solidity
function _setDomainSeperator(string memory name) internal {
    domainSeperator = keccak256(
        abi.encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(bytes(name)),
            keccak256(bytes(ERC712_VERSION)),
            getChainId(),
            address(this)
        )
    );
}
```

The `getChainId()` method is just a simple helper function that return the current chainId. If you are using solidity 0.8+ you can simply use `block.chainid`.

```solidity
function getChainId() internal view returns (uint256 id) {
    assembly {
        id := chainid()
    }
    return id;
}
```

## 2. Adding ERC-2612 Support

Now, let’s add support for ERC-2612 by creating the `Permit` type hash and adding the `nonces` mapping:

```solidity
bytes32 internal constant PERMIT_TYPEHASH =
    keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

mapping(address => uint256) internal nonces;
```

Next, implement the `permit` function ([github](https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/tokens/FrakTokenL2.sol#L124)):

```solidity
/// @dev EIP 2612, allow the owner to spend the given amount of FRK
function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
    external
    payable
    override
{
    assembly {
        if gt(timestamp(), deadline) {
            mstore(0x00, _PERMIT_DELAYED_EXPIRED_SELECTOR)
            revert(0x1c, 0x04)
        }
    }

    // Unchecked because the only math done is incrementing
    // the owner's nonce which cannot realistically overflow.
    unchecked {
        address recoveredAddress = ecrecover(
            toTypedMessageHash(
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH,
                        owner,
                        spender,
                        value,
                        nonces[owner]++,
                        deadline
                    )
                )
            ),
            v,
            r,
            s
        );

        // Don't need to check for 0 address, or send event's, since approve already do it for us
        if (recoveredAddress != owner) revert InvalidSigner();

        // Approve the token
        _approve(recoveredAddress, spender, value);
    }
}
```

The `permit` function constructs the EIP-712 typed data structure, hashes it, and verifies the signer's address using the `ecrecover` function. If the signature is valid and the deadline has not expired, it calls the internal `_approve` function to update the allowance mapping.

For the error, we are using assembly and error to be more gas efficient (less memory used and no need to send a string)

Here we are using a small helper function `toTypedMessageHash()` , that help us create EIP-712 typed data hashes ([github](https://github.com/frak-id/frak-id-blockchain/blob/68f6ffcea83b5333839cc0daec11bdcedac3fe33/contracts/utils/EIP712Base.sol#L72)).

```solidity
function toTypedMessageHash(bytes32 messageHash) internal view returns (bytes32 digest) {
    bytes32 separator = domainSeperator;
    assembly {
        // Compute the digest.
        mstore(0x00, 0x1901000000000000) // Store "\x19\x01".
        mstore(0x1a, separator) // Store the domain separator.
        mstore(0x3a, messageHash) // Store the message hash.
        digest := keccak256(0x18, 0x42)
        // Restore the part of the free memory slot that was overwritten.
        mstore(0x3a, 0)
    }
}
```

We are using assembly here to be more gas efficient.

With these changes in place, your ERC-20 token contract now supports both ERC-2612 and EIP-712. Users can approve spenders via signatures instead of transactions, making interactions with your token contract more efficient and user-friendly.

## 3. Some pitfalls of implementation

### 3.1 Deadlines and Time Synchronization

When implementing the `permit` function, it's essential to manage deadlines effectively. Using `block.timestamp` for deadline comparisons can help prevent attacks related to manipulating block time. However, it's worth noting that the `block.timestamp` value is determined by miners and can be off by a few seconds, so take this into account when setting deadlines for permit signatures.

### 3.2 Signature Security

Always be cautious about the security aspects of signature handling. For example, ensure that your implementation properly validates the recovered address to avoid potential vulnerabilities. Static analysis tools catch many of these issues early — see [our free Solidity security tooling setup](/articles/web3/securing-solidity-smart-contracts/). Additionally, be aware that the `ecrecover` function returns the zero address if the signature is invalid, so always check for this scenario in your implementation.

### 3.3 Gas Costs

While using signatures for approvals can reduce gas costs for users, the actual `permit` function itself might be gas-intensive due to the cryptographic operations involved, such as `keccak256` and `ecrecover`. It's crucial to analyze and optimize gas costs during the development process to ensure that your implementation remains efficient and cost-effective.

### 3.4 Chain ID Changes

The EIP-712 domain separator includes the chain ID to prevent replay attacks across different networks. However, it’s essential to remember that the chain ID can change in certain situations, such as during a network upgrade or a hard fork. When this occurs, the domain separator must be updated accordingly. One solution is to implement a function that allows the contract owner to update the domain separator when a chain ID change occurs.

### 3.5 Debugging Signature Issues

During the implementation process, you may encounter issues related to signature verification. Debugging these issues can be challenging, as cryptographic functions tend to be less intuitive and harder to trace. To help overcome this pain point, it’s crucial to become familiar with the EIP-712 specification, understand the expected input format for the `ecrecover` function, and use test cases to verify the correctness of your signature generation and verification code.

From my personal experience, I highly recommend setting up Foundry unit tests and emitting numerous events at each step of the process to confirm the accuracy of your implementation. For a full walkthrough, see [testing ERC-2612 with Hardhat and Forge](/articles/web3/erc-2612-part-3/). Utilizing a Foundry test case with a high verbosity output (e.g., -vvvv) will allow you to monitor all events, making it much easier to identify and resolve potential issues that may arise.

By keeping these potential pitfalls in mind, you can ensure a robust and secure implementation of ERC-2612 and EIP-712 in your ERC-20 token contract.

## Conclusion

Congratulations! You’ve now unlocked the full potential of ERC-2612 and EIP-712 in Solidity. By combining these standards, your ERC-20 tokens will enjoy improved user experience and seamless integration with the ever-evolving DeFi ecosystem.

But don’t stop here: the next part covers [unit testing this implementation with Hardhat and Forge](/articles/web3/erc-2612-part-3/), including the benchmark that eventually pushed us off Hardhat entirely.