import { BookOpen, Home, Settings2, RotateCcw, ScrollText, Sun, Moon, Monitor, Circle, HandCoins } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { FC } from "react";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "@/components/Icons/ChatIcon";
import GitHubLogo from "@/components/Icons/GitHubLogo";
import TwitterLogo from "@/components/Icons/TwitterLogo";
import Link from "next/link";
import Menu from "./Menu";
import dynamic from "next/dynamic";
import { MenuStep } from "@/Models/Wizard";
import { Separator } from "@/components/shadcn/separator";
import { UserStatusMenu } from "../SecretDerivation";
import AppSettings from "@/lib/AppSettings";

const WalletsMenu = dynamic(() => import("../Wallet/ConnectedWallets").then((comp) => comp.WalletsMenu), {
    loading: () => <></>
})

const MenuList: FC<{ goToStep: (step: MenuStep, path?: string) => void }> = ({ goToStep }) => {
    const pathname = usePathname();
    const { boot, show, update } = useIntercom()
    const { theme, setTheme } = useTheme()

    return <div className="text-sm font-medium focus:outline-none h-full">
        <Menu>

            <UserStatusMenu />
            <WalletsMenu />


            <Menu.Group>
                <>
                    {
                        pathname != '/' &&
                        <Menu.Item pathname='/' icon={<Home className="h-5 w-5" />} >
                            Home
                        </Menu.Item>
                    }

                    <Menu.Item onClick={() => goToStep(MenuStep.RPCConfiguration)} icon={<Settings2 className="h-5 w-5" />} >
                        RPC Configuration
                    </Menu.Item>

                    <Menu.Item onClick={() => goToStep(MenuStep.RecoverSwap)} icon={<RotateCcw className="h-5 w-5" />} >
                        Recover Swap
                    </Menu.Item>

                    <Menu.Item onClick={() => goToStep(MenuStep.Transactions)} icon={<ScrollText className="h-5 w-5" />} >
                        Transactions
                    </Menu.Item>

                    {AppSettings.ApiVersion === 'sandbox' && (
                        <Menu.Item pathname='/faucet' icon={<HandCoins className="h-5 w-5" />} >
                            Faucet
                        </Menu.Item>
                    )}

                    <Menu.SelectorItem
                        label="Theme"
                        icon={<Sun className="h-5 w-5" />}
                        value={theme ?? "system"}
                        onValueChange={setTheme}
                        options={[
                            { value: "system", icon: Monitor, label: "System" },
                            { value: "light", icon: Sun, label: "Light" },
                            { value: "default", icon: Moon, label: "Dark" },
                            { value: "mist", icon: Circle, label: "Mist" },
                        ]}
                    />

                </>
            </Menu.Group>
            <Menu.Group>
                <Menu.Item onClick={() => {
                    boot();
                    show();
                    update();
                }} target="_blank" icon={<ChatIcon strokeWidth={2} className="h-5 w-5" />} >
                    Help
                </Menu.Item>

                <Menu.Item pathname='https://v8-docs.layerswap.io/protocol/introduction' target="_blank" icon={<BookOpen className="h-5 w-5" />} >
                    Protocol Docs
                </Menu.Item>
            </Menu.Group>

            <div className="space-y-3 w-full">
                <Separator className="bg-secondary-500" />
                <p className="text-primary-text-tertiary flex justify-center my-3">Media links & suggestions:</p>
            </div>

            <div className="grid grid-cols-2 gap-2 justify-center">
                {navigation.social.map((item, index) => (
                    <Link key={index} target="_blank" href={item.href} className={`flex relative bg-secondary-500 hover:bg-secondary-400 rounded-md cursor-pointer select-none items-center outline-none text-primary-text`}>
                        <div className="p-2 w-full flex justify-center gap-1">
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                            <p>{item.name}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </Menu>
    </div>
}

const navigation = {
    social: [
        {
            name: 'Twitter',
            href: 'https://x.com/trainprotocol',
            icon: (props) => TwitterLogo(props),
        },
        {
            name: 'GitHub',
            href: 'https://github.com/TrainProtocol/app',
            icon: (props) => GitHubLogo(props),
        },
    ]
}

export default MenuList