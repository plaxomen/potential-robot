import { describe, expect, it, expectTypeOf, beforeEach, vi } from 'vitest'
import { promises as fs } from 'fs';
import {
  Address,
  Assets,
  ByteArrayData,
  ConstrData,
  Datum,
  hexToBytes,
  IntData,
  ListData,
  NetworkEmulator,
  NetworkParams,
  Program, 
  Redeemer,
  Tx,
  TxOutput,
  Value,
} from "@hyperionbt/helios";
import {lockAda} from './src/vesting-lock.ts';

describe("a vesting contract lockAda transaction", async () => {

	// https://vitest.dev/guide/test-context.html
	beforeEach(async (context) => { 
		let optimize = false;

		// compile script
		const script = await fs.readFile('./src/vesting.hl', 'utf8'); 
		const program = Program.new(script); 
		const compiledProgram = program.compile(optimize); 
		const validatorHash = compiledProgram.validatorHash;
		const validatorAddress = Address.fromValidatorHash(validatorHash); 
	 
		context.program = program;
		context.validatorHash = validatorHash;
		context.validatorAddress = Address.fromValidatorHash(validatorHash); 
		context.programName = program.name;

		// instantiate the Emulator
		const minAda = BigInt(2000000);  // minimum lovelace needed to send an NFT
		const network = new NetworkEmulator();

		const alice = network.createWallet(BigInt(20000000));
		network.createUtxo(alice, BigInt(5000000));
		const bob = network.createWallet(BigInt(10000000));
		network.tick(BigInt(10));

		context.alice = alice;
		context.bob = bob;
		context.network = network;
	})

	it ("tests initial NetworkEmulator state", async ({network, alice}) => {
		// https://www.hyperion-bt.org/helios-book/api/reference/address.html?highlight=Address#address
		const aliceUtxos = await network.getUtxos(alice.address);
		expect(alice.address.toHex().length).toBe(58) //property?
		expect(aliceUtxos[1].value.dump().lovelace).toBe('5000000')
		expect(aliceUtxos[0].value.dump().lovelace).toBe('20000000')
	})
	it ("tests lockAda tx", async ({network, alice, bob,validatorHash, program}) => {
		const adaQty = 10 ;
		const duration = 10000000;
		await lockAda(network!, alice!, bob!, program, adaQty, duration)
		
		// one utxo is unchanged, second has (10 ADA + txFee) less 
		expect((await alice.utxos)[0].value.dump().lovelace).toBe('5000000');
		expect((await network.getUtxos(await alice.address))[0].value.dump().lovelace).toBe('5000000');
		expect((await alice.utxos)[1].value.dump().lovelace).toBe('9756672');

		const validatorAddress = Address.fromValidatorHash(validatorHash); 
		// there exists a utxo that has a specified token locked at a validatorAddress.
		expect(Object.keys((await network.getUtxos(validatorAddress))[0].value.dump().assets)[0]).toBe('6ecf3e6410cb049736a4d424a439887ad390cf6357ee2f2970a7f235');
	})
	it ("reproduces lockAda tx", async ({network, alice, bob, validatorAddress}) => {
// https://github.com/lley154/helios-examples/blob/704cf0a92cfe252b63ffb9fd36c92ffafc1d91f6/vesting/pages/index.tsx#LL157C1-L280C4
		const benAddr = bob.address;
		const adaQty = 10 ;
		const duration = 10000000;

		const networkParamsFile = await fs.readFile('./src/preprod.json', 'utf8');
		const networkParams = new NetworkParams(JSON.parse(networkParamsFile.toString()));

		const emulatorDate = Number(networkParams.slotToTime(BigInt(0))); 
		const deadline = new Date(emulatorDate + duration);

		const benPkh = bob.pubKeyHash;
		const ownerPkh = alice.pubKeyHash;

		const lovelaceAmt = Number(adaQty) * 1000000;
		const adaAmountVal = new Value(BigInt(lovelaceAmt));

		const datum = new ListData([new ByteArrayData(ownerPkh.bytes),
					    new ByteArrayData(benPkh.bytes),
					    new IntData(BigInt(deadline.getTime()))]);
		const inlineDatum = Datum.inline(datum);

		const inputUtxos = await alice.utxos;


		const mintScript =`minting nft

		const TX_ID: ByteArray = #` + inputUtxos[0].txId.hex + `
		const txId: TxId = TxId::new(TX_ID)
		const outputId: TxOutputId = TxOutputId::new(txId, ` + inputUtxos[0].utxoIdx + `)

		enum Redeemer {
			Init
		}

		func main(_, ctx: ScriptContext) -> Bool {
			tx: Tx = ctx.tx;
			mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();

			assetclass: AssetClass = AssetClass::new(
			mph,
			"Vesting Key".encode_utf8()
			);
			value_minted: Value = tx.minted;

			// Validator logic starts
			(value_minted == Value::new(assetclass, 1)).trace("NFT1: ") &&
			tx.inputs.any((input: TxInput) -> Bool {
						(input.output_id == outputId).trace("NFT2: ")
						}
			)
		}`

		const optimize = false; //maybe add to test context?
		const mintProgram = Program.new(mintScript).compile(optimize);

		// Construct the NFT that we will want to send as an output
		const nftTokenName = ByteArrayData.fromString("Vesting Key").toHex();
		const tokens: [number[], bigint][] = [[hexToBytes(nftTokenName), BigInt(1)]];

		// Create an empty Redeemer because we must always send a Redeemer with
		// a plutus script transaction even if we don't actually use it.
		const mintRedeemer = new ConstrData(0, []);

		const lockedVal = new Value(adaAmountVal.lovelace, new Assets([[mintProgram.mintingPolicyHash, tokens]]));

		const tx = new Tx()
			.attachScript(mintProgram)
			.addInputs(inputUtxos)
			// Indicate the minting we want to include as part of this transaction
			.mintTokens(
				mintProgram.mintingPolicyHash,
				tokens,
				mintRedeemer
			)

			// Add the destination address and the amount of Ada to lock including a datum
			.addOutput(new TxOutput(validatorAddress, lockedVal, inlineDatum));


		await tx.finalize(networkParams, alice.address);
		const txId = await network.submitTx(tx);

		network.tick(BigInt(10));

		// this should be consistent with previous test.
		// alice has only one utxo:
		expect((await alice.utxos)[0].value.dump().lovelace).toBe('14750644');
		// and the fee is different, compare L67
		expect(14749259).not.to.equal(9755287+5000000);
		expect((await alice.utxos)[1]).toBeUndefined();
		// validator address holds Vesting Key
		expect(mintProgram.mintingPolicyHash.hex).toBe('6ecf3e6410cb049736a4d424a439887ad390cf6357ee2f2970a7f235');	
		expect(Object.keys((await network.getUtxos(validatorAddress))[0].value.dump().assets)[0]).toEqual(mintProgram.mintingPolicyHash.hex);

	})

})
