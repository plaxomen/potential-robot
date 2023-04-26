import { describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'fs';
import {
  Assets, 
  ConstrData, 
  MintingPolicyHash,
  NetworkEmulator,
  NetworkParams,
  Program, 
  Value, 
  textToBytes,
  TxOutput,
  Tx, 
} from "@hyperionbt/helios";

import {
  Assets,
  Data,
  Emulator,
  fromText,
  generateSeedPhrase,
  getAddressDetails,
  Lucid,
  SpendingValidator,
  toUnit,
  TxHash,
} from "lucid-cardano"; // NPM

describe('ThreadToken Positive Test Cases', () => {

    const main = async () => {

	// Set the Helios compiler optimizer flag
        let optimize = false;
        const minAda = BigInt(2000000);  // minimum lovelace needed to send an NFT

        try {
	// https://github.com/spacebudz/lucid/blob/main/tests/emulator.test.ts
	async function generateAccount(assets: Assets) {
	  const seedPhrase = generateSeedPhrase();
	  return {
	    seedPhrase,
	    address: await (await Lucid.new(undefined, "Custom"))
	      .selectWalletFromSeed(seedPhrase).wallet.address(),
	    assets,
	  };
	}

	const lender = await generateAccount({ lovelace: 75000000000n });
	const borrower = await generateAccount({ lovelace: 100000000n });

	const emulator = new Emulator([lender, borrower]);

	const lucid = await Lucid.new(emulator);

	lucid.selectWalletFromSeed(borrower.seedPhrase);
	//
	// https://lucid.spacebudz.io/docs/getting-started/mint-assets/
	const { paymentCredential } = lucid.utils.getAddressDetails(
  		await lucid.wallet.address(),
	);

	console.log(paymentCredential);
	const mintingPolicy = lucid.utils.nativeScriptFromJson(
	  {
	    type: "all",
	    scripts: [
	      { type: "sig", keyHash: paymentCredential.hash },
	      {
		type: "before",
		slot: lucid.utils.unixTimeToSlot(Date.now() + 1000000),
	      },
	    ],
	  },
	);

	const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);
	const unit = policyId + fromText("MyMintedToken");

	const mintTx = await lucid.newTx()
	     .mintAssets({ [unit]: 1n })
	     .validTo(Date.now() + 200000)
	     .attachMintingPolicy(mintingPolicy)
	     .complete();

	const signedMintTx = await mintTx.sign().complete();

	const mintTxHash = await signedMintTx.submit();
	console.log(mintTxHash);

	const recipient =
    "addr_test1qrupyvhe20s0hxcusrzlwp868c985dl8ukyr44gfvpqg4ek3vp92wfpentxz4f853t70plkp3vvkzggjxknd93v59uysvc54h7";

	// this needs to change.
	// const datum = Data.to(123n);
	// const lovelace = 3000000n;

	// const tx = await lucid.newTx().payToAddressWithData(recipient, {
	//   inline: datum,
	// }, { lovelace }).complete();

	// const signedTx = await tx.sign().complete();
	// const txHash = await signedTx.submit();
	// await lucid.awaitTx(txHash);

	const utxos = await lucid.utxosAt(
	  recipient,
	);

        // return true;
        return true
        } catch (err) {
            console.error("something failed:", err);
            return false;
        }
    }

    it('checks main() status', async () => {

        const logMsgs = new Set();
        const logSpy = vi.spyOn(global.console, 'log')
                         .mockImplementation((msg) => { logMsgs.add(msg); });
        
        let mainStatus = await main();
        logSpy.mockRestore();
        if (!mainStatus) {
            console.log("Smart Contract Messages: ", logMsgs);
        }
	console.log(logMsgs)
        expect(mainStatus).toBe(true);

    })

})
