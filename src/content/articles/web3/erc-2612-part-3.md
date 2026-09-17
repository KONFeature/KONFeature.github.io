---
title: "ERC-2612 Part 3: Unit Testing with Hardhat and Forge"
date: 2023-04-14T12:00:00Z
draft: false
subtitle: "Perfecting ERC-2612: Boost Your DeFi Skills with Solidity Unit Testing in Hardhat and Forge"
category: "solidity"
tags: ["ERC-2612", "Testing", "Hardhat", "Foundry", "Solidity"]
icon: "code-2"
iconColor: "text-red-400"
description: "Unit-test an ERC-2612 permit in both Hardhat and Forge: building EIP-712 typed data, signing it, extracting r/s/v, and why Forge ran 40ms vs 9.03ms."
mediumUrl: "https://medium.com/frak-defi/erc-2612-the-ultimate-guide-to-gasless-erc-20-approvals-part-3-f4c8ebf75245"
group: "web3"
---



![Illustration for unit-testing ERC-2612 permit signatures with Hardhat and Forge](./assets/erc-2612-part-3/erc-2612-robot-coins-hero.png)

Hello everyone, and welcome to the third article in our series on ERC-2612! In the [previous articles](/articles/web3/erc-2612-part-2/), we’ve discussed the general overview of ERC-2612 and its implementation in Solidity using EIP-712, which enhances user experience and interactions with DeFi platforms like [Frak](https://frak.id/).

Now, it’s time to dive into the essential aspect of ensuring the **reliability** and **security** of your smart contracts: **unit testing**.

In this article, we’ll explore how to create comprehensive unit tests for your ERC-2612 implementation using popular development tools like [Hardhat](https://hardhat.org/) or [Forge](https://github.com/foundry-rs/foundry/tree/master/forge).

Here’s a recap of our article series:

*   [Part 1: General overview of ERC-2612](/articles/web3/erc-2612-part-1/)
*   [Part 2: Solidity development of ERC-2612](/articles/web3/erc-2612-part-2/)
*   _Part 3: Unit testing with Hardhat and Forge (this article)_

By the end of this article, you’ll be familiar with the best practices for unit testing ERC-2612 and EIP-712 implementations, ensuring the robustness and security of your ERC-20 tokens and their integration with DeFi platforms.

So, let’s jump into the world of unit testing!

## Prerequisites

Before diving into unit testing with Hardhat and Forge, there are a few prerequisites to ensure a smooth learning experience:

*   Solid understanding of Solidity and ERC-2612 implementation: Since this article focuses on unit testing the ERC-2612 and EIP-712 implementation, it’s essential to have a good grasp of Solidity and the concepts covered in the previous articles of this series. If you haven’t already, we highly recommend reading [Part 1: General overview of ERC-2612](/articles/web3/erc-2612-part-1/) and [Part 2: Solidity development of ERC-2612](/articles/web3/erc-2612-part-2/) before proceeding.
*   Familiarity with unit testing in the context of smart contracts: This article assumes that you have basic knowledge of unit testing concepts and experience with either Hardhat or Forge for testing smart contracts. If you’re new to unit testing or need a refresher, consider checking out some introductory resources on [Hardhat testing](https://hardhat.org/hardhat-runner/docs/guides/test-contracts) or [Forge testing](https://book.getfoundry.sh/forge/tests) before diving in.
*   Required tools and environment setup: To follow along with the examples, make sure you have the necessary tools and environment set up for either Hardhat or Forge.

Now that we’ve covered the prerequisites, we’re ready to delve into unit testing our ERC-2612 and EIP-712 implementation with Hardhat and Forge. Let’s get started!

_Disclaimer: In this article, we will primarily focus on successful unit test cases. It is essential to implement unit tests for every error and edge case to ensure the robustness and security of your smart contract. Make sure to thoroughly test all possible scenarios when developing your own contracts._

## Unit Testing with Hardhat

In this section, we’ll walk through the process of setting up and executing unit tests for your ERC-2612 and EIP-712 implementation using Hardhat.

### Setting up variables for the hash (value, nonce, deadline)

To start, we’ll define the variables necessary for generating the hash, including the value to be approved, the nonce to prevent replay attacks, and the deadline to ensure the approval is time-limited.

```javascript
// Amount we will permit
const cost = BigNumber.from(10).pow(18).mul(10)

// Get the nonce of the owner
const userNonce = await frakToken.getNonce(addr1.address)

// Build the deadline for our permit
const deadline = Math.floor(Date.now() / 1000 + 60 * 10)
```

### Building the domain data, types, and values for the hash

Next, we’ll construct the EIP-712 domain data, types, and values required for hashing and signing the permit function. This step ensures that our hash conforms to the EIP-712 standard.

```javascript
// Build the domain data for our permit hash
const domainData = {
  name: 'Frak', // Replace with your contract name
  version: '1',
  chainId: 31337, // Hardhat network
  verifyingContract: frakToken.address,
}

// Build the types and values for our permit hash
const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}
const value = {
  owner: addr1.address,
  spender: addr2.address,
  value: cost,
  nonce: userNonce,
  deadline: deadline,
}
```

### Signing the hash and extracting the r, s, and v values

With the hash properly constructed, we can now sign it using the private key of the approver. After signing the hash, we’ll extract the r, s, and v values from the signature, which are necessary for calling the permit function.

```javascript
// Sign the permit hash
const signature = await addr1._signTypedData(domainData, types, value)

// Extract signature part
const withoutHexPrefix = signature.substring(2)
const r = withoutHexPrefix.substring(0, 64)
const s = withoutHexPrefix.substring(64, 128)
const v = withoutHexPrefix.substring(128, 130)
```

### Calling the permit function, ensuring allowance, and executing a transfer

With the r, s, and v values in hand, we can now call the permit function in our smart contract. After calling the permit function, we’ll check the allowance to verify that the approval has been successfully recorded.

Then, with the approval in place, we can then call the transfer function on behalf of the approver. We’ll verify that the transfer was successful by checking the updated token balances.

```javascript
// Perform the permit and ensure the allowance
await frakToken.permit(
  addr1.address,
  addr2.address,
  cost,
  deadline,
  `0x${v}`,
  `0x${r}`,
  `0x${s}`
)
expect(await frakToken.allowance(addr1.address, addr2.address)).to.equal(cost)

// Ensure we can transfer the funds, and the funds are transfered
await frakToken.connect(addr2).transferFrom(addr1.address, addr3.address, cost)
expect(await frakToken.balanceOf(addr3.address)).to.equal(cost)
```

By combining these steps, we efficiently test the permit and transfer functions together, ensuring a seamless approval and transfer process in our ERC-2612 and EIP-712 implementation using Hardhat. This approach helps verify the proper functioning of your smart contracts and enhances their overall security and reliability.

## Unit Testing with Forge

In this section, we’ll walk through the process of setting up and executing unit tests for your ERC-2612 and EIP-712 implementation using Forge.

### Set up variables for the hash (value, nonce, deadline)

Just like with Hardhat, we’ll start by setting up the variables needed for the EIP-712 hash. You’ll need to define the value, nonce, and deadline:

```solidity
// Build the initial variable we will use
uint256 privateKey = 0xACAB;
address owner = vm.addr(privateKey);

uint256 cost = 10 ether;
uint256 deadline = block.timestamp + 1312;
```

### Build the domain data, types, and values for the hash

Next, build the domain data, types, and values required for the EIP-712 hash. This process remains the same as in the Hardhat example:

```solidity
// As a variable of the test contract
bytes32 constant PERMIT_TYPEHASH =
    keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

// Inside the test method
// Build the typed data
bytes32 typedData =
    keccak256(abi.encode(PERMIT_TYPEHASH, owner, address(2), cost, frakToken.getNonce(owner), deadline));

// Build the full digest we will sign
bytes32 digest = keccak256(abi.encodePacked("\x19\x01", frakToken.getDomainSeperator(), typedData));
```

### Sign the hash and extract the r, s, and v values

To sign the hash using Forge, you can use the `vm.sign()`. Extract the r, s, and v values as shown below:

```solidity
// Sign the digest
vm.prank(address(1));
(uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
```

### Call the permit and ensure allowance, then execute the transfer and ensure its success

Finally, call the permit function, check the allowance, and execute the transfer using the Forge testing framework. Same three steps as the Hardhat example, in Solidity this time:

```solidity
// Ensure the allowance is valid
frakToken.permit(owner, address(2), cost, deadline, v, r, s);
assertEq(frakToken.allowance(owner, address(2)), cost);

// Mint a few token to our owner
prankDeployer();
frakToken.mint(owner, cost);

// Ensure we can transfer the tokens
vm.prank(address(2));
frakToken.transferFrom(owner, address(3), cost);
assertEq(frakToken.balanceOf(address(3)), cost);
```

By following these steps, you can successfully implement unit testing for your ERC-2612 and EIP-712 implementation using Forge.

## Comparing Hardhat and Forge

When it comes to unit testing smart contracts, Hardhat and Forge are both popular choices. However, there are some notable differences between the two that can impact your development experience. In this section, we’ll compare the two frameworks, highlighting their **strengths** and **weaknesses**. If you want the longer story of why we ultimately switched, read [our journey from Hardhat to Foundry](/articles/frak/hardhat-to-foundry/).

### Code Complexity and Readability

In my opinion, Hardhat’s testing syntax is more complex and less readable compared to Forge.

Hardhat relies on JavaScript for writing tests, whereas Forge allows you to write tests directly in Solidity. As a result, Forge tests tend to be cleaner and more focused on the Solidity code itself, making it easier to reason about the contract logic.

### Performance

Forge has a clear advantage when it comes to test execution speed. In our experience, Hardhat tests took 40ms to run, while Forge tests were significantly faster, taking only 9.03ms.

This difference can be crucial when working on large projects with many tests, where faster test execution can save valuable time.

### Flexibility and Ease of Use

Forge’s Solidity-based testing approach makes it much easier to test all edge cases, ensuring comprehensive coverage of your smart contracts.

This is because you can leverage the full power of Solidity when writing your tests, keeping your repository solely focused on the language you’re working with.

### Advanced Testing Capabilities

Forge offers some advanced testing features that can enhance the security of your smart contracts.

With Forge, you can easily perform fuzz testing, invariant testing, and even test your contracts against mainnet data using the Cast feature.

These advanced testing capabilities can help you uncover hidden vulnerabilities and ensure the robustness of your smart contracts. Pair them with static analysis: [our free Solidity security tooling setup](/articles/web3/securing-solidity-smart-contracts/) covers Slither, Mythril, and Echidna.

In conclusion, both Hardhat and Forge are powerful unit testing frameworks with their own strengths and weaknesses. While Hardhat may be more familiar to some developers, Forge offers a clean, Solidity-centric approach to testing, along with advanced testing features that can significantly improve the security of your smart contracts. Ultimately, the choice between the two will depend on your personal preferences and requirements.

## Conclusion

Congratulations on completing the third instalment of our series on ERC-2612! You’ve gained valuable insights into unit testing with Hardhat and Forge, and now understand their differences, strengths, and weaknesses. Need to catch up on the series? Start with the [ERC-2612 overview](/articles/web3/erc-2612-part-1/) or the [Solidity permit implementation](/articles/web3/erc-2612-part-2/). By choosing the right testing framework for your needs, you can ensure the robustness and security of your ERC-20 tokens and DeFi protocols.

That wraps the series. The permit implementation from Part 2 is now covered by tests in both frameworks, and the speed gap we measured here is the same one that later pushed our whole contract suite [from Hardhat to Foundry](/articles/frak/hardhat-to-foundry/).