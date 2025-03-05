import React from 'react'
import GoHomeButton from './utils/GoHome';
import Link from 'next/link';
import { JetBrains_Mono } from "next/font/google";
import clsx from 'clsx';

const jetBrainsMono = JetBrains_Mono({
    variable: "--font-jb-mono",
    subsets: ["latin"],
    weight: "400",
})

export default function Navbar() {

    const navigation = [
        { name: 'app', href: '/', current: true },
        { name: 'home', href: 'https://www.train.tech/', current: false, target: '_blank' },
    ]

    return (
        <div className='mt-5 mb-8  px-8 overflow-hidden hidden md:block relative z-20 w-full'>
            <div className="flex items-center justify-between w-full">
                <GoHomeButton className='h-auto w-48 text-primary-logoColor fill-primary-text cursor-pointer headerLogo' />
                <div className='flex space-x-5 text-primary-text'>
                    {
                        navigation.map((item, index) => {
                            return (
                                <Link
                                    href={item.href}
                                    key={index}
                                    target={item.target || '_self'}
                                    className={clsx(`hover:opacity-80 transition-opacity duration-300 ${jetBrainsMono.className}`, {
                                        'text-accent underline underline-offset-[3px] decoration-accent': item.current,
                                    })}
                                >
                                    {item.name}
                                </Link>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}