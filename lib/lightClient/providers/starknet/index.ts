import formatAmount from "../../../formatAmount"
import _LightClient from "../../types/lightClient"
import { Commit } from "../../../../Models/PHTLC"
import KnownInternalNames from "../../../knownIds"
import { Network, Token } from "../../../../Models/Network"
import PHTLCAbi from "../../../../lib/abis/atomic/STARKNET_PHTLC.json"
import { CallData, hash } from "starknet";
import { BigNumber } from "ethers"
import { toHex } from "viem"

export default class StarknetLightClient extends _LightClient {

    private worker: Worker

    private supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetSepolia,
    ]

    supportsNetwork = (network: Network): boolean => {
        return this.supportedNetworks.includes(network.name)
    }

    init({ network }: { network: Network }) {
        return new Promise((resolve: (value: { initialized: boolean }) => void, reject) => {
            try {
                const worker = new Worker('/workers/beerus/beerusWorker.js', {
                    type: 'module',
                })

                const workerMessage = {
                    type: 'init',
                    payload: {
                        data: {
                            initConfigs: {
                                hostname: window.location.origin,
                                network: network.name,
                                alchemyKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
                                version: network.name.toLowerCase().includes('sepolia') ? 'sandbox' : 'mainnet'
                            },
                        },
                    },
                }
                worker.postMessage(workerMessage)
                this.worker = worker

                worker.onmessage = (event) => {
                    const result = event.data.data

                    console.log('Worker event:', event)
                    if (result.initialized) {
                        resolve(result)
                    } else {
                        reject(result)
                    }
                }
                worker.onerror = (error) => {
                    reject(error)
                    console.error('Worker error:', error)
                }

            } catch (error) {
                console.error('Error connecting:', error);
                reject(error); // Reject the promise if an exception is thrown
            }
        });
    }
    getDetails = async ({ network, token, commitId, atomicContract }: { network: Network, token: Token, commitId: string, atomicContract: string }) => {
        return new Promise(async (resolve: (value: Commit) => void, reject) => {
            try {


                if (!this.worker) {
                    const result = await this.init({ network })
                    if (!result.initialized) {
                        throw new Error('Worker could not be initialized')
                    }
                }


                const calldata = splitUint256(commitId)
                const selector = hash.getSelectorFromName("getHTLCDetails");
                console.log('commitId:', commitId)

                //TODO: construct call data here and pass to the worker
                const call = {
                    execute: {
                        calldata,
                        contract_address: atomicContract,
                        entry_point_selector: selector
                    }
                };
                console.log('Call:', call)

                const workerMessage = {
                    type: 'getDetails',
                    payload: {
                        data: {
                            commitConfigs: {
                                commitId: commitId,
                                contractAddress: atomicContract,
                                call,
                            },
                        },
                    },
                }

                let attempts = 1;
                this.worker.postMessage(workerMessage)

                this.worker.onmessage = async (event) => {

                    const rawData = event.data.data
                    const CallDataInstance = new CallData(PHTLCAbi)
                    const result = CallDataInstance.parse("getHTLCDetails", rawData) as Commit;

                    const parsedResult: Commit = {
                        ...result,
                        sender: toHex(result.sender),
                        amount: formatAmount(result.amount, token.decimals),
                        hashlock: result.hashlock && toHex(result.hashlock, { size: 32 }),
                        claimed: Number(result.claimed),
                        secret: Number(result.secret),
                        timelock: Number(result.timelock),
                    }

                    console.log('rawData:', rawData)
                    console.log('parsed result:', result)
                    if (attempts > 15 || (parsedResult.hashlock)) {
                        resolve(parsedResult)
                        this.worker.terminate()
                        return
                    }
                    console.log('Retrying in 5 seconds ', attempts)
                    await sleep(5000)
                    this.worker.postMessage(workerMessage)
                    attempts++
                }
                this.worker.onerror = (error) => {
                    reject(error)
                    console.error('Worker error:', error)
                }

            } catch (error) {
                console.error('Error connecting:', error);
                reject(error); // Reject the promise if an exception is thrown
            }
        });

    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function splitUint256(value) {
    const hex = BigNumber.from(value).toHexString().padStart(66, "0"); // Ensure 32 bytes
    const high = "0x" + hex.slice(2, 34); // First 16 bytes (most significant)
    const low = "0x" + hex.slice(34, 66); // Last 16 bytes (least significant)
    return [low, high];
}