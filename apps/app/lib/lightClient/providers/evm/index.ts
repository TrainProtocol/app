import formatAmount from "../../../formatAmount"
import _LightClient from "../../types/lightClient"
import EVM_HTLC from '../../../abis/atomic/EVM_HTLC.json'
import type { LockDetails } from "@train-protocol/sdk"
import KnownInternalNames from "../../../knownIds"
import { Network, Token } from "../../../../Models/Network"
import { hexToBigInt } from "viem"

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export default class EVMLightClient extends _LightClient {

    private worker: Worker

    private supportedNetworks = [
        KnownInternalNames.Networks.EthereumMainnet,
        KnownInternalNames.Networks.EthereumSepolia,
        KnownInternalNames.Networks.OptimismMainnet,
        KnownInternalNames.Networks.BaseMainnet,
        KnownInternalNames.Networks.LineaMainnet,
    ]

    supportsNetwork = (network: Network): boolean => {
        return this.supportedNetworks.includes(network.caip2Id)
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
                                network: network.caip2Id,
                                alchemyKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
                                version: network.caip2Id.toLowerCase().includes('sepolia') ? 'sandbox' : 'mainnet'
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

    getDetails = async ({ network, token, hashlock, atomicContract }: { network: Network, token: Token, hashlock: string, atomicContract: string }) => {
        return new Promise(async (resolve: (value: LockDetails) => void, reject) => {
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
                            lockConfigs: {
                                hashlock,
                                abi: EVM_HTLC,
                                contractAddress: atomicContract,
                                index: 1,
                            },
                        },
                    },
                }
                let attempts = 1;
                this.worker.postMessage(workerMessage)

                this.worker.onmessage = async (event) => {
                    if (event.data.type !== 'solverLockDetails') return

                    const result = event.data.data
                    if (attempts > 15) {
                        reject('Could not get details via light client')
                        this.worker.terminate()
                        return
                    }

                    if (result?.sender && result.sender !== ZERO_ADDRESS) {
                        const parsedResult: LockDetails = {
                            hashlock,
                            sender: result.sender,
                            recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
                            token: result.token !== ZERO_ADDRESS ? result.token : undefined,
                            amount: Number(formatAmount((hexToBigInt(result.amount._hex)), token.decimals)),
                            secret: Number(result.secret?._hex) !== 0 ? hexToBigInt(result.secret._hex) : undefined,
                            timelock: result.timelock.toNumber(),
                            reward: Number(formatAmount((hexToBigInt(result.reward._hex)), token.decimals)),
                            rewardTimelock: result.rewardTimelock.toNumber(),
                            rewardRecipient: result.rewardRecipient !== ZERO_ADDRESS ? result.rewardRecipient : undefined,
                            rewardToken: result.rewardToken !== ZERO_ADDRESS ? result.rewardToken : undefined,
                            status: result.status,
                            index: 1,
                        }
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
