## version: Adderall 

is used to architect a decentralzied application using eUTXO model and Helios, a domain specific language for writing smart contracts on Cardano blockchain.

## Quick Start
1. `npm install`
2. `npm test`

![image](https://github.com/aleeusgr/potential-robot/assets/36756030/be350495-9e0c-4de9-976c-78630409ec30)


## Usage
Simple dApp consists of a smart contract with the set of transactions that could be applied to it. Current example is vesting, which is discussed in the documentation below. Following the book in the links and tutorials on Test-Driven Development a programmer should be able to express buisness logic as functional requirements for the product and write tests to verify the requirements are satisfied.
For example for the vesting contract the functional requirements are like so:
- sponsor can deposit value
- claimant can claim the value after the deadline designated by the sponsor.
- claimant fails to claim the value before the deadline.
- sponsor can cancel the contract before the deadline
- sponsor fails to claim the value after the deadline.

FOr the first excercise the user may seek to implement NFT escrow - a contract that validates withdrawal depending not on time of the transation but if the transaction has a specific NFT. Take a look at the [code example](https://github.com/aleeusgr/sniffle).

## Architecture

![image](https://github.com/aleeusgr/potential-robot/assets/36756030/c01818cc-3b5d-4057-bda8-2689ab7a6378)


## Contributing

- Test the project.
- Update Helios version in package.json
- Join Gimbalabs.com
- Join Helios Discord (link below)
- Ask questions.
- Submit a PR.

## Refs:
[Vitest](https://vitest.dev/)

[Helios](https://github.com/Hyperion-BT/helios)

[Helios vesting example](https://github.com/lley154/helios-examples/tree/main/vesting)

[Cardano Smart contract with Helios](https://github.com/lley154/helios-examples/blob/main/docs/Cardano%20Smart%20Contracts%20with%20Helios.pdf)

[Plutus: Writing reliable smart contracts](https://leanpub.com/plutus-smart-contracts) 

Big Thanks to Helios team, James Dunseith Gimbalabs, Ben Hart MLabs, Romain Soulat IOG and Matthias Sieber EMURGO.
The project is inspired by Nine Inch Nails, SBF trial and the show Inside Job.
