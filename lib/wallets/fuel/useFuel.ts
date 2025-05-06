import KnownInternalNames from "../../knownIds";
import {
    useConnectors,
    useFuel as useGlobalFuel,
    useWallet
} from '@fuels/react';
import { Connector, useAccount } from "wagmi";
import {
    FuelConnector,
    Predicate,
    Provider,
    getPredicateRoot,
} from '@fuel-ts/account';
import { Address } from '@fuel-ts/address';
import shortenAddress from "../../../components/utils/ShortenAddress";
import { BAKO_STATE } from "./Basko";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { useConnectModal } from "../../../components/WalletModal";
import { useEffect, useMemo } from "react";
import { useWalletStore } from "../../../stores/walletStore";
import { useSettingsState } from "../../../context/settings";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../phtlc";
import { arrayify, DateTime, hexlify } from "@fuel-ts/utils";
import { Contract } from "@fuel-ts/program";
import contractAbi from "../../abis/atomic/FUEL_PHTLC.json"
import { sha256 } from "@noble/hashes/sha256";

export default function useFuel(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.FuelTestnet,
        KnownInternalNames.Networks.FuelDevnet,
        KnownInternalNames.Networks.FuelMainnet
    ]
    const name = 'Fuel'
    const id = 'fuel'

    const { address: evmAddress, connector: evmConnector } = useAccount()
    const { connectors } = useConnectors()
    const { wallet } = useWallet()
    const { fuel } = useGlobalFuel()
    const { connect } = useConnectModal()
    const { networks } = useSettingsState()

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const connectedWallets = wallets.filter(wallet => wallet.providerName === name)

    const connectWallet = async () => {
        try {
            return await connect(provider)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }: { connector: InternalConnector }) => {
        try {

            const fuelConnector = connectors.find(w => w.name === connector.name)

            if (!fuelConnector?.installed) {
                const installLink = fuelConnector?.metadata.install.link
                if (installLink) {
                    window.open(installLink, "_blank");
                    return
                }
            }

            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 120_000
            await fuelConnector?.connect()

            const addresses = (await fuelConnector?.accounts())?.map(a => Address.fromAddressOrString(a).toB256())

            if (addresses && fuelConnector) {

                const result = resolveFuelWallet({
                    address: addresses[0],
                    addresses: addresses,
                    connector: fuelConnector,
                    evmAddress,
                    evmConnector,
                    connectWallet,
                    disconnectWallet,
                    name,
                    commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                })

                addWallet(result)
                await switchAccount(result)
                return result
            }

        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = async (connectorName: string) => {
        try {
            const fuelConnector = connectors.find(c => c.name === connectorName)

            if (!fuelConnector) throw new Error('Connector not found')

            await fuelConnector.disconnect()
        }
        catch (e) {
            console.log(e)
        } finally {
            removeWallet(name, connectorName)
        }
    }

    const disconnectWallets = async () => {
        try {
            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 10_000
            for (const connector of connectors.filter(c => c.connected)) {
                await connector.disconnect()
                removeWallet(name)
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    const switchAccount = async (wallet: Wallet) => {
        await fuel.selectConnector(wallet.id)
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const createEmptyArray = (length: number, char: string) =>
            Array.from({ length }, () => ''.padEnd(64, char));

        const hopChains = createEmptyArray(5, ' ')
        const hopAssets = createEmptyArray(5, ' ')
        const hopAddresses = createEmptyArray(5, ' ')

        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, amount, decimals, atomicContract, chainId, sourceChain } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Math.floor((Date.now() + LOCK_TIME) / 1000)
        const timelock = DateTime.fromUnixSeconds(timeLockMS).toTai64();

        const sourceNetwork = networks.find(n => n.name === sourceChain)

        const provider = sourceNetwork && await Provider.create(sourceNetwork?.nodes[0].url);

        if (!provider) throw new Error('Node url not found')
        if (!wallet) throw new Error('Wallet not connected')

        const contractAddress = Address.fromB256(atomicContract);
        const contractInstance = new Contract(contractAddress, contractAbi, wallet);

        const commitId = generateUint256Hex().toString()

        const dstChain = destinationChain.padEnd(64, ' ');
        const dstAsset = destinationAsset.padEnd(64, ' ');
        const dstAddress = address.padEnd(64, ' ');
        const srcAsset = sourceAsset.symbol.padEnd(64, ' ');
        const srcReceiver = { bits: lpAddress };

        const { transactionId } = await contractInstance.functions
            .commit(hopChains, hopAssets, hopAddresses, dstChain, dstAsset, dstAddress, srcAsset, commitId, srcReceiver, timelock)
            .callParams({
                forward: [Number(amount), provider.getBaseAssetId()],
            })
            .call();

        return { hash: transactionId, commitId: commitId.toString() }
    }

    const claim = async (params: ClaimParams) => {
        const { id, contractAddress: contractAddressString, secret } = params

        const network = networks.find(n => n.name.toLowerCase().includes('fuel'))
        const provider = network && await Provider.create(network?.nodes[0].url);
        const contractAddress = Address.fromB256(contractAddressString);
        const secretBigInt = BigInt(secret);
        const idBigInt = BigInt(id);

        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = provider && new Contract(contractAddress, contractAbi, wallet);

        if (!contractInstance) throw new Error('Contract instance not found')

        const { transactionId, waitForResult } = await contractInstance.functions
            .redeem(idBigInt, secretBigInt)
            .call();

        await waitForResult();

        return transactionId
    }

    const refund = async (params: RefundParams) => {
        const { id, contractAddress: contractAddressString } = params

        const network = networks.find(n => n.name.toLowerCase().includes('fuel'))
        const provider = network && await Provider.create(network?.nodes[0].url);
        const contractAddress = Address.fromB256(contractAddressString);

        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = provider && new Contract(contractAddress, contractAbi, wallet);

        if (!contractInstance) throw new Error('Contract instance not found')

        const { transactionId, waitForResult } = await contractInstance.functions
            .refund(id)
            .call();

        await waitForResult();

        return transactionId

    }

    const getDetails = async (params: CommitmentParams) => {
        const { id, contractAddress: contractAddressString } = params

        const network = networks.find(n => n.name.toLowerCase().includes('fuel'))
        const provider = network && await Provider.create(network?.nodes[0].url);
        const contractAddress = Address.fromB256(contractAddressString);
        const contractInstance = provider && new Contract(contractAddress, contractAbi, provider);

        if (!contractInstance) throw new Error('Contract instance not found')

        const details = (await contractInstance.functions.get_htlc_details(id).get()).value


        const resolvedDetails = {
            ...details,
            amount: details.amount.toString(),
            sender: details.sender?.['bits'],
            receiver: details.receiver?.['bits'],
            timelock: DateTime.fromTai64(details.timelock).toUnixSeconds(),
            secret: Number(details.secret),
            hashlock: details.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000001" ? details.hashlock : undefined,
        }

        return resolvedDetails
    }
    const addLockSig = async (params: CommitmentParams & LockParams) => {
        const { id, hashlock } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Math.floor((Date.now() + LOCK_TIME) / 1000)
        const timelock = DateTime.fromUnixSeconds(timeLockMS).toTai64();

        const timelockHex = '0x' + BigInt(timelock).toString(16).padStart(64, '0');

        const msg = [id, hashlock, timelockHex];
        const msgBytes = Uint8Array.from(msg.flatMap((hexStr) => Array.from(arrayify(hexStr))));

        if (!wallet) throw new Error('Wallet not connected')

        const msgHash = await wallet.signMessage(hexlify(sha256(msgBytes)));

        return { hash: msgHash, result: msgHash }
    }

    const connectedConnectors = useMemo(() => connectors.filter(w => w.connected), [connectors])

    useEffect(() => {
        (async () => {
            for (const connector of connectedConnectors) {
                try {
                    const addresses = (await connector.accounts()).map(a => Address.fromAddressOrString(a).toB256())
                    if (connector.connected && addresses.length > 0) {
                        const w = resolveFuelWallet({
                            address: addresses?.[0],
                            addresses,
                            connector,
                            evmAddress,
                            evmConnector,
                            connectWallet,
                            disconnectWallet,
                            name,
                            commonSupportedNetworks: commonSupportedNetworks,
                            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                        })
                        addWallet(w)
                    }

                } catch (e) {
                    console.log(e)
                }

            }

        })()
    }, [connectedConnectors])

    const availableWalletsForConnect: InternalConnector[] = connectors.map(c => {

        const name = c.installed ? c.name : `Install ${c.name}`

        return {
            name: name,
            id: c.name,
            type: c.installed ? 'injected' : 'other',
        }
    })

    const provider = {
        connectWallet,
        connectConnector,
        disconnectWallets,
        switchAccount,
        availableWalletsForConnect,
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        activeWallet: connectedWallets?.[0],
        connectedWallets,
        name,
        id,
        createPreHTLC,
        claim,
        refund,
        getDetails,
        addLock: addLockSig,
    }

    return provider as unknown as WalletProvider
}

type ResolveWalletProps = {
    address: string,
    addresses: string[],
    connector: FuelConnector,
    evmAddress: `0x${string}` | undefined,
    evmConnector: Connector | undefined,
    connectWallet: () => Promise<Wallet | undefined>,
    disconnectWallet: (connectorName: string) => Promise<void>,
    name: string,
    commonSupportedNetworks: string[],
    networkIcon?: string,
}

const resolveFuelWallet = ({ address, addresses, commonSupportedNetworks, connectWallet, connector, disconnectWallet, evmAddress, evmConnector, name, networkIcon }: ResolveWalletProps) => {
    let fuelCurrentConnector: string | undefined = undefined

    let customConnectorname: string | undefined = undefined
    const fuelEvmConnector = connector.name === 'Ethereum Wallets' ? connector : undefined
    // const fuelSolanaConnector = connector.name === 'Solana Wallets' ? connector : undefined

    if (fuelEvmConnector && evmAddress && fuelEvmConnector.connected && evmConnector) {
        // @ts-expect-error processPredicateData is only available in the Predicate class
        const { predicateBytes } = Predicate.processPredicateData(
            (fuelEvmConnector as any)?.predicateAccount?.bytecode,
            (fuelEvmConnector as any)?.predicateAccount?.abi,
            {
                SIGNER: (fuelEvmConnector as any)?.predicateAccount?.adapter?.convertAddress(evmAddress),
            },
        );
        const convertedAddress = Address.fromB256(getPredicateRoot(predicateBytes)).toString();
        if (convertedAddress.toLowerCase() === address.toLowerCase()) {
            fuelCurrentConnector = `${evmConnector.name} (${shortenAddress(evmAddress)})`
            customConnectorname = evmConnector.name
        }
    }

    const w: Wallet = {
        id: connector.name,
        address: address,
        addresses: addresses,
        isActive: true,
        connect: connectWallet,
        disconnect: () => disconnectWallet(connector.name),
        displayName: `${fuelCurrentConnector || connector.name} - Fuel`,
        providerName: name,
        icon: resolveWalletConnectorIcon({ connector: customConnectorname || connector.name, address: address, iconUrl: typeof connector.metadata.image === 'string' ? connector.metadata.image : (connector.metadata.image?.light.startsWith('data:') ? connector.metadata.image.light : `data:image/svg+xml;base64,${connector.metadata.image && btoa(connector.metadata.image.light)}`) }),
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        networkIcon
    }

    return w
}

function generateUint256Hex() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // turn into a 64-char hex string
    const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return '0x' + hex;
}

function generateUint256() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // pack into a BigInt
    return bytes.reduce(
        (acc, byte) => (acc << 8n) | BigInt(byte),
        0n
    );
}
