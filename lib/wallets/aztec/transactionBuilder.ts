import { Commit } from "../../../Models/phtlc/PHTLC";
import {
    AztecAddress,
    ContractInstanceWithAddress,
    Fr,
    getContractInstanceFromDeployParams,
    SponsoredFeePaymentMethod,
    Wallet,
} from '@aztec/aztec.js';
import {
    TokenContract,
    TokenContractArtifact,
} from "@aztec/noir-contracts.js/Token";
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC';
import { TrainContract } from "./Train";
import { CommitmentParams, CreatePreHTLCParams, LockParams } from "../../../Models/phtlc";
import { Account } from "../../@nemi-fi/wallet-sdk/src/exports";
import { Contract } from "../../@nemi-fi/wallet-sdk/src/exports/eip1193"
import { sdk } from "./configs";

const TrainContractArtifact = TrainContract.artifact;
class Token extends Contract.fromAztec(TokenContract) { }

interface Props extends CreatePreHTLCParams {
    senderWallet: Account;
}

export const commitTransactionBuilder = async (props: Props) => {
    const { tokenContractAddress, lpAddress, atomicContract, sourceAsset, senderWallet } = props;

    if (!tokenContractAddress || !lpAddress || !atomicContract || !sourceAsset || !senderWallet) throw new Error("Missing required parameters");

    const sponseredFPC = await getSponsoredFPCInstance();
    const paymentMethod = new SponsoredFeePaymentMethod(sponseredFPC.address);

    const Id = generateId();
    const now = Math.floor(new Date().getTime() / 1000);
    const timelock = now + 1100;
    const token = sourceAsset.symbol;
    const amount = 23n;
    const solverAddress = AztecAddress.fromString(lpAddress);
    const dst_chain = 'USDC.e'.padStart(30, ' ');
    const dst_asset = 'PROOFOFPLAYAPEX_MAINNET'.padStart(30, ' ');
    const dst_address =
        '0x01ba575951852339bfe8787463503081ea0da04448b2efc58798705c27cdb3fb'.padStart(
            90,
            ' ',
        );

    try {

        const contractAddress = AztecAddress.fromString(atomicContract);
        // wherever you have your deployed contract’s Aztec address:
        const tokenAddress = AztecAddress.fromString(tokenContractAddress);

        // bind the Token class to that address & your account
        const token = await Token.at(tokenAddress, senderWallet);

        const randomness = generateId();
        const TokenContractArtifact = TokenContract.artifact;
        const asset = await Contract.at(
            tokenAddress,
            TokenContractArtifact,
            senderWallet,
        );

        const transfer = asset
            .withAccount(senderWallet)
            .methods.transfer_to_public(
                senderWallet.getAddress(),
                contractAddress,
                amount,
                randomness,
            );

        // const witness = await senderWallet.setPublicAuthWit({
        //     caller: contractAddress,
        //     action: transfer,
        // });

        const witness = await senderWallet.setPublicAuthWit(
            { caller: solverAddress, action: transfer },
            true,
        );

        const contract = await Contract.at(
            contractAddress,
            TrainContractArtifact,
            senderWallet,
        );
        const is_contract_initialized = await contract.methods
            .is_contract_initialized(Id)
            .simulate();
        if (is_contract_initialized) throw new Error('HTLC Exsists');
        const commitTx = await contract.methods
            .commit_private_user(
                Id,
                solverAddress,
                timelock,
                tokenAddress,
                amount,
                dst_chain,
                dst_asset,
                dst_address,
                randomness,
            )
            .send()
            .wait({ timeout: 120000 });

        return { hash: commitTx.txHash.toString(), commitId: Id.toString() };

    } catch (error) {
        console.error("Error building commit transaction:", error);
        throw error;
    }
}
function generateId(): bigint {
    function generateBytes32Hex() {
        const bytes = new Uint8Array(32); // 32 bytes = 64 hex characters
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const id = `0x${generateBytes32Hex()}`;
    return BigInt('0x' + id);
}

async function getSponsoredFPCInstance(): Promise<ContractInstanceWithAddress> {
    return await getContractInstanceFromDeployParams(
        SponsoredFPCContract.artifact,
        {
            salt: new Fr(SPONSORED_FPC_SALT),
        },
    );
}

export const addLockTransactionBuilder = async (params: CommitmentParams & LockParams & { senderWallet: Account }) => {

    const { id, senderWallet, contractAddress, hashlock } = params;

    const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
    const timelockMs = Date.now() + LOCK_TIME
    const timelock = Math.floor(timelockMs / 1000)

    if (!senderWallet || !contractAddress || !hashlock) {
        throw new Error("Missing required parameters");
    }

    const uint8ArrayHashlock = new TextEncoder().encode(hashlock);

    try {

        const atomicContract = await aztecContractInstance(
            contractAddress,
            senderWallet,
            id,
        );

        const addLockTx = await atomicContract.methods
            .add_lock_private_user(id, uint8ArrayHashlock, timelock)
            .send()
            .wait({ timeout: 120000 });

        return { lockCommit: addLockTx.txHash.toString(), lockId: hashlock, timelock: timelock }

    } catch (error) {
        console.error("Error building add lock transaction:", error);
        throw error;
    }

}

export const aztecContractInstance = async (atomicContract: string, senderWallet: Account, commitId: string) => {
    const aztecAtomicContract = AztecAddress.fromString(atomicContract);
    const contract = await Contract.at(
        aztecAtomicContract,
        TrainContractArtifact,
        senderWallet,
    );

    const is_contract_initialized = await contract.methods
        .is_contract_initialized(commitId)
        .simulate();

    if (!is_contract_initialized) {
        throw new Error('Contract is not initialized');
    }

    return contract;
}