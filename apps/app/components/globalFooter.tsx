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
        <footer className="hidden md:flex py-4 justify-between items-center w-full px-4 lg:px-8 mt-auto">
            <div>
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
