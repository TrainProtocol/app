import { FC, useEffect, useRef, useState } from "react"

const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
} as const

function useRowHoverPhase() {
    const ref = useRef<SVGSVGElement>(null)
    const [state, set] = useState<{ phase: "in" | "out" | null; animKey: number }>({ phase: null, animKey: 0 })
    useEffect(() => {
        const row = ref.current?.closest('[data-sidebar="menu-button"]')
        if (!row) return
        let timer: ReturnType<typeof setTimeout> | undefined
        const enter = () => { timer = setTimeout(() => set(s => ({ phase: "in", animKey: s.animKey + 1 })), 150) }
        const leave = () => {
            clearTimeout(timer)
            set(s => (s.phase === "in" ? { phase: "out", animKey: s.animKey + 1 } : s))
        }
        row.addEventListener("mouseenter", enter)
        row.addEventListener("mouseleave", leave)
        return () => {
            clearTimeout(timer)
            row.removeEventListener("mouseenter", enter)
            row.removeEventListener("mouseleave", leave)
        }
    }, [])
    return { ref, ...state }
}

export const HomeIcon: FC = () => (
    <svg {...svgProps}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" style={{ transformBox: "view-box", transformOrigin: "9px 22px" }} className="transition-transform duration-300 ease-out group-hover/menu-button:delay-150 group-hover/menu-button:scale-x-50" />
    </svg>
)
export const SettingsIcon: FC = () => (
    <svg {...svgProps} className="transition-transform duration-500 ease-out group-hover/menu-button:delay-150 group-hover/menu-button:rotate-90">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

export const HistoryIcon: FC = () => (
    <svg {...svgProps}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" style={{ transformBox: "view-box", transformOrigin: "12px 12px" }} className="transition-transform duration-500 ease-out group-hover/menu-button:delay-150 group-hover/menu-button:-rotate-[125deg]" />
    </svg>
)

const WAVE_LEAD = "animate-icon-wave"
const WAVE_MID = "[animation:icon-wave_0.5s_ease-in-out_0.1s]"
const WAVE_TAIL = "[animation:icon-wave_0.5s_ease-in-out_0.2s]"

export const DotsIcon: FC = () => {
    const { ref, phase, animKey } = useRowHoverPhase()
    const left = phase === "in" ? WAVE_LEAD : phase === "out" ? WAVE_TAIL : undefined
    const center = phase ? WAVE_MID : undefined
    const right = phase === "in" ? WAVE_TAIL : phase === "out" ? WAVE_LEAD : undefined
    return (
        <svg key={animKey} ref={ref} {...svgProps}>
            <circle className={left} cx="5" cy="12" r="1" />
            <circle className={center} cx="12" cy="12" r="1" />
            <circle className={right} cx="19" cy="12" r="1" />
        </svg>
    )
}
export const FaucetIcon: FC = () => {
    const { ref, phase } = useRowHoverPhase()
    const drop = phase === "in" ? "animate-icon-drop" : phase === "out" ? "animate-icon-drop-out" : ""
    return (
        <svg ref={ref} {...svgProps} className={`origin-bottom ${drop}`}>
            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        </svg>
    )
}
