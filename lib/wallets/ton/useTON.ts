import KnownInternalNames from "../../knownIds";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { Address, beginCell, Cell, toNano } from "@ton/ton"
import { commitTransactionBuilder } from "./transactionBuilder";
import { hexToBigInt } from "viem";
import { useSettingsState } from "../../../context/settings";
import { retryUntilFecth } from "../../retry";
import { getTONDetails } from "./getters";
import { ConnectedWallet, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { Commit } from "../../../Models/phtlc/PHTLC";
import { calculateEpochTimelock } from "../utils/calculateTimelock";
import { useRpcConfigStore } from "../../../stores/rpcConfigStore";
import { NetworkType } from "../../../Models/Network";

export default function useTON(): WalletProvider {
    const { networks } = useSettingsState()
    const { getEffectiveRpcUrl } = useRpcConfigStore()

    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TONMainnet,
        KnownInternalNames.Networks.TONTestnet
    ]

    const name = 'TON'
    const id = 'ton'

    const tonWallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    // Get TON network configuration
    const tonNetwork = networks?.find(n =>
        n.type === NetworkType.TON &&
        commonSupportedNetworks.some(name => name === n.name)
    );
    const tonApiUrl = tonNetwork ? getEffectiveRpcUrl(tonNetwork) : 'https://testnet.toncenter.com';

    const address = tonWallet?.account && Address.parse(tonWallet.account.address).toString({ bounceable: false })
    const iconUrl = tonWallet?.["imageUrl"] as string
    const wallet_id = tonWallet?.["name"] || tonWallet?.device.appName

    const wallet: Wallet | undefined = tonWallet && address ? {
        id: wallet_id,
        displayName: `${wallet_id} - Ton`,
        addresses: [address],
        address,
        providerName: id,
        isActive: true,
        icon: resolveWalletConnectorIcon({ connector: name, address, iconUrl }),
        disconnect: () => disconnectWallets(),
        connect: () => connectWallet(),
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }

    const connectWallet = async () => {

        if (tonWallet) {
            await disconnectWallets()
        }

        function connectAndWaitForStatusChange(): Promise<ConnectedWallet> {
            return new Promise((resolve, reject) => {
                try {
                    // Initiate the connection
                    tonConnectUI.openModal();

                    tonConnectUI.onModalStateChange((state) => {
                        if (state.status == 'closed' && state.closeReason == 'action-cancelled') {
                            reject("You've declined the wallet connection request");
                        }
                    })
                    // Listen for the status change
                    tonConnectUI.onStatusChange((status) => {
                        if (status) resolve(status); // Resolve the promise with the status
                    });
                } catch (error) {
                    console.error('Error connecting:', error);
                    reject(error); // Reject the promise if an exception is thrown
                }
            });
        }

        const result: Wallet | undefined = await connectAndWaitForStatusChange()
            .then((status: ConnectedWallet) => {
                const connectedAddress = Address.parse(status.account.address).toString({ bounceable: false })
                const connectedName = status.device.appName
                const wallet: Wallet | undefined = status && connectedAddress ? {
                    id: connectedName,
                    displayName: `${connectedName} - Ton`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: id,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: connectedName, address: connectedAddress }),
                    disconnect: () => disconnectWallets(),
                    connect: () => connectWallet(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                } : undefined

                return wallet ? wallet : undefined
            })
            .catch((error) => {
                console.error('Promise rejected with error:', error);
                throw new Error(error);
            });

        return result

    }

    const disconnectWallets = async () => {
        try {
            await tonConnectUI.disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {

        if (!tonWallet?.account.publicKey) return

        const tx = await commitTransactionBuilder({
            wallet: {
                address: tonWallet.account.address,
                publicKey: tonWallet.account.publicKey
            },
            ...params
        })

        if (!tx) throw new Error('Transaction not created')

        const res = await tonConnectUI.sendTransaction(tx)

        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        const getCommitId = async () => {

            await new Promise((resolve) => setTimeout(resolve, 3000))
            const events: Events = await fetch(`${tonApiUrl}/api/v3/events?msg_hash=${messageHash}`).then(res => res.json())

            if (events?.events.length > 0) {

                const transactionsArray = Object.values(events.events[0].transactions)
                const body = transactionsArray.find(t => t.out_msgs?.length > 0 && t.out_msgs[0]?.destination == null && t.out_msgs[0].opcode === '0xbf3d24d1')?.out_msgs?.[0]?.message_content?.body
                if (!body) throw new Error('No commitId')

                const slice = Cell.fromBase64(body).beginParse()
                if (slice.loadUint(32) !== 3208455377) { }
                const commitId = slice.loadIntBig(257);

                return '0x' + commitId.toString(16);
            } else {
                throw new Error('No events')
            }
        }

        const commitId = await retryUntilFecth(getCommitId)


        return { hash: messageHash, commitId }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        const network = networks.find(n => n.chainId === params.chainId)

        try {

            const detailsResult = await getTONDetails({ network, ...params })

            if (!(detailsResult)) {
                throw new Error("No result")
            }
            return detailsResult
        }
        catch (e) {
            console.log(e)
            throw new Error("No result")
        }

    }

    const addLock = async (params: CommitmentParams & LockParams) => {
        const { id, hashlock, contractAddress } = params

        const timelock = BigInt(calculateEpochTimelock(20))

        const body = beginCell()
            .storeUint(1558004185, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .storeInt(hexToBigInt(hashlock as `0x${string}`), 257)
            .storeInt(timelock, 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const res = await tonConnectUI.sendTransaction(tx)
        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        return { hash: messageHash, result: res }
    }

    const refund = async (params: RefundParams) => {
        const { id, contractAddress } = params

        const opcode = 2910985977

        const body = beginCell()
            .storeUint(opcode, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const result = await tonConnectUI.sendTransaction(tx)

        if (!result) {
            throw new Error("No result")
        }
        return result
    }

    const claim = async (params: ClaimParams) => {
        const { id, secret, contractAddress } = params

        const opcode = 1972220037

        const body = beginCell()
            .storeUint(opcode, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .storeInt(hexToBigInt(secret as `0x${string}`), 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const result = await tonConnectUI.sendTransaction(tx);
        const cell = Cell.fromBase64(result.boc);
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');
        return messageHash;
    }

    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALSSURBVHgB7ZoxUxNBGIa/YEhITJRRG61ig40wjlJpExttsbWCX0DyC5L8AqCzQxpbMmNlFxtoYIYRGipS6YwjMxkxxkRE7r0Z7vYWyIXdb8NsZp8qN3N3e+++u9+7t7kEvfv+n0aYMRpxnEDbcQJtxwm0HSfQdpxA23ECbWfkBSZJk8l0gp7cSVIhf4M4aR79o8a3v6SLlsC5QppWizlPpJmBAJHljTbVm11SRfnJivfHaf31LWPiAEYF2kBbqig/3dLzHA2LyuxNUkVpiE6mvHl3L7y0ftCl8uavvtesv7odXNP42qOFxlHf80vTGVqczvq/iw/GPTfHvCF7QldFTaA0LD97xSCu8VYvuvUTd76KmItQGqKY/K1u+ACLXm+jmnKCe4btnSgLVp6DK3ud4DeKQelxhrjAnBNjZ22/Q6ooC1z+0om6OJNlcRHC5qfSwTGcW967BoGYU+XNdnCMwlN5ql7tzqg8y0bcq223vY5U37rVCrH3+3+8ihiuNkozGa0Vje/eo4ngGO6hDR20Uxo9LLJazJMqcE/k5ccW6aItEA6uCb2MzFJZecwVUhH34ByqtS4s66zq9u9IwVFZecgro5p3Tw5YBKKnxdiAi/NTEwNfj3MjhWWrzeIeYFspIzbEMF56kRs4Niqz4dzDPapM7gE2gX5sbITrS8TGIOEvh7pctHRhfdepN3uR2IgLfznUdw6PtWNBhv1lTnQgzkU51N98+kncsAuEgyu74Ry6zEU51LliQcbI63h1K4yNy1wUQx2FpcZYWESMCETBEWPDdzEVuljIJyPuwXET7oGEyY8QDt7e9d/E+wH3Hn44JFMY3RddaMQXDe5YkDEqEAVHjA0ZFBbuWJAxvrPdb3PJVGERMS7QX6funhdiKhZkhvLfhBgbwGQsyAxFIGIDQ3Xnx7HvGorPMNwDCfetmuU4gbbjBNqOE2g7TqDtOIG2cwq0XR5LWK5AWAAAAABJRU5ErkJggg=='
    const availableWalletsForConnect: InternalConnector[] = [{
        id: id,
        name: name,
        icon: logo,
    }]

    const provider = {
        connectWallet,
        disconnectWallets,
        availableWalletsForConnect,
        activeAccountAddress: wallet?.address,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,

        createPreHTLC,
        getDetails,
        addLock,
        refund,
        claim
    }

    return provider
}

type Events = {
    events: {
        transactions: {
            [transaction: string]: {
                out_msgs: {
                    opcode: string
                    destination: string | null,
                    message_content: {
                        body: string,
                    },
                }[]
            }
        }
    }[]
}