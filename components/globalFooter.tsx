import Link from "next/link";
import TwitterLogo from "./Icons/TwitterLogo";
import GitHubLogo from "./Icons/GitHubLogo";
import { BookOpen } from "lucide-react";

const GLobalFooter = () => {

    const footerNavigation = {
        main: [
            { name: 'Product', href: '/' },
            { name: 'Company', href: '/company' },
            { name: 'FAQ', href: '/faq' },
            { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/more-information/privacy-policy' },
            { name: 'Terms of Services', href: 'https://docs.layerswap.io/user-docs/more-information/terms-of-services' },
            { name: 'Docs', href: 'https://docs.layerswap.io/onboarding-sdk' },
        ],
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
        <footer className="z-30 hidden md:flex fixed bottom-0 py-4 justify-between items-center w-full px-6 lg:px-8 mt-auto">
            <div>
                <p className="text-center text-xs text-primary-text-muted leading-6">
                    &copy; {new Date().getFullYear()} Layerswap Labs, Inc. All rights reserved.
                </p>
            </div>
            <div className="flex space-x-6">
                {footerNavigation.social.map((item) => (
                    <Link target="_blank" key={item.name} href={item.href} className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">{item.name}</span>
                        <item.icon />
                    </Link>
                ))}
            </div>
        </footer>

    )
}

export default GLobalFooter
