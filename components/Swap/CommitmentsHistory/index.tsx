import { useRouter } from "next/router"
import { FC, ReactNode, useCallback, useEffect, useState } from "react"
import { ArrowRight, ChevronRight, Scroll } from 'lucide-react';
import { Commit } from "../../../Models/PHTLC";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import HeaderWithMenu from "../../HeaderWithMenu";
import { classNames } from "../../utils/classNames";
import { useSettingsState } from "../../../context/settings";
import useWallet from "../../../hooks/useWallet";
import { SwapHistoryComponentSceleton } from "../../Sceletons";
import Image from 'next/image'
import Modal from "../../Modal/modal";
import CommitDetails from "./CommitDetailsComponent";
import ConnectButton from "../../buttons/connectButton";
import WalletIcon from "../../Icons/WalletIcon";
import StatusIcon from "./StatusIcons";
import AppSettings from "../../../lib/AppSettings";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { Wallet } from "../../../Models/WalletProvider";
import LayerSwapApiClient, { CommitFromApi } from "../../../lib/layerSwapApiClient";
import { ContractType } from "../../../Models/Network";

type CommitStatus = 'committed' | 'user_locked' | 'lp_locked' | 'completed' | 'refunded' | 'timelock_expired'

const commitStatusResolver = (commit: Commit, destination_details: Commit | undefined | null): CommitStatus => {

    if (destination_details?.claimed == 3 || commit?.claimed == 3) return 'completed'
    //TODO check&implement source lock refund
    else if (commit.claimed == 2) return 'refunded'
    else if (commit.timelock && Number(commit.timelock) * 1000 < Date.now()) return 'timelock_expired'
    else if (commit.hashlock) return 'user_locked'
    else if (destination_details) return 'lp_locked'

    return 'committed'
}

export type HistoryCommit = Commit & { id: string, status: CommitStatus } & CommitFromApi

function CommittmentsHistory() {
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [selectedCommit, setSelectedCommit] = useState<HistoryCommit | undefined>()
    const [page, setPage] = useState(0)
    const [isLastPage, setIsLastPage] = useState(false)
    const [loading, setLoading] = useState(false)
    const [allCommitsFromApi, setAllCommitsFromApi] = useState<CommitFromApi[] | undefined>(undefined)
    const [allCommitments, setAllCommitments] = useState<HistoryCommit[] | undefined>(undefined)

    const layerswapApiCliet = new LayerSwapApiClient()

    const router = useRouter();
    const { wallets, getProvider } = useWallet()

    const providers = wallets.filter(wallet => wallet.providerName.toLowerCase() !== 'solana' && wallet.providerName.toLowerCase() !== 'ton')
    const { networks } = useSettingsState()

    const PAGE_SIZE = 5

    const getCommitments = async (commitsFromApi: CommitFromApi[]) => {
        let commits: (HistoryCommit)[] = []

        for (let i = 0; i < commitsFromApi.length; i++) {

            const commitFromApi = commitsFromApi[i]
            const source_network = networks.find(network => network.name === commitFromApi.source_network)
            const source_asset = source_network?.tokens.find(token => token.symbol === commitFromApi.source_asset)
            const sourceAtomicContract = source_network?.contracts.find(contract => contract.type === (source_asset?.contract ? ContractType.HTLCTokenContractAddress : ContractType.HTLCNativeContractAddress))?.address

            const source_provider = source_network && getProvider(source_network, 'withdrawal')

            const sourceDetails = commitFromApi && source_network && await source_provider?.getDetails({
                id: commitFromApi.commit_id,
                chainId: source_network?.chain_id,
                contractAddress: sourceAtomicContract as `0x${string}`,
                type: source_asset?.contract ? 'erc20' : 'native'
            })

            const destination_network = networks.find(network => network.name === commitFromApi.destination_network)
            const destination_asset = destination_network?.tokens.find(token => token.symbol === commitFromApi.destination_asset)
            const destinationAtomicContract = destination_network?.contracts.find(contract => contract.type === (destination_asset?.contract ? ContractType.HTLCTokenContractAddress : ContractType.HTLCNativeContractAddress))?.address
            const destination_provider = destination_network && getProvider(destination_network, 'autofil')
            const destinationType = destination_asset?.contract ? 'erc20' : 'native'

            let destinationDetails: Commit | undefined | null = undefined

            if (destination_network && destination_provider && destination_network.chain_id && destination_asset) {

                try {

                    destinationDetails = await destination_provider.getDetails({
                        type: destinationType,
                        id: commitFromApi.commit_id,
                        chainId: destination_network.chain_id,
                        contractAddress: destinationAtomicContract as `0x${string}`
                    })

                } catch (e) {
                    console.log(e)
                }
            }

            if (sourceDetails) {
                const status = commitStatusResolver(sourceDetails, destinationDetails)
                commits.push({
                    ...sourceDetails,
                    status,
                    id: commitFromApi.commit_id,
                    ...commitFromApi
                })
            }
        }

        return commits
    }

    const handleOpenCommitDetails = (commit: HistoryCommit) => {
        setSelectedCommit(commit)
        setOpenSwapDetailsModal(true)
    }
    console.log
    useEffect(() => {
        (async () => {
            if (providers.length === 0) return
            setPage(0)
            setIsLastPage(false)
            setLoading(true)

            const commitsRes = (await layerswapApiCliet.GetSwapsAsync(providers.map(wallet => wallet.address))).data
            // if (commitsRes) setAllCommitsFromApi(commitsRes)

            const commits = commitsRes && await getCommitments(commitsRes) || []
            setAllCommitments(commits)

            setPage(1)
            // if ((commIds ? (Number(commIds?.length) <= PAGE_SIZE) : true) && (erc20CommIds ? (Number(erc20CommIds?.length) <= PAGE_SIZE) : true)) setIsLastPage(true)
            setLoading(false)
        })()
    }, [providers.length])

    // const handleLoadMore = useCallback(async () => {
    //     if (!selectedProvider) return null
    //     setLoading(true)

    //     const commits = commitIds && activeNetwork?.metadata.htlc_native_contract && await getCommitments(page, commitIds, activeNetwork?.metadata.htlc_native_contract, 'native') || []

    //     setAllCommitments(allCommits => ({ ...allCommits, [selectedProvider]: [...(allCommits?.[selectedProvider] || []), ...commits, ...erc20Commits] }))

    //     const nextPage = page + 1
    //     setPage(nextPage)
    //     if (commitIds ? (Number(commitIds?.length) <= PAGE_SIZE * nextPage) : true) setIsLastPage(true)
    //     setLoading(false)
    // }, [page, setAllCommitments, commitIds])


    if (providers.length === 0) return <HistoryWrapper>
        <div className="absolute top-1/4 right-0 text-center w-full px-6">
            <Scroll className='h-40 w-40 text-secondary-700 mx-auto' />
            <p className="my-2 text-xl">It&apos;s empty here</p>
            <p className="px-14 text-primary-text">Connect wallet to inspect your history</p>
            <ConnectButton className="w-full mt-3">
                <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-componentRoundness transform hover:brightness-125 transition duration-200 ease-in-out bg-primary py-3 md:px-3 bg-primary/20 border-none text-primary px-4">
                    <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                        <WalletIcon className='stroke-2 w-6 h-6' strokeWidth={2} />
                    </span>
                    <span className="grow text-center">Connect a wallet</span>
                </div>
            </ConnectButton>
        </div>
    </HistoryWrapper>

    return (
        <>
            <HistoryWrapper>
                {/* <WalletSelector wallets={providers} selectedWallet={selectedProvider} setSelectedWallet={setSelectedProvider} /> */}
                {
                    page == 0 && loading ?
                        <SwapHistoryComponentSceleton />
                        : <>
                            {
                                Number(allCommitments?.length) > 0 ?
                                    <div className="w-full flex flex-col justify-between h-full space-y-5 text-secondary-text">
                                        <div className="mt-4">
                                            <div className=" sm:max-h-[450px] styled-scroll overflow-y-auto ">
                                                <table className="w-full divide-y divide-secondary-500">
                                                    <thead className="text-secondary-text">
                                                        <tr>
                                                            <th scope="col" className="text-left text-sm font-semibold">
                                                                <div className="block">
                                                                    Swap details
                                                                </div>
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-3 py-3.5 text-left text-sm font-semibold  "
                                                            >
                                                                Status
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-3 py-3.5 text-left text-sm font-semibold  "
                                                            >
                                                                Amount
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {allCommitments?.map((commit, index) => {
                                                            const {
                                                                amount,
                                                                source_network: srcChain,
                                                                source_asset: srcAsset,
                                                                destination_network: dstChain
                                                            } = commit

                                                            const source_network = networks.find(network => network.name === srcChain)
                                                            const destination_network = networks.find(network => network.name === dstChain)
                                                            const source_token = source_network?.tokens.find(token => token.symbol === srcAsset)

                                                            return <tr onClick={() => handleOpenCommitDetails(commit)} key={index}>

                                                                <td
                                                                    className={classNames(
                                                                        index === 0 ? '' : 'border-t border-secondary-500',
                                                                        'relative text-sm text-primary-text table-cell'
                                                                    )}
                                                                >
                                                                    <div className="text-primary-text flex items-center">
                                                                        <div className="flex-shrink-0 h-5 w-5 relative">
                                                                            {source_network &&
                                                                                <Image
                                                                                    src={source_network.logo}
                                                                                    alt="Source Logo"
                                                                                    height="60"
                                                                                    width="60"
                                                                                    className="rounded-md object-contain"
                                                                                />
                                                                            }
                                                                        </div>
                                                                        <ArrowRight className="h-4 w-4 mx-2" />
                                                                        <div className="flex-shrink-0 h-5 w-5 relative block">
                                                                            {destination_network &&
                                                                                <Image
                                                                                    src={destination_network.logo}
                                                                                    alt="Destination Logo"
                                                                                    height="60"
                                                                                    width="60"
                                                                                    className="rounded-md object-contain"
                                                                                />
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                    {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-secondary-500" /> : null}

                                                                </td>
                                                                <td className={classNames(
                                                                    index === 0 ? '' : 'border-t border-secondary-500',
                                                                    'relative text-sm table-cell'
                                                                )}>
                                                                    <span className="flex items-center">
                                                                        {commit && <StatusIcon commit={commit} />}
                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className={classNames(
                                                                        index === 0 ? '' : 'border-t border-secondary-500',
                                                                        'px-3 py-3.5 text-sm text-primary-text table-cell'
                                                                    )}
                                                                >
                                                                    <div className="flex justify-between items-center cursor-pointer">
                                                                        <div>
                                                                            <div className="text text-secondary-text text-left">
                                                                                <span>
                                                                                    {truncateDecimals(amount, source_token?.precision)}
                                                                                </span>
                                                                                <span className="ml-1">{source_token?.symbol}</span>
                                                                            </div>
                                                                        </div>
                                                                        <ChevronRight className="h-5 w-5" />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        {/* <div className="text-primary-text text-sm flex justify-center">
                                            {
                                                !isLastPage &&
                                                <button
                                                    disabled={isLastPage || loading}
                                                    type="button"
                                                    onClick={handleLoadMore}
                                                    className="group disabled:text-primary-800 mb-2 text-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
                                                >
                                                    <span className="flex items-center mr-2">
                                                        {(!isLastPage && !loading) &&
                                                            <RefreshCcw className="h-5 w-5" />}
                                                        {loading ?
                                                            <SpinIcon className="animate-spin h-5 w-5" />
                                                            : null}
                                                    </span>
                                                    <span>Load more</span>
                                                </button>
                                            }
                                        </div> */}

                                    </div>
                                    :
                                    <div className="absolute top-1/4 right-0 text-center w-full">
                                        <Scroll className='h-40 w-40 text-secondary-700 mx-auto' />
                                        <p className="my-2 text-xl">It&apos;s empty here</p>
                                        <p className="px-14 text-primary-text">Please select the network in your wallet where you initiated the transfer.</p>
                                    </div>
                            }
                            <Modal height="fit" show={openSwapDetailsModal} setShow={setOpenSwapDetailsModal} header="Swap details" modalId="swapHistory">
                                <div className="mt-2">
                                    {
                                        selectedCommit &&
                                        <CommitDetails commit={selectedCommit} />
                                    }
                                </div>
                            </Modal>
                        </>
                }
            </HistoryWrapper>
        </>

    )
}

type WallectSelectorProps = {
    wallets: Wallet[]
    selectedWallet: string | undefined
    setSelectedWallet: (wallet: string) => void
}

// const WalletSelector: FC<WallectSelectorProps> = ({ wallets, selectedWallet, setSelectedWallet }) => {
//     const [showModal, setShowModal] = useState(false)

//     return <Popover open={showModal} onOpenChange={setShowModal}>
//         <PopoverTrigger className="font-semibold text-secondary-text text-xs flex items-center space-x-1">
//             <span> Transfered via </span> <span>{selectedWallet}</span> <div>
//                 <ChevronDown className=" w-4 h-4 " />
//             </div>
//         </PopoverTrigger>
//         <PopoverContent className=' ml-2 mt-1 text-sm p-2 max-w border-none rounded-xl bg-secondary-600 max-w-72 md:max-w-96' align="start">
//             <div>
//                 {
//                     wallets.map(wallet => <div key={wallet.address} className={classNames("flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-secondary-700", selectedWallet === wallet.connector && 'bg-secondary-700')} onClick={() => {
//                         wallet.connector && setSelectedWallet(wallet.connector)
//                         setShowModal(false)
//                     }}>
//                         <wallet.icon className="w-6 h-6" />
//                         <span>{shortenAddress(wallet.address)}</span>

//                     </div>)
//                 }
//             </div>
//         </PopoverContent>
//     </Popover>
// }

const HistoryWrapper: FC<{ children: ReactNode }> = ({ children }) => {
    const router = useRouter()

    const goBack = useCallback(() => {
        window?.['navigation']?.['canGoBack'] ?
            router.back()
            : router.push({
                pathname: "/",
                query: resolvePersistantQueryParams(router.query)
            })
    }, [router])

    return (
        <div className={`bg-secondary-900 sm:shadow-card rounded-containerRoundness mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px] ${AppSettings.ApiVersion === 'sandbox' && 'border-t-[2px] border-[#D95E1B]'}`}>
            {
                AppSettings.ApiVersion === 'sandbox' &&
                <div className="absolute -top-1 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                    TESTNET
                </div>
            }
            <HeaderWithMenu goBack={goBack} />
            <div className="px-6 mt-3">
                {children}
            </div>
            <div id="widget_root" />
        </div>
    )
}

export default CommittmentsHistory;