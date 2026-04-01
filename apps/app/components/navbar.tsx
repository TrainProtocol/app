import React from 'react'
import GoHomeButton from './utils/GoHome';
import Link from 'next/link';
import { JetBrains_Mono } from "next/font/google";
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import NavbarActions from './Sidebar/NavbarActions';

const jetBrainsMono = JetBrains_Mono({
    variable: "--font-jb-mono",
    subsets: ["latin"],
    weight: "400",
})

export default function Navbar() {
    const isTestnet = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox'
    const navigation = [
        { name: 'app', href: '/', current: true },
        { name: 'home', href: 'https://www.train.tech/', current: false, target: '_blank' },
        { name: isTestnet ? 'mainnet' : 'testnet', href: isTestnet ? 'https://app.train.tech/' : 'https://testnet.train.tech/', current: false, target: '_blank' },
        { name: 'docs', href: 'https://v8-docs.layerswap.io/protocol/introduction', current: false, target: '_blank' }
    ]

    return (
        <div className='mt-5 mb-8  pl-8 pr-9 hidden md:block relative z-20 w-full'>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-8">
                    <GoHomeButton className='h-auto w-36 text-primary-logoColor fill-primary-text cursor-pointer headerLogo' />
                    <div className='flex space-x-5 text-primary-text'>
                        {
                            navigation.map((item, index) => {
                                return (
                                    <Link
                                        href={item.href}
                                        key={index}
                                        target={item.target || '_self'}
                                        className={clsx(`hover:opacity-80 transition-opacity duration-300 ${jetBrainsMono.className}`, {
                                            'text-primary underline underline-offset-[3px] decoration-primary': item.current,
                                        })}
                                    >
                                        {item.name}
                                        {
                                            item.target === '_blank' &&
                                            <ArrowUpRight className='h-4 w-4 inline-flex ml-0.5' />
                                        }
                                    </Link>
                                )
                            })
                        }
                    </div>
                </div>
                <NavbarActions />
            </div>
        </div>
    )
}