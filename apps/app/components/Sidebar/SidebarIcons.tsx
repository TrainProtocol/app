import { FC } from "react"
import { Fingerprint } from "lucide-react"

const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
} as const

export const HomeIcon: FC = () => (
    <svg {...svgProps}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" style={{ transformBox: "view-box", transformOrigin: "9px 22px" }} className="transition-transform duration-300 ease-out group-hover/menu-button:scale-x-50" />
    </svg>
)
export const SettingsIcon: FC = () => (
    <svg {...svgProps} className="transition-transform duration-500 ease-out group-hover/menu-button:rotate-[45deg]">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

export const HistoryIcon: FC = () => (
    <svg {...svgProps}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" style={{ transformBox: "view-box", transformOrigin: "12px 12px" }} className="transition-transform duration-500 ease-out group-hover/menu-button:-rotate-[125deg]" />
    </svg>
)

export const DotsIcon: FC = () => (
    <svg {...svgProps}>
        <circle cx="5" cy="12" r="1" className="transition-transform duration-300 ease-out group-hover/menu-button:-translate-x-[2px]" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" className="transition-transform duration-300 ease-out group-hover/menu-button:translate-x-[2px]" />
    </svg>
)
export const FaucetIcon: FC = () => (
    <svg {...svgProps} className="overflow-visible">
        <g style={{ transformBox: "view-box", transformOrigin: "5px 19px" }} className="transition-transform duration-300 ease-out group-hover/menu-button:-rotate-[4deg]">
            <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
            <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
            <path d="m2 16 6 6" />
        </g>
        <circle cx="16" cy="9" r="2.9" style={{ transformBox: "fill-box", transformOrigin: "center" }} className="transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover/menu-button:-translate-y-[3px] group-hover/menu-button:scale-110" />
        <circle cx="6" cy="5" r="3" className="transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover/menu-button:delay-200 group-hover/menu-button:-translate-y-[2.5px]" />
    </svg>
)

export const LockIcon: FC<{ className?: string }> = ({ className }) => (
    <svg {...svgProps} className={className}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" className="transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover/menu-button:-translate-y-px" />
    </svg>
)

export const ScanFingerprintIcon: FC<{ className?: string }> = ({ className }) => (
    <span className="relative inline-flex">
        <Fingerprint strokeWidth={2} className={`${className ?? ""} text-secondary-text`} />
        <Fingerprint strokeWidth={2} aria-hidden className={`${className ?? ""} absolute left-0 top-0 text-primary-text [clip-path:inset(100%_0_0_0)] transition-[clip-path] duration-[600ms] ease-out group-hover/menu-button:[clip-path:inset(0%_0_0_0)]`} />
    </span>
)
