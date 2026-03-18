import formatAmount from "../../../formatAmount"
import _LightClient from "../../types/lightClient"
import EVM_HTLC from '../../../abis/atomic/EVM_HTLC.json'
import { LockDetails, LockStatus } from "../../../../Models/phtlc/PHTLC"
import KnownInternalNames from "../../../knownIds"
import { Network, Token } from "../../../../Models/Network"
import { hexToBigInt } from "viem"
import { LIGHT_CLIENT_SUPPORTED_NETWORKS } from "../../supportsNetwork"

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export default class EVMLightClient extends _LightClient {

    private worker: Worker | undefined

    supportsNetwork = (network: Network): boolean => {
        return LIGHT_CLIENT_SUPPORTED_NETWORKS.includes(network.caip2Id)
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
                                version: network.caip2Id === KnownInternalNames.Networks.EthereumSepolia ? 'sandbox' : 'mainnet'
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

                const worker = this.worker!;

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
                worker.postMessage(workerMessage)

                worker.onmessage = async (event) => {
                    if (event.data.type !== 'solverLockDetails') return

                    const result = event.data.data
                    if (attempts > 15) {
                        reject('Could not get details via light client')
                        worker.terminate()
                        this.worker = undefined
                        return
                    }

                    if (result?.sender && result.sender !== ZERO_ADDRESS) {
                        const toBigInt = (v: any): bigint => v?._hex ? hexToBigInt(v._hex) : BigInt(v ?? 0)
                        const toNum = (v: any): number => v?.toNumber ? v.toNumber() : Number(v ?? 0)

                        const parsedResult: LockDetails = {
                            hashlock,
                            sender: result.sender,
                            recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
                            token: result.token !== ZERO_ADDRESS ? result.token : undefined,
                            amount: Number(formatAmount(toBigInt(result.amount), token.decimals)),
                            secret: toNum(result.secret) !== 0 ? toBigInt(result.secret) : undefined,
                            timelock: toNum(result.timelock),
                            reward: Number(formatAmount(toBigInt(result.reward), token.decimals)),
                            rewardTimelock: toNum(result.rewardTimelock),
                            rewardRecipient: result.rewardRecipient !== ZERO_ADDRESS ? result.rewardRecipient : undefined,
                            rewardToken: result.rewardToken !== ZERO_ADDRESS ? result.rewardToken : undefined,
                            status: Number(result.status) as LockStatus,
                            index: 1,
                        }
                        resolve(parsedResult)
                        worker.terminate()
                        this.worker = undefined
                        return
                    }
                    console.log('Retrying in 5 seconds ', attempts)
                    await sleep(5000)
                    worker.postMessage(workerMessage)
                    attempts++
                }
                worker.onerror = (error) => {
                    reject(error)
                    worker.terminate()
                    this.worker = undefined
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
