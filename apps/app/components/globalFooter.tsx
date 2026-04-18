import Link from "next/link";
import TwitterLogo from "./Icons/TwitterLogo";
import GitHubLogo from "./Icons/GitHubLogo";
import { BookOpen } from "lucide-react";

const GLobalFooter = () => {

    const footerNavigation = {
        social: [
            {
                name: 'Twitter',
                href: 'https://x.com/trainprotocol',
                icon: () => (
                    <TwitterLogo className="h-6 w-6" aria-hidden="true" />
                ),
            },
            {
                name: 'GitHub',
                href: 'https://github.com/TrainProtocol/app',
                icon: () => (
                    <GitHubLogo className="h-6 w-6" aria-hidden="true" />
                ),
            },
            {
                name: 'Docs',
                href: 'https://docs.train.tech/protocol/introduction',
                icon: () => (
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                ),
            },
        ],
    }

    return (
        <footer className="z-30 hidden md:flex fixed bottom-0 left-[var(--sidebar-width)] py-4 justify-between items-center w-[calc(100%-var(--sidebar-width))] px-4 lg:px-8 mt-auto">
            <div>
                <div className="flex gap-6">
                    <Link target="_blank" href="https://docs.layerswap.io/user-docs/information/privacy-policy/" className="text-xs leading-6 text-primary-text-tertiary underline hover:no-underline hover:text-primary-text-tertiary/70 duration-200 transition-all">
                        Privacy Policy
                    </Link>
                    <Link target="_blank" href="https://docs.layerswap.io/user-docs/information/terms-of-services/" className="text-xs leading-6 text-primary-text-tertiary underline hover:no-underline hover:text-primary-text-tertiary/70 duration-200 transition-all">
                        Terms of Services
                    </Link>
                </div>
                <p className="text-center text-xs text-primary-text-tertiary leading-6">
                    &copy; {new Date().getFullYear()} Layerswap Labs, Inc. All rights reserved.
                </p>
            </div>
            <div className="flex space-x-6">
                {footerNavigation.social.map((item) => (
                    <Link target="_blank" key={item.name} href={item.href} className="text-secondary-text hover:text-primary-text">
                        <span className="sr-only">{item.name}</span>
                        <item.icon />
                    </Link>
                ))}
            </div>
        </footer>

    )
}

export default GLobalFooter
