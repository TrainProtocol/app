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
import LayerSwapApiClient from "../../layerSwapApiClient";

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

    const network = networks.find(n => n.name.toLowerCase().includes('fuel'))
    const fuelProvider = network && new Provider(network?.nodes[0].url);

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
            const chain = fuelConnector && (await fuelConnector.currentNetwork()).chainId

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
                    chain,
                    commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                })

                removeWallet(name, fuelConnector.name)
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
        try {
            const res = await fuel.selectConnector(wallet.id)

            if (!res) throw new Error('Could not switch account')
        } catch (e) {
            console.log(e)
        }
    }

    const switchChain = async (connector: Wallet, chainId: string | number) => {
        try {
            const fuelConnector = connectors.find(c => c.name === connector.id)

            if (!fuelConnector) throw new Error('Connector not found')

            const res = await fuelConnector.selectNetwork({ chainId: Number(chainId) })

            if (!res) throw new Error('Could not switch chain')
        } catch (e) {
            console.log(e)
        }
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const createEmptyArray = (length: number, char: string) =>
            Array.from({ length }, () => ''.padEnd(64, char));

        const hopChains = createEmptyArray(5, ' ')
        const hopAssets = createEmptyArray(5, ' ')
        const hopAddresses = createEmptyArray(5, ' ')

        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, amount, decimals, atomicContract } = params

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Math.floor((Date.now() + LOCK_TIME) / 1000)
        const timelock = DateTime.fromUnixSeconds(timeLockMS).toTai64();

        if (!fuelProvider) throw new Error('Node url not found')
        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = new Contract(atomicContract, contractAbi, wallet);

        const commitId = generateUint256Hex().toString()

        const dstChain = destinationChain.padEnd(64, ' ');
        const dstAsset = destinationAsset.padEnd(64, ' ');
        const dstAddress = address.padEnd(64, ' ');
        const srcAsset = sourceAsset.symbol.padEnd(64, ' ');
        const srcReceiver = { bits: lpAddress };

        const parsedAmount = Number(amount) * 10 ** decimals

        const { transactionId } = await contractInstance.functions
            .commit(hopChains, hopAssets, hopAddresses, dstChain, dstAsset, dstAddress, srcAsset, commitId, srcReceiver, timelock)
            .callParams({
                forward: [parsedAmount, await fuelProvider.getBaseAssetId()],
            })
            .call();

        return { hash: transactionId, commitId: commitId.toString() }
    }

    const claim = async (params: ClaimParams) => {
        const { id, contractAddress: contractAddressString, secret } = params

        const secretBigInt = BigInt(secret);
        const idBigInt = BigInt(id);

        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = new Contract(contractAddressString, contractAbi, wallet);

        if (!contractInstance) throw new Error('Contract instance not found')

        const { transactionId, waitForResult } = await contractInstance.functions
            .redeem(idBigInt, secretBigInt)
            .call();

        await waitForResult();

        return transactionId
    }

    const refund = async (params: RefundParams) => {
        const { id, contractAddress: contractAddressString } = params

        if (!wallet) throw new Error('Wallet not connected')

        const contractInstance = new Contract(contractAddressString, contractAbi, wallet);

        if (!contractInstance) throw new Error('Contract instance not found')

        const { transactionId, waitForResult } = await contractInstance.functions
            .refund(id)
            .call();

        await waitForResult();

        return transactionId

    }

    const getDetails = async (params: CommitmentParams) => {
        const { id, contractAddress: contractAddressString } = params

        const contractInstance = fuelProvider && new Contract(contractAddressString, contractAbi, fuelProvider);

        if (!contractInstance) throw new Error('Contract instance not found')

        const details = (await contractInstance.functions.get_htlc_details(id).get()).value

        const resolvedDetails = {
            ...details,
            amount: Number(details.amount) / 10 ** details.decimals,
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
        const timeLockS = Math.floor((Date.now() + LOCK_TIME) / 1000)
        const timelock = DateTime.fromUnixSeconds(timeLockS).toTai64();

        const timelockHex = '0x' + BigInt(timelock).toString(16).padStart(64, '0');

        const msg = [id, hashlock, timelockHex];
        const msgBytes = Uint8Array.from(msg.flatMap((hexStr) => Array.from(arrayify(hexStr))));

        if (!wallet) throw new Error('Wallet not connected')

        const msgHash = await wallet.signMessage(hexlify(sha256(msgBytes)));
        const apiClient = new LayerSwapApiClient()

        try {
            await apiClient.AddLockSig({
                signature: msgHash,
                timelock: timeLockS,
            }, id)
        } catch (e) {
            throw new Error("Failed to add lock")
        }

        return { hash: msgHash, result: msgHash }
    }

    const connectedConnectors = useMemo(() => connectors.filter(w => w.connected), [connectors])

    useEffect(() => {
        (async () => {
            for (const connector of connectedConnectors) {
                try {
                    const addresses = (await connector.accounts()).map(a => Address.fromAddressOrString(a).toB256())
                    const chain = (await connector.currentNetwork()).chainId
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
                            chain,
                            commonSupportedNetworks: commonSupportedNetworks,
                            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                        })
                        removeWallet(name, connector.name)
                        addWallet(w)
                    }

                } catch (e) {
                    console.log(e)
                }

            }

        })()
    }, [connectedConnectors, wallet])


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
        switchChain,
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

    return provider
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
    chain?: number
}

const resolveFuelWallet = ({ address, addresses, commonSupportedNetworks, connectWallet, connector, disconnectWallet, evmAddress, evmConnector, name, networkIcon, chain }: ResolveWalletProps) => {
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
        chainId: chain,
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