import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { cairo, Call, constants, Contract, RpcProvider, shortString, TypedData, TypedDataRevision } from "starknet";
import PHTLCAbi from "../../../lib/abis/atomic/STARKNET_PHTLC.json"
import ETHABbi from "../../../lib/abis/STARKNET_ETH.json"
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, GetCommitsParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { ethers } from "ethers";
import { toHex } from "viem";
import formatAmount from "../../formatAmount";
import { useSettingsState } from "../../../context/settings";
import { useConnect, useDisconnect } from "@starknet-react/core";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { useMemo } from "react";
import LayerSwapApiClient from "../../trainApiClient";
import { Commit } from "../../../Models/phtlc/PHTLC";
import { calculateEpochTimelock } from "../utils/calculateTimelock";
import { useRpcConfigStore } from "../../../stores/rpcConfigStore";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { startRegistration, base64URLStringToBuffer, bufferToBase64URLString } from '@simplewebauthn/browser';

const starknetNames = [KnownInternalNames.Networks.StarkNetGoerli, KnownInternalNames.Networks.StarkNetMainnet, KnownInternalNames.Networks.StarkNetSepolia]
export default function useStarknet(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...commonSupportedNetworks
    ]

    const name = 'Starknet'
    const id = 'starknet'
    const { networks } = useSettingsState()
    const { getEffectiveRpcUrl } = useRpcConfigStore()

    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)
    const network = networks?.find(network => starknetNames.some(name => name === network.name))
    const nodeUrl = network ? getEffectiveRpcUrl(network) : undefined

    const resolveChainId = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? constants.StarknetChainId.SN_SEPOLIA : constants.StarknetChainId.SN_MAIN;
    const hkdfInfo = Buffer.from('starknet-signature-key-derivation', 'utf8');
    const keyLength = 32; // 256 bits
    const normalizeHex = (value: string) => value.length % 2 === 0 ? value : `0${value}`;
    const deriveKeyMaterial = (ikm: Uint8Array, salt: Uint8Array) => hkdf(sha256, ikm, salt, hkdfInfo, keyLength);
    const chainIdHex = (() => {
        if (typeof resolveChainId === 'string') {
            return normalizeHex(resolveChainId.startsWith('0x') ? resolveChainId.slice(2) : resolveChainId);
        }

        return normalizeHex(BigInt(resolveChainId as unknown as string).toString(16));
    })();

    const PASSKEY_STORAGE_KEY = `train:starknet:passkeyCredentialId:${chainIdHex}`;

    const getStoredPasskeyCredentialId = () => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(PASSKEY_STORAGE_KEY);
    };

    const storePasskeyCredentialId = (credId: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(PASSKEY_STORAGE_KEY, credId);
    };

    const getPasskeyPrfSalt = () => {
        // 32-byte salt for the PRF input, deterministic per chain.
        // (PRF output stays secret in the authenticator; salt just scopes it)
        const input = Buffer.concat([
            Buffer.from('train-passkey-prf-salt-v1:', 'utf8'),
            Buffer.from(chainIdHex, 'hex'),
        ]);
        return new Uint8Array(sha256(input));
    };

    const ensurePasskeyRegistered = async (): Promise<string> => {
        const existing = getStoredPasskeyCredentialId();
        if (existing) return existing;

        if (typeof window === 'undefined') throw new Error('Passkey registration must run in a browser');
        if (!window.isSecureContext) throw new Error('Passkeys require HTTPS (secure context)');

        // Create a discoverable (resident) credential.
        const challengeBytes = new Uint8Array(32);
        window.crypto.getRandomValues(challengeBytes);

        const userIdBytes = new Uint8Array(16);
        window.crypto.getRandomValues(userIdBytes);
        const u8ToArrayBuffer = (u8: Uint8Array) =>
            u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

        const challengeB64 = bufferToBase64URLString(u8ToArrayBuffer(challengeBytes) as any);
        const userIdB64 = bufferToBase64URLString(u8ToArrayBuffer(userIdBytes) as any);
        const optionsJSON = {
            // SimpleWebAuthn expects base64url *strings* for optionsJSON.challenge
            challenge: challengeB64,
            rp: { name: 'Train', id: window.location.hostname },
            user: {
                // SimpleWebAuthn expects base64url *strings* for optionsJSON.user.id
                id: userIdB64,
                name: 'train-user',
                displayName: 'Train user',
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                residentKey: 'required',
                userVerification: 'required',
            },
            attestation: 'none',
            timeout: 60000,
        } as const;

        const attestation = await startRegistration({ optionsJSON } as any);

        // Save credential id (base64url string)
        storePasskeyCredentialId(attestation.id);
        return attestation.id;
    };

    const deriveInitialKeyBufferWithPasskey = async () => {
        if (typeof window === 'undefined') throw new Error('Passkey auth must run in a browser');
        if (!window.isSecureContext) throw new Error('Passkeys require HTTPS (secure context)');

        const credentialIdB64 = await ensurePasskeyRegistered();

        // PRF works during authentication (navigator.credentials.get)
        // and returns a stable secret per (credential, salt).  [oai_citation:1‡W3C GitHub](https://w3c.github.io/webauthn/?utm_source=chatgpt.com)
        const challengeBytes = new Uint8Array(32);
        window.crypto.getRandomValues(challengeBytes);

        const prfSalt = getPasskeyPrfSalt();

        const publicKey: PublicKeyCredentialRequestOptions = {
            rpId: window.location.hostname,
            challenge: challengeBytes,
            userVerification: 'required',
            allowCredentials: [
                {
                    type: 'public-key',
                    id: base64URLStringToBuffer(credentialIdB64),
                },
            ],
            // TS DOM libs may not include `prf` yet, so we cast.
            extensions: {
                prf: {
                    evalByCredential: {
                        [credentialIdB64]: { first: prfSalt },
                    },
                },
            } as any,
        };

        const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;

        // Extension outputs are read via getClientExtensionResults().  [oai_citation:2‡MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/getClientExtensionResults?utm_source=chatgpt.com)
        const ext: any = cred.getClientExtensionResults?.() ?? {};
        const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

        if (!prfFirst) {
            throw new Error('Passkey PRF extension not available in this browser/authenticator');
        }

        // PRF output is 32 bytes (spec).  [oai_citation:3‡W3C GitHub](https://w3c.github.io/webauthn/?utm_source=chatgpt.com)
        const ikm = new Uint8Array(prfFirst);
        const initialSalt = Buffer.from(chainIdHex, 'hex');

        return Buffer.from(deriveKeyMaterial(ikm, initialSalt));
    };
    const getSignatureTypedData = (): TypedData => ({
        domain: {
            name: 'Train',
            chainId: resolveChainId,
            version: 'v1',
            revision: TypedDataRevision.ACTIVE,
        },
        message: {
            message: "I am using TRAIN",
        },
        primaryType: 'message',
        types: {
            message: [
                {
                    name: 'message',
                    type: 'felt',
                },
            ],
            StarknetDomain: [
                {
                    name: 'name',
                    type: 'shortstring',
                },
                {
                    name: 'chainId',
                    type: 'shortstring',
                },
                {
                    name: 'version',
                    type: 'shortstring',
                },
            ],
        },
    });

    const deriveInitialKeyBuffer = async () => {
        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected');
        }

        const signature = await starknetWallet.metadata.starknetAccount.signMessage(getSignatureTypedData());
        const rValue = typeof signature[0] === 'string' ? signature[0] : BigInt(signature[0]).toString(16);
        const sValue = typeof signature[1] === 'string' ? signature[1] : BigInt(signature[1]).toString(16);

        const rHex = normalizeHex(rValue.startsWith('0x') ? rValue.slice(2) : rValue);
        const sHex = normalizeHex(sValue.startsWith('0x') ? sValue.slice(2) : sValue);
        const inputMaterial = Buffer.from(rHex + sHex, 'hex');
        const initialSalt = Buffer.from(chainIdHex, 'hex');
        return Buffer.from(deriveKeyMaterial(inputMaterial, initialSalt));
    };

    const deriveKeyFromTimelock = (initialKey: Buffer, timelock: number) => {
        const timelockSalt = Buffer.from(normalizeHex(timelock.toString(16)), 'hex');
        const derivedKeyBuffer = Buffer.from(deriveKeyMaterial(initialKey, timelockSalt));
        return derivedKeyBuffer;
    };

    const starknetWallet = useMemo(() => {
        const wallet = wallets.find(wallet => wallet.providerName === name)

        if (!wallet) return

        return wallet

    }, [wallets])

    const connectWallet = async ({ connector }) => {
        try {
            const starknetConnector = connectors.find(c => c.id === connector.id)

            const result = await starknetConnector?.connect({})

            const walletChain = `0x${result?.chainId?.toString(16)}`
            const wrongChanin = walletChain == '0x534e5f4d41494e' ? !isMainnet : isMainnet

            if (result?.account && wrongChanin) {
                disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                throw new Error(errorMessage)
            }

            if (result?.account && starknetConnector) {
                const { RpcProvider, WalletAccount } = await import('starknet')

                const rpcProvider = new RpcProvider({
                    nodeUrl,
                })

                const starknetWalletAccount = await WalletAccount.connectSilent(rpcProvider, (starknetConnector as any).wallet);

                const wallet: Wallet = {
                    id: connector.name,
                    displayName: `${connector.name} - Starknet`,
                    address: result?.account,
                    addresses: [result?.account],
                    chainId: walletChain,
                    icon: resolveWalletConnectorIcon({ connector: connector.name, address: result?.account }),
                    providerName: name,
                    metadata: {
                        starknetAccount: starknetWalletAccount,
                        // wallet: account
                    },
                    isActive: true,
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => starknetNames.some(name => name === n.name))?.logo
                }

                addWallet(wallet)

                return wallet
            }
        }

        catch (e) {
            console.log(e)
            throw new Error(e)
        }
    }

    const disconnectWallets = async () => {
        try {
            await disconnectAsync()
            removeWallet(name)
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = connectors.map(connector => {
        const name = (!connectorsConfigs.some(c => c.id === connector.id) || connector?.["_wallet"]) ? connector.name : `${connectorsConfigs.find(c => c.id === connector.id)?.name}`

        return {
            name: name,
            id: connector.id,
            icon: typeof connector.icon === 'string' ? connector.icon : (connector.icon.light.startsWith('data:') ? connector.icon.light : `data:image/svg+xml;base64,${btoa(connector.icon.light.replaceAll('currentColor', '#FFFFFF'))}`),
            type: connector?.["_wallet"] ? 'injected' : 'other',
            installUrl: connector?.["_wallet"] ? undefined : connectorsConfigs.find(c => c.id === connector.id)?.installLink,
        }
    })


    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, srcLpAddress: lpAddress, address, tokenContractAddress, amount, decimals, atomicContract: atomicAddress } = params

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }
        if (!tokenContractAddress) {
            throw new Error('No token contract address')
        }

        try {
            const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toString()
            const parsedAmountBigInt = BigInt(parsedAmount)
            const rewardAmountBigInt = parsedAmountBigInt
            const allowanceTotal = parsedAmountBigInt + rewardAmountBigInt
            const parsedAmountUint = cairo.uint256(parsedAmountBigInt)
            const rewardAmountUint = cairo.uint256(rewardAmountBigInt)

            const erc20Contract = new Contract(
                {
                    abi: ETHABbi,
                    address: tokenContractAddress,
                    providerOrAccount: starknetWallet.metadata?.starknetAccount,
                }
            )
            const increaseAllowanceCall: Call = erc20Contract.populate("increaseAllowance", [atomicAddress, cairo.uint256(allowanceTotal)])

            function generateBytes32Hex() {
                const bytes = new Uint8Array(32); // 32 bytes = 64 hex characters
                crypto.getRandomValues(bytes);
                return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            const id = `0x${generateBytes32Hex()}`
            const idUint = cairo.uint256(id)
            const LOCK_TIME = 1000 * 60 * 80 // 80 minutes
            const REWARD_TIME = 1000 * 60 * 70 // 70 minutes
            const timeLock = Math.floor((Date.now() + LOCK_TIME) / 1000)
            const rewardTimelock = Math.floor((Date.now() + REWARD_TIME) / 1000)
            const rewardTimelockUint = cairo.uint256(rewardTimelock)
            const timelockUint = cairo.uint256(timeLock)
            const initialKeyBuffer = await deriveInitialKeyBuffer();
            // const initialKeyBuffer = await deriveInitialKeyBufferWithPasskey();
            const derivedKeyBuffer = deriveKeyFromTimelock(initialKeyBuffer, timeLock);
            const hashlock = '0x' + Buffer.from(sha256(derivedKeyBuffer)).toString('hex');
            const hashlockUint = cairo.uint256(hashlock)
            const args = [
                idUint,
                hashlockUint,
                rewardAmountUint,
                rewardTimelockUint,
                timelockUint,
                lpAddress,
                sourceAsset.symbol,
                destinationChain,
                address,
                destinationAsset,
                parsedAmountUint,
                tokenContractAddress,
            ]
            const atomicContract = new Contract(
                {
                    abi: PHTLCAbi,
                    address: atomicAddress,
                    providerOrAccount: starknetWallet.metadata?.starknetAccount,
                }
            )

            const lockCall: Call = atomicContract.populate("lock", args)

            const trx = (await starknetWallet?.metadata?.starknetAccount?.execute([increaseAllowanceCall, lockCall]))

            await starknetWallet.metadata.starknetAccount.waitForTransaction(
                trx.transaction_hash
            );
            const recoveredInitialKeyBuffer = await deriveInitialKeyBuffer();
            // const recoveredInitialKeyBuffer = await deriveInitialKeyBufferWithPasskey();
            const recoveredDerivedKey = deriveKeyFromTimelock(recoveredInitialKeyBuffer, timeLock);
            const secret = '0x' + recoveredDerivedKey.toString('hex');
            const claimCall: Call = atomicContract.populate('redeem', [id, secret])
            const tr_redeem = (await starknetWallet?.metadata?.starknetAccount?.execute(claimCall))

            return { hash: trx.transaction_hash as `0x${string}`, commitId: id }
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
        }

    }

    const refund = async (params: RefundParams) => {
        const { contractAddress: atomicAddress, id } = params

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }

        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: atomicAddress,
                providerOrAccount: starknetWallet.metadata?.starknetAccount,
            }
        )

        const refundCall: Call = atomicContract.populate('refund', [id])
        const trx = (await starknetWallet?.metadata?.starknetAccount?.execute(refundCall))

        if (!trx) {
            throw new Error("No result")
        }
        return trx.transaction_hash
    }

    const claim = async (params: ClaimParams) => {
        const { contractAddress: atomicAddress, id, secret } = params

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }

        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: atomicAddress,
                providerOrAccount: starknetWallet.metadata?.starknetAccount,
            }
        )

        const claimCall: Call = atomicContract.populate('redeem', [id, secret])
        const trx = (await starknetWallet?.metadata?.starknetAccount?.execute(claimCall))

        if (!trx) {
            throw new Error("No result")
        }

        return trx.transaction_hash
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        const { id, chainId, contractAddress } = params
        try {

            const atomicContract = new Contract(
                {
                    abi: PHTLCAbi,
                    address: contractAddress,
                    providerOrAccount: new RpcProvider({
                        nodeUrl: nodeUrl,
                    }),
                }
            )

            const result = await atomicContract.functions.getHTLCDetails(id)

            if (!result) {
                throw new Error("No result")
            }

            // const networkToken = networks.find(network => chainId && Number(network.chainId) == Number(chainId))?.tokens.find(token => token.symbol === "ETH")//shortString.decodeShortString(ethers.utils.hexlify(result.srcAsset as BigNumberish)))

            const parsedResult: Commit = {
                ...result,
                sender: toHex(result.sender),
                amount: formatAmount(result.amount, 18), //networkToken?.decimals
                hashlock: result.hashlock && toHex(result.hashlock, { size: 32 }),
                claimed: Number(result.claimed),
                secret: BigInt(result.secret),
                timelock: Number(result.timelock),
            }

            return parsedResult
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
        }
    }


    const addLock = async (params: CommitmentParams & LockParams) => {
        const { id, hashlock, contractAddress } = params
        const timelock = calculateEpochTimelock(20)

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }
        const args = [
            id,
            hashlock,
            timelock
        ]
        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: contractAddress,
                providerOrAccount: starknetWallet.metadata?.starknetAccount,
            }
        )

        const committmentCall: Call = atomicContract.populate("addLock", args)

        const trx = (await starknetWallet?.metadata?.starknetAccount?.execute(committmentCall))
        return { hash: trx.transaction_hash as `0x${string}`, result: trx.transaction_hash as `0x${string}` }
    }

    const addLockSig = async (params: CommitmentParams & LockParams) => {
        const { id, hashlock, solver } = params;
        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }
        const timelock = calculateEpochTimelock(20);
        const u256Id = cairo.uint256(id);
        const u256Hashlock = cairo.uint256(hashlock);
        const u256TimeLock = cairo.uint256(timelock);

        const addlockData: TypedData = {
            domain: {
                name: 'Train',
                version: shortString.encodeShortString("v1"),
                chainId: process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? constants.StarknetChainId.SN_SEPOLIA : constants.StarknetChainId.SN_MAIN,
                revision: TypedDataRevision.ACTIVE,
            },
            message: {
                Id: u256Id,
                hashlock: u256Hashlock,
                timelock: u256TimeLock,
            },
            primaryType: 'AddLockMsg',
            types: {
                StarknetDomain: [
                    {
                        name: 'name',
                        type: 'shortstring',
                    },
                    {
                        name: 'version',
                        type: 'shortstring',
                    },
                    {
                        name: 'chainId',
                        type: 'shortstring',
                    },
                    {
                        name: 'revision',
                        type: 'shortstring'
                    }
                ],
                AddLockMsg: [
                    { name: 'Id', type: 'u256' },
                    { name: 'hashlock', type: 'u256' },
                    { name: 'timelock', type: 'u256' }
                ],
            }
        }
        const signature = await starknetWallet?.metadata?.starknetAccount.signMessage(addlockData)
        const apiClient = new LayerSwapApiClient()

        try {
            await apiClient.AddLockSig({
                signatureArray: signature,
                timelock,
            },
                id,
                solver
            )
        } catch (e) {
            throw new Error("Failed to add lock")
        }

        return { hash: signature as any, result: signature }

    }

    const getContracts = async (params: GetCommitsParams) => {
        const { contractAddress } = params

        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: contractAddress,
                providerOrAccount: new RpcProvider({
                    nodeUrl: nodeUrl,
                }),
            }
        )

        if (!starknetWallet?.address) {
            throw new Error('No connected wallet')
        }

        const result = await atomicContract.functions.getCommits(starknetWallet?.address)

        if (!result) {
            throw new Error("No result")
        }

        return result.reverse().map((commit: any) => toHex(commit, { size: 32 }))
    }

    const provider = {
        connectWallet,
        disconnectWallets,
        connectedWallets: starknetWallet ? [starknetWallet] : undefined,
        activeWallet: starknetWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        availableWalletsForConnect,
        name,
        id,
        providerIcon: networks.find(n => starknetNames.some(name => name === n.name))?.logo,

        createPreHTLC,
        claim,
        refund,
        getDetails,
        addLock: addLockSig,
        getContracts
    }

    return provider
}


const connectorsConfigs = [
    {
        id: "braavos",
        name: "Braavos",
        installLink: "https://chromewebstore.google.com/detail/braavos-starknet-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma"
    },
    {
        id: "argentX",
        name: 'Argent X',
        installLink: "https://chromewebstore.google.com/detail/argent-x-starknet-wallet/dlcobpjiigpikoobohmabehhmhfoodbb"
    },
    {
        id: "keplr",
        name: 'Keplr',
        installLink: "https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap"
    }
]
