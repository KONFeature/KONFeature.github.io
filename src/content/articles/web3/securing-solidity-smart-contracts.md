---
title: "Securing Solidity Smart Contracts"
date: 2022-10-08T12:00:00Z
draft: false
subtitle: "Setting up some free security tools, to prepare a security Audit"
category: "solidity"
tags: ["Smart Contract Security", "Solidity", "Auditing", "Fuzzing", "Security Tools"]
icon: "code-2"
iconColor: "text-red-400"
featured: false
description: "Setting up some free security tools, to prepare a security Audit"
mediumUrl: "https://medium.com/frak-defi/securing-solidity-smart-contracts-61d070914886"
group: "web3"
---




Since we want to build a sustainable, and long term ecosystem at Frak, securing the Smart Contract is a big concern for us.

From the init of the repository, to the development, and the first run on a testnet, we needed to keep security in mind.

I will review some base security tools we have set up, to help us testing our contracts when we were developing them, and to prevent some bad surprise during the security audit.

## Tools we will use

**Slither** : Static code analysis, erc20 compliance check, and many more useful features

**Mythril** : EVM Bytecode analysis

**Manticore** : Symbolic execution tools

**Echidna** : Contract fuzzing

Of course, this is just a small portion of all the security tools existing, but I will focus on this one first, because they are free, relatively easy to set up, and can prevent a lot of security issues if rightly configured.

Each one of this tools come with its own docker images. We are going with docker to prevent us from installing all the python dependencies of this tools on our machine, but also to ease the set up for new developers, and ease the automation of test in a CI pipeline.

## Including the tools inside the project structure

We decided to go on a **tools** folder, at the root of our hardhat project, that will contain all the scripts necessary to run each tool individually, loosing a bit on performance, but gaining a lot on versatility, upgradeability, and readability.

Like that, we can add as many tools as we want, disable or remove some older ones etc. Let see the organisation inside our tools folder:

![Tools folder at the root of the project](/assets/securing-solidity-smart-contracts/1*opo4j9_zIDQmn2BWx5ofsA.png)

With that structure, we can have some shared element for each one of our tools. Especially useful for echidna, that require a Solidity test file for each contract we want to test, with some basic configuration.

## Sample tools configuration

Let’s jump into the script for Mythril to start with a small example:

```
#!/bin/bash

# Assert we are in the right folder
if [ ! -d "contracts" ]; then 
	echo "error: script needs to be run from project root './tools/mythril/mythril.sh'"
	exit 1
fi

# Run mythril analyse on the given contract
function analyse_contract {
	docker run --rm -v `pwd`:/src  --workdir=/src mythril/myth -v 4 analyze $1 --solc-json tools/mythril/remapping.json --max-depth 50
}

echo ""
echo "<----- Checking SybelToken.sol ----->"
analyse_contract contracts/tokens/SybelToken.sol

echo ""
echo "<----- Checking VestingWallets.sol ----->"
analyse_contract contracts/wallets/VestingWallets.sol

echo ""
echo "<----- Checking SybelInternalTokens.sol ----->"
analyse_contract contracts/tokens/SybelInternalTokens.sol
```
<b>[other]mythril.sh script inside tools/mythril/ folder[/other]</b>

We first check that the scripts is executed from the root folder of the project, like that we are sure that we are in the right folder and we can access the contracts with no problem.

Now let’s take a look at our docker command:

*   We are using _mythril/myth_ docker image directly (instead of _trailofbits/eth-security-toolbox_ that embed a lot of security tools), to get the latest version of mythril, and to have a lighter and faster docker image for this run.
*   We want it to remove the file at the end of the build ( _— rm_) to prevent conflict between contract analysis.
*   Then, we bind the current path to the docker container ‘/src’ folder (_-v `pwd`:/src_)
*   And then, go directly into the src folder ( _— workdir=/src mythril/myth_).

After, it’s just a question of configuration for mythril:

*   Increase verbosity level to get more details (_-v 4_)
*   Increase the depth of the analysis, it will take a bit longer to run, but you will potentially cover more branch of you’re contract code ( _— max-depth 50_)
*   And give some info for the soc compiler ( _— solc-json tools/mythril/remapping.json_). In our case this json contain the remapping for the OpenZeppelin dependencies, and enable the optimizer.

![remapping.json used by mythril for each run](/assets/securing-solidity-smart-contracts/1*8KWD_jcxvWOscLkfi6AlBw.png)

So now, from the project root, you can start mythril with a simple : _./tools/mythril/mythril.sh_

For the others tools, the docker configuration is similar, and then the tools configuration depend on the tools themselfs. If you want the configuration for the other tools, don’t hesitate to ask! Our repository is still private but will go public soon.

## Launch all the scripts, and preparation for CI

To launch all the scripts at once, just create a new bash script that will run all the tools you want, and write the output of each script into a separate folder (for clarity after the run).

In our case, we run Slither, Mythril, Manticore and Echidna, our script look like that :

```
#!/bin/bash

# Assert we are on the root folder
if [ ! -d "contracts" ]; then 
	echo "error: script needs to be run from project root './tools/run-all.sh'"
	exit 1
fi

# Run slither analysis
./tools/slither/slither.sh > tools/logs/slither-output.log

# Run mythril analysis
./tools/mythril/mythril.sh > tools/logs/mythril-output.log

# Run manticore analysis
./tools/manticore/manticore.sh > tools/logs/manticore-output.log

# Run echidna analysis
./tools/echidna/echidna.sh > tools/logs/echidna-output.log
```
<b>[other]tools/run-all.sh script, running all the scripts we want[/other]</b>

Since Mythril, Manticore and Echidna can take a very long time to run (especially in our case with more than 10 contracts), and we don’t want our developers to wait more than a day or two just waiting for the run to complete, before they can ensure the security checks are successful.

To be able to run this script on another machine (in our case it’s an ec2 instance), we created a new script to run this script with nohup:

```
#!/bin/bash

# Assert we are on the root folder
if [ ! -d "contracts" ]; then 
	echo "error: script needs to be run from project root './tools/run-all-nohup.sh'"
	exit 1
fi

# Exec the run all script with nohup
nohup sh tools/run-all.sh > tools/logs/security-analysis.log 2>&1 &
```
<b>[other]tools/run-all-nohup.sh, running all the script in the background[/other]</b>

And now, with all of that, you can run your security analysis scripts and let them explore all of the contracts you want!

## Security advice

These tools are great to prepare yourself before a security audit, but the best way to have secured smart contracts is to learn about all the security guidelines and common failures in the first place.

A good entry point for best practices around contract: [https://consensys.github.io/smart-contract-best-practices/](https://consensys.github.io/smart-contract-best-practices/)

And secondly, all these tools are great, but they aren’t as powerful as a qualified security audit firm. So it’s a good premise in term of security, but you should always consult a security audit firm before going live.

## Other tools

We only cover some base security tools, not really intuitive but really efficient.

If you are searching for something more graphical, you can take a look at [**MythX**](https://mythx.io/) (it will handle basic security runs and a few fuzzing tests), and [**Diligence Fuzzing**](https://consensys.net/diligence/fuzzing/) (a lot more easier to understand and to set up than echidna).

If you are searching for really advanced security tools, you can check [**Karl**](https://github.com/cleanunicorn/karl) and [**Theo**](https://github.com/cleanunicorn/theo) from cleanunicorn.

**_If you want to continue the conversation, you can connect with us_** [@frak_defi](https://twitter.com/frak_defi) **_on Twitter or on Telegram.
Be informed when a new article is published by following us on_** [**_Medium_**](https://medium.com/frak-defi)**_. If you liked this article, please clap for it (up to 50x) to let us know you enjoyed it. It’ll mean a lot to us._**