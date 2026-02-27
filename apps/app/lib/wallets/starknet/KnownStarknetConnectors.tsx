import Argent from "@/apps/app/components/Icons/Wallets/Argent"
import ArgentX from "@/apps/app/components/Icons/Wallets/ArgentX"
import Braavos from "@/apps/app/components/Icons/Wallets/Braavos"
import Controller from "@/apps/app/components/Icons/Wallets/Controller"
import Keplr from "@/apps/app/components/Icons/Wallets/Keplr"
import Xverse from "@/apps/app/components/Icons/Wallets/Xverse"

const KnownStarknetConnectors = [
    {
        id: 'ready wallet (formerly argent)',
        icon: ArgentX
    },
    {
        id: 'ready (formerly argent)',
        icon: Argent
    },
    {
        id: 'braavos',
        icon: Braavos
    },
    {
        id: 'keplr',
        icon: Keplr
    },
    {
        id: 'xverse wallet',
        icon: Xverse
    },
    {
        id: 'cartridge controller',
        icon: Controller
    }
]

export default KnownStarknetConnectors