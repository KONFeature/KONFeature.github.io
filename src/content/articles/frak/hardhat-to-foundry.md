---
title: "Maximizing Quality and Reliability in Solidity: Our Journey from Hardhat to Foundry"
date: 2023-01-10T12:00:00Z
draft: false
subtitle: "Evaluating the performance difference of Hardhat and Foundry for Solidity contract unit testing & reason behind the switch"
category: "solidity"
tags: ["Foundry", "Hardhat", "Solidity", "Testing", "DevOps"]
icon: "code-2"
iconColor: "text-red-400"
description: "Evaluating the performance difference of Hardhat and Foundry for Solidity contract unit testing & reason behind the switch"
mediumUrl: "https://medium.com/frak-defi/maximizing-quality-and-reliability-in-solidity-our-journey-from-hardhat-to-foundry-52e0504d11c6"
group: "frak"
---



As the head of smart contract at Frak, a web3 company that is working to create a new revenue model for content creators and users using blockchain technology, I know firsthand the importance of ensuring the quality and reliability of our code.

One of the key tools we use to achieve this is unit testing, which allows us to validate the behavior of individual units of code and catch any issues early on in the development process.

In this article, I’ll be sharing our experience with switching from Hardhat to Foundry for unit testing in Solidity. By sharing our journey, I hope to provide valuable insights and guidance for other Solidity developers who are considering a similar switch.

## Hardhat vs Foundry

I won’t go into details here about what **Hardhat** and **Foundry** are, but briefly, Hardhat is the most widely used framework for Solidity development, deployment, and testing, mainly using JavaScript to perform all of these tasks, while Foundry is a new framework, written in Rust, that performs the same tasks but using Solidity code for everything.

Under the hood, Hardhat deploys a local blockchain and uses **ether.js** to communicate with the contract and Mocha for unit testing, while Foundry uses **Forge** and **Anvil** (a local blockchain) to deploy the Solidity test contract, run the tests, and interpret the results.

You can already see where we are going with this. On one hand, a JavaScript script will talk to our local chain for each one of our tests, possibly making multiple calls to the local chain, on the other hand, the test contract is completely deployed on a local chain, and a script will only execute the test methods.

## Benchmark

I will run benchmarks on our **FrakTreasuryWallet** contract. It’s a really simple contract (upgradeable and with roles) but it only has one method to perform a transfer from our treasury to a given address.

A test is quite interesting on this contract, since we need to ensure that we won’t exceed the amount planned for our treasury (in our case, 330 million tokens), but the contract only mints tokens in chunks of 1 million. So, we need to call the contract a tremendous number of times to perform all the transfers and empty the contract, and to make sure that no more transfers can be made from an empty treasury.

Here are the results of the unit tests, using both Hardhat and Forge.

![Hardhat test run (13sec)](/assets/hardhat-to-foundry/1*CUgH2J4Fu6bcRttU4o4z_Q.png)![Forge test run (102ms)](/assets/hardhat-to-foundry/1*8tdzvqEsGm1hYd8qkXLQwQ.png)

You can see that Hardhat took **13 seconds** to execute all the tests, and almost 9 seconds for the test where we need to empty the treasury. Meanwhile, Forge only took **102 milliseconds** to perform the same thing.

And with Forge, we also got a **fuzzed** test that has run 256 times (which is not currently possible with Hardhat), so it ran 256 more executions of our contract, over 100 times faster. This provides a much better gas estimation and a lot more reliability since we have random input values.

## Benefits

Since the tests are written in Solidity, we can also use **inheritance** to have some test helpers, and some generic tests (for the upgradeability, roles management, or pause system). In our case, we use it to deploy our contract under a **UUPS proxy**, with some modifiers to ‘prank’ the address in use for the tests to be the deployer (you can find it [here](https://github.com/frak-id/frak-id-blockchain/blob/main/test/foundry/UUPSTestHelper.sol)).

The reason for the switch is quite obvious now, it allows us to test our code much faster, perform some gas optimization tests and see the impact on the whole ecosystem in less than a second (post compilation, so around **5 seconds** in our case).

## Caveat

Since Foundry is purely **Solidity-based** (for deployment scripts and tests), it required us to rewrite all of our unit tests in the Solidity form. Nonetheless, it allows us to incorporate some **fuzzing** tests for all of our contracts, giving us better **gas estimation** for their execution.

We also needed to do some research around the testing framework (for the upgrade part, the assertions, log fetching and accessing some data returned by our functions, etc.) to understand how it works, especially the various **“cheat codes”** available. But, if you are familiar with Solidity, the learning curve is relatively quick.

If you’re not familiar with “cheat codes”, they help you manipulate the VM in some ways (change the current execution address, fetch logs emitted by an event), I will cover that in more detail in an article about how we set up Foundry for all of our unit tests.

We decided to go with [PRBTest](https://github.com/paulrberg/prb-test) instead of the original Foundry test library, since it provides versioning and more assertions, while remaining compatible with all the original VM cheat codes provided by Foundry.

## Conclusion

In about **a week**, we managed to set up Foundry and migrate the majority of our unit tests to it. We encountered a few things that were not well-documented, but they remained easily solvable.

Since the tests ran approximately **100 times faster**, it helped us a lot with our research on gas optimization, and it will help us in the future to add new features to our system, test them, and optimize our code even further.

Stay tuned for another article where I will explain how we set up Foundry in our existing Hardhat project and how we set up base unit tests for our upgradeable contract!

In the meantime, you can check out our [github repository](https://github.com/frak-id/frak-id-blockchain) :)

**_If you want to continue the conversation, you can connect with us_** [**_@frak_defi_**](https://twitter.com/frak_defi) **_on Twitter or on Telegram.
Be informed when a new article is published by following us on_** [**_Medium_**](https://medium.com/frak-defi)**_._ If you liked this article, please consider giving it a “clap” _(up to 50x) to let us know you enjoyed it. It’ll mean a lot to us._**

**_Thank you :)_**