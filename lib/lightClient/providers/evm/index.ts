import formatAmount from "../../../formatAmount"
import _LightClient from "../../types/lightClient"
import EVMERC20_PHTLC from '../../../abis/atomic/EVMERC20_PHTLC.json'
import EVM_PHTLC from '../../../abis/atomic/EVM_PHTLC.json'
import { Commit } from "../../../../Models/phtlc/PHTLC"
import KnownInternalNames from "../../../knownIds"
import { Network, Token } from "../../../../Models/Network"
import { hexToBigInt } from "viem"

export default class EVMLightClient extends _LightClient {

    private worker: Worker

    private supportedNetworks = [
        KnownInternalNames.Networks.EthereumMainnet,
        KnownInternalNames.Networks.EthereumSepolia,
        KnownInternalNames.Networks.OptimismMainnet,
        KnownInternalNames.Networks.BaseMainnet,
        // KnownInternalNames.Networks.OptimismSepolia
    ]

    supportsNetwork = (network: Network): boolean => {
        return this.supportedNetworks.includes(network.name)
    }

    init({ network }: { network: Network }) {
        return new Promise((resolve: (value: { initialized: boolean }) => void, reject) => {
            try {
                const worker = new Worker('/workers/helios/heliosWorker.js', {
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

                const workerMessage = {
                    type: 'getDetails',
                    payload: {
                        data: {
                            commitConfigs: {
                                commitId: commitId,
                                abi: token.contract ? EVMERC20_PHTLC : EVM_PHTLC,
                                contractAddress: atomicContract,
                            },
                        },
                    },
                }
                let attempts = 1;
                this.worker.postMessage(workerMessage)

                this.worker.onmessage = async (event) => {
                    const result = event.data.data
                    if(attempts > 15) {
                        reject('Could not get details via light client')
                        this.worker.terminate()
                        return
                    }

                    if (result?.hashlock && result?.hashlock !== "0x0100000000000000000000000000000000000000000000000000000000000000" && result?.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                        const parsedResult: Commit = result ? {
                            ...result,
                            secret: Number(result.secret) !== 1 ? Number(result.secret) : null,
                            amount: formatAmount(Number(hexToBigInt(result.amount._hex)), token.decimals),
                            timelock: Number(result.timelock)
                        } : undefined
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
                    this.worker.terminate()
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