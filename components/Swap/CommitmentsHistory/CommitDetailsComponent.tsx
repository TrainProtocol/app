import { FC } from 'react'
import Image from 'next/image'
import CopyButton from '../../buttons/copyButton';
import shortenAddress from '../../utils/ShortenAddress';
import { useSettingsState } from '../../../context/settings';
import SubmitButton from '../../buttons/submitButton';
import { useRouter } from 'next/router';
import { Eye } from 'lucide-react';
import StatusIcon from './StatusIcons';
import { HistoryCommit } from '.';
import { truncateDecimals } from '../../utils/RoundDecimals';

type Props = {
    commit: HistoryCommit,
}

const CommitDetails: FC<Props> = ({ commit }) => {
    const router = useRouter()
    const { networks } = useSettingsState()

    const {
        amount,
        id,
        destinationAddress: destination_address,
        sourceNetwork: srcNetwork,
        destinationNetwork: dstNetwork,
    } = commit

    const source_network = networks.find(n => n.name === srcNetwork)
    const destination_network = networks.find(n => n.name === dstNetwork)
    const source_asset = source_network?.tokens.find(t => t.symbol === 'srcAsset')
    const destination_asset = destination_network?.tokens.find(t => t.symbol === 'dstAsset')

    return (
        <>
            <div className="w-full grid grid-flow-row animate-fade-in">
                <div className="rounded-md w-full grid grid-flow-row">
                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-secondary-text">
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Id </span>
                            <span className="text-primary-text">
                                <div className='inline-flex items-center'>
                                    <CopyButton toCopy={id} iconClassName="text-gray-500">
                                        {shortenAddress(id)}
                                    </CopyButton>
                                </div>
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Status </span>
                            <span className="text-primary-text">
                                {commit && <StatusIcon commit={commit} />}
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Timelock </span>
                            <span className='text-primary-text font-normal'>{(new Date(Number(commit.timelock) * 1000)).toLocaleString()}</span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">From  </span>
                            {
                                source_network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            <Image
                                                src={source_network.logo}
                                                alt="From Network Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }

                                    </div>
                                    <div className="mx-1 text-primary-text">{source_network?.displayName}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">To </span>
                            {
                                destination_network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            <Image
                                                src={destination_network.logo}
                                                alt="To Network Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }
                                    </div>
                                    <div className="mx-1 text-primary-text">{destination_network.displayName}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Address </span>
                            <span className="text-primary-text">
                                <div className='inline-flex items-center'>
                                    <CopyButton toCopy={destination_address} iconClassName="text-gray-500">
                                        {shortenAddress(destination_address)}
                                    </CopyButton>
                                </div>
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Committed amount</span>
                            <span className='text-primary-text font-normal flex'>
                                {source_asset && truncateDecimals(amount, source_asset?.precision)} {source_asset?.symbol}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-primary-text text-sm mt-6 space-y-3">
                <div className="flex flex-row text-primary-text text-base space-x-2">
                    <SubmitButton
                        text_align="center"
                        onClick={() => router.push({
                            pathname: `/swap`,
                            query: {
                                amount: source_asset && truncateDecimals(amount, source_asset?.precision),
                                address: destination_address,
                                source: source_network?.name,
                                destination: destination_network?.name,
                                source_asset: source_asset?.symbol,
                                destination_asset: destination_asset?.symbol,
                                commitId: id
                            }
                        }, undefined, { shallow: false })}
                        icon={
                            <Eye className='h-5 w-5' />
                        }
                    >
                        View swap
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default CommitDetails;