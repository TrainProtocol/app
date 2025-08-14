import { useAccount, useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { Network, NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { CreatePreHTLCParams, CommitmentParams, LockParams, GetCommitsParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import { writeContract, simulateContract, readContract, waitForTransactionReceipt, signTypedData, CreateConnectorFn } from '@wagmi/core'
import { ethers } from "ethers"
import { Commit } from "../../../Models/phtlc/PHTLC"
import PHTLCAbi from "../../../lib/abis/atomic/EVM_PHTLC.json"
import ERC20PHTLCAbi from "../../../lib/abis/atomic/EVMERC20_PHTLC.json"
import IMTBLZKERC20 from "../../../lib/abis/IMTBLZKERC20.json"
import formatAmount from "../../formatAmount"
import LayerSwapApiClient from "../../trainApiClient"
import { Chain, createPublicClient, http, PublicClient } from "viem"
import resolveChain from "../../resolveChain"
import { useMemo } from "react"
import { getAccount, getConnections } from '@wagmi/core'
import { isMobile } from "../../isMobile"
import convertSvgComponentToBase64 from "../../../components/utils/convertSvgComponentToBase64"
import { LSConnector } from "../connectors/EthereumProvider"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useConnectModal } from "../../../components/WalletModal"
import { explicitInjectedproviderDetected } from "../connectors/getInjectedConnector"
import { useAtomicState } from "../../../context/atomicContext"
import sleep from "../utils/sleep"
import walletsData from "./walletsData.json"

const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
const immutableZKEvm = [KnownInternalNames.Networks.ImmutableZkEVMMainnet, KnownInternalNames.Networks.ImmutableZkEVMTestnet]

export default function useEVM(): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()
    const config = useConfig()

    const evmAccount = useAccount()

    const { selectedSourceAccount } = useAtomicState()
    const account = selectedSourceAccount
    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type == NetworkType.EVM).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...asSourceSupportedNetworks,
    ]

    const autofillSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.BrineMainnet,
    ]

    const { disconnectAsync } = useDisconnect()
    const { connectors: activeConnectors, switchAccountAsync } = useSwitchAccount()
    const activeAccount = useAccount()
    const allConnectors = useConnectors()
    const { connectAsync } = useConnect();
    const { setSelectedConnector } = useConnectModal()


    const disconnectWallet = async (connectorName: string) => {

        try {
            const connector = activeConnectors.find(w => w.name.toLowerCase() === connectorName.toLowerCase())
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallets = () => {
        try {
            activeConnectors.forEach(async (connector) => {
                disconnectWallet(connector.name)
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectWallet = async ({ connector: internalConnector }: { connector: InternalConnector }) => {
        try {
            const connector = availableWalletsForConnect.find(w => w.id === internalConnector.id) as InternalConnector & LSConnector
            if (!connector) throw new Error("Connector not found")
            const Icon = connector.icon || resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
            const base64Icon = typeof Icon == 'string' ? Icon : convertSvgComponentToBase64(Icon)
            setSelectedConnector({ ...connector, icon: base64Icon })
            if (connector.id !== "coinbaseWalletSDK") {
                await connector.disconnect()
                await disconnectAsync({ connector })
            }

            if (isMobile()) {
                if (connector.id !== "walletConnect") {
                    getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                        window.location.href = uri;
                    })
                }
            }
            else if (connector.type !== 'injected' && connector.isMobileSupported && connector.id !== "coinbaseWalletSDK") {
                setSelectedConnector({ ...connector, qr: { state: 'loading', value: undefined } })
                getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                    setSelectedConnector({ ...connector, icon: base64Icon, qr: { state: 'fetched', value: uri } })
                })
            }

            await connectAsync({ connector });

            const activeAccount = await attemptGetAccount(config)
            const connections = getConnections(config)
            const connection = connections.find(c => c.connector.id === connector?.id)

            const wallet = ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet

        } catch (e) {
            //TODO: handle error like in transfer
            const error = e
            if (error.name == 'ConnectorAlreadyConnectedError') {
                throw new Error("Wallet is already connected");
            } else {
                throw new Error(e.message || e);
            }
        }
    }

    const resolvedConnectors: Wallet[] = useMemo(() => {
        const connections = getConnections(config)
        return activeConnectors.map((w): Wallet | undefined => {

            const connection = connections.find(c => c.connector.id === w.id)

            const wallet = ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet
        }).filter(w => w !== undefined) as Wallet[]
    }, [activeAccount, activeConnectors, config])

    const switchAccount = async (wallet: Wallet, address: string) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")
        const { accounts } = await switchAccountAsync({ connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account)
            throw new Error("Account not found")
    }

    const switchChain = async (wallet: Wallet, chainId: string | number) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")

        if (connector?.switchChain) {
            await connector.switchChain({ chainId: Number(chainId) });
        } else {
            throw new Error("Switch chain method is not available on the connector");
        }
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, srcLpAddress: lpAddress, address, amount, decimals, atomicContract, chainId } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Date.now() + LOCK_TIME
        const timeLock = Math.floor(timeLockMS / 1000)

        if (!account?.address) {
            throw Error("Wallet not connected")
        }
        if (isNaN(Number(chainId))) {
            throw Error("Invalid source chain")
        }
        if (!lpAddress) {
            throw Error("No LP address")
        }
        if (!atomicContract) {
            throw Error("No contract address")
        }

        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toBigInt()

        const abi = sourceAsset.contract ? ERC20PHTLCAbi : PHTLCAbi

        function generateBytes32Hex() {
            const bytes = new Uint8Array(32); // 32 bytes = 64 hex characters
            crypto.getRandomValues(bytes);
            return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const id = `0x${generateBytes32Hex()}`;

        let simulationData: any = {
            account: account.address as `0x${string}`,
            abi: abi,
            address: atomicContract,
            functionName: 'commit',
            args: [
                [],
                [],
                [],
                destinationChain,
                destinationAsset,
                address,
                sourceAsset.symbol,
                id,
                lpAddress,
                timeLock,
            ],
            chainId: Number(chainId),
        }

        if (sourceAsset.contract) {
            simulationData.args = [
                ...simulationData.args,
                parsedAmount as any,
                sourceAsset.contract
            ]
            const allowance = await readContract(config, {
                account: account.address as `0x${string}`,
                abi: IMTBLZKERC20,
                address: sourceAsset.contract as `0x${string}`,
                functionName: 'allowance',
                args: [account.address, atomicContract],
                chainId: Number(chainId),
            })

            if (Number(allowance) < parsedAmount) {
                const res = await writeContract(config, {
                    account: account.address as `0x${string}`,
                    abi: IMTBLZKERC20,
                    address: sourceAsset.contract as `0x${string}`,
                    functionName: 'approve',
                    args: [atomicContract, parsedAmount],
                    chainId: Number(chainId),
                })

                await waitForTransactionReceipt(config, {
                    chainId: Number(chainId),
                    hash: res,
                })
            }

        } else {
            simulationData.value = parsedAmount as any
        }

        const { request } = await simulateContract(config, simulationData)

        const hash = await writeContract(config, request)
        return { hash, commitId: id }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        const { chainId, id, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const result: any = await readContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'getHTLCDetails',
            args: [id],
            chainId: Number(chainId),
        })

        // const networkToken = networks.find(network => chainId && network.chainId == chainId)?.tokens.find(token => token.symbol === result.srcAsset)

        const parsedResult = {
            ...result,
            secret: (result.secret as any) != 1 ? BigInt(result.secret!) : undefined,
            hashlock: (result.hashlock == "0x0100000000000000000000000000000000000000000000000000000000000000" || result.hashlock == "0x0000000000000000000000000000000000000000000000000000000000000000") ? null : result.hashlock,
            amount: formatAmount(Number(result.amount), 18), //networkToken?.decimals
            timelock: Number(result.timelock)
        }

        if (!result) {
            throw new Error("No result")
        }
        return parsedResult
    }

    const secureGetDetails = async (params: CommitmentParams): Promise<Commit | null> => {
        const { chainId, id, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const network = networks.find(n => n.chainId === chainId)
        const nodeUrls = [network?.rpcUrl]
        if (!network?.chainId) throw new Error("No network found")
        if (!nodeUrls) throw new Error("No node urls found")

        const chain = resolveChain(network) as Chain

        async function getDetailsFetch(client: PublicClient): Promise<Commit> {
            const result: any = await client.readContract({
                abi: abi,
                address: contractAddress,
                functionName: 'getHTLCDetails',
                args: [id],
            })
            return result
        }

        // Create an array of PublicClients for each RPC endpoint
        const clients = nodeUrls.map((node) =>
            createPublicClient({ transport: http(node), chain })
        )

        // Fetch all results in parallel
        const results = await Promise.all(clients.map((client) => getDetailsFetch(client)))

        // Extract hashlocks
        const hashlocks = results.map(r => r.hashlock).filter(h => h !== "0x0100000000000000000000000000000000000000000000000000000000000000" && h !== "0x0000000000000000000000000000000000000000000000000000000000000000")

        if (!hashlocks.length) return null

        // Verify all hashlocks are the same
        const [firstHashlock, ...otherHashlocks] = hashlocks
        if (!otherHashlocks.every(h => h === firstHashlock)) {
            throw new Error('Hashlocks do not match across the provided nodes')
        }

        const parsedResult = {
            ...results[0],
            secret: (results[0].secret as any) != 1 ? BigInt(results[0].secret!) : undefined,
            timelock: Number(results[0].timelock)
        }

        // All hashlocks match, return one of the results (e.g., the first one)
        return parsedResult

    }

    const addLock = async (params: CommitmentParams & LockParams) => {
        const { chainId, id, hashlock, contractAddress, solver } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Date.now() + LOCK_TIME
        const timeLock = Math.floor(timeLockMS / 1000)

        const apiClient = new LayerSwapApiClient()

        const domain = {
            name: "Train",
            version: "1",
            chainId: Number(chainId),
            verifyingContract: contractAddress as `0x${string}`,
        };

        const types = {
            addLockMsg: [
                { name: "Id", type: "bytes32" },
                { name: "hashlock", type: "bytes32" },
                { name: "timelock", type: "uint48" },
            ],
        };

        const message = {
            Id: id,
            hashlock: hashlock,
            timelock: timeLock,
        };

        if (!account?.address) throw new Error("Wallet not connected")

        const signature = await signTypedData(config, {
            account: account.address as `0x${string}`,
            domain, types, message,
            primaryType: "addLockMsg"
        });

        const sig = ethers.utils.splitSignature(signature)

        try {
            await apiClient.AddLockSig({
                signature,
                v: sig.v.toString(),
                r: sig.r,
                s: sig.s,
                timelock: timeLock,
            },
                id,
                solver
            )
        } catch (e) {
            throw new Error("Failed to add lock")
        }

        return { hash: signature, result: signature }
    }

    const refund = async (params: RefundParams) => {
        const { chainId, id, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const { request } = await simulateContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'refund',
            args: [id],
            chainId: Number(chainId),
        })

        const result = await writeContract(config, request)

        if (!result) {
            throw new Error("No result")
        }
        return result
    }

    const claim = async (params: ClaimParams) => {
        const { chainId, id, contractAddress, type, secret } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi
        if (!evmAccount?.address) throw new Error("Wallet not connected")

        const bigIntSecret = BigInt(secret)

        const { request } = await simulateContract(config, {
            account: evmAccount.address as `0x${string}`,
            abi: abi,
            address: contractAddress,
            functionName: 'redeem',
            args: [id, bigIntSecret],
            chainId: Number(chainId),
        })

        const result = await writeContract(config, request)

        if (!result) {
            throw new Error("No result")
        }

        return result
    }

    const getContracts = async (params: GetCommitsParams) => {
        const { chainId, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        if (!account?.address) {
            throw Error("Wallet not connected")
        }
        const result = await readContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'getContracts',
            args: [account.address],
            chainId: Number(chainId),
        })
        if (!result) {
            throw new Error("No result")
        }
        return (result as string[]).reverse()
    }

    const activeBrowserWallet = explicitInjectedproviderDetected() && allConnectors.filter(c => c.id !== "com.immutable.passport" && c.type === "injected").length === 1
    const filterConnectors = wallet => ((wallet.id === "injected" ? activeBrowserWallet : true))

    const fetchedWallets = useMemo(() => Object.values(walletsData.listings), [])

    {/* //TODO: refactor ordering */ }
    const availableWalletsForConnect: InternalConnector[] = useMemo(() => {
        return dedupePreferInjected(allConnectors.filter(filterConnectors))
            .map(w => {
                const isWalletConnectSupported = fetchedWallets.some(w2 => w2.name.toLowerCase().includes(w.name.toLowerCase()) && (w2.mobile.universal || w2.mobile.native || w2.desktop.native || w2.desktop.universal)) || w.name === "WalletConnect"
                return {
                    ...w,
                    order: resolveWalletConnectorIndex(w.id),
                    type: (w.type == 'injected' && w.id !== 'com.immutable.passport') ? w.type : "other",
                    isMobileSupported: isWalletConnectSupported
                }
            })
    }, [allConnectors, fetchedWallets])

    const provider = {
        connectWallet,
        disconnectWallets,
        switchAccount,
        switchChain,
        isNotAvailableCondition: isNotAvailable,
        connectedWallets: resolvedConnectors,
        activeWallet: resolvedConnectors.find(w => w.isActive),
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect: availableWalletsForConnect,
        name,
        id,
        providerIcon: networks.find(n => ethereumNames.some(name => name === n.name))?.logo,
        createPreHTLC,
        claim,
        refund,
        addLock,
        getDetails,
        secureGetDetails,
        getContracts
    }

    return provider
}


const getWalletConnectUri = async (
    connector: Connector,
    uriConverter: (uri: string) => string = (uri) => uri,
    useCallback: (uri: string) => void,
): Promise<void> => {
    const provider = await connector.getProvider();
    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }
    return new Promise<void>((resolve) => {
        return provider?.['once'] && provider['once']('display_uri', (uri) => {
            resolve(useCallback(uriConverter(uri)));
        })
    }
    );
};

type ResolveWalletProps = {
    connection: {
        accounts: readonly [`0x${string}`, ...`0x${string}`[]];
        chainId: number;
        connector: Connector;
    } | undefined,
    networks: Network[],
    activeConnection: {
        id: string,
        address: string
    } | undefined,
    discconnect: (connectorName: string) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const ResolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connection, networks, discconnect, supportedNetworks, providerName } = props
    const accountIsActive = activeConnection?.id === connection?.connector.id

    const addresses = connection?.accounts as (string[] | undefined);
    const activeAddress = activeConnection?.address
    const connector = connection?.connector
    if (!connector)
        return undefined
    const address = accountIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    const walletname = `${connector?.name} ${connector.id === "com.immutable.passport" ? "" : " - EVM"}`

    const wallet: Wallet = {
        id: connector.name,
        internalId: connector.id,
        isActive: accountIsActive,
        chainId: connection?.chainId,
        address,
        addresses: addresses || [address],
        displayName: walletname,
        providerName,
        icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector), address, iconUrl: connector.icon }),
        disconnect: () => discconnect(connector.name),
        asSourceSupportedNetworks: resolveSupportedNetworks(supportedNetworks.asSource, connector.id),
        autofillSupportedNetworks: resolveSupportedNetworks(supportedNetworks.autofill, connector.id),
        withdrawalSupportedNetworks: resolveSupportedNetworks(supportedNetworks.withdrawal, connector.id),
        networkIcon: networks.find(n => connector?.id === "com.immutable.passport" ? immutableZKEvm.some(name => name === n.name) : ethereumNames.some(name => name === n.name))?.logo,
        metadata: {
            deepLink: (connector as LSConnector).deepLink
        }
    }

    return wallet
}

const isNotAvailable = (connector: string | undefined, network: string | undefined) => {
    if (!network) return false
    if (!connector) return true
    return resolveSupportedNetworks([network], connector).length === 0
}

const resolveSupportedNetworks = (supportedNetworks: string[], connectorId: string) => {

    const specificNetworksConnectors = [
        {
            id: "com.immutable.passport",
            supportedNetworks: [
                KnownInternalNames.Networks.ImmutableXMainnet,
                KnownInternalNames.Networks.ImmutableXGoerli,
                KnownInternalNames.Networks.ImmutableXSepolia,
                KnownInternalNames.Networks.ImmutableZkEVMMainnet,
                KnownInternalNames.Networks.ImmutableZkEVMTestnet,
            ]
        },
        {
            id: "com.roninchain.wallet",
            supportedNetworks: [
                KnownInternalNames.Networks.RoninMainnet,
                KnownInternalNames.Networks.EthereumMainnet,
                KnownInternalNames.Networks.PolygonMainnet,
                KnownInternalNames.Networks.BNBChainMainnet,
                KnownInternalNames.Networks.ArbitrumMainnet
            ]
        }
    ]

    const specificNetworks = specificNetworksConnectors.find(c => c.id === connectorId)

    if (specificNetworks) {
        const values = specificNetworks.supportedNetworks.filter(n => supportedNetworks.some(name => name === n))
        return values
    }

    return supportedNetworks

}

async function attemptGetAccount(config, maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const account = await getAccount(config);

        if (account.address) {
            return account;
        }
        await sleep(500);
    }

    return await getAccount(config);
}

function dedupePreferInjected(arr: Connector<CreateConnectorFn>[]) {
    // Group items by id
    const groups = arr.reduce((acc, obj) => {
        (acc[obj.id] = acc[obj.id] || []).push(obj);
        return acc;
    }, {});
    // For each id, if any item is injected, keep only those; otherwise keep all
    return Object.values(groups).flatMap(group => {
        const groupArr = group as Connector<CreateConnectorFn>[];
        const injected = groupArr.filter(o => o.type === 'injected');
        return injected.length > 0 ? injected : groupArr;
    });
}