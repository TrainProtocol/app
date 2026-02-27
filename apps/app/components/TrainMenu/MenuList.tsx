import { BookOpen, Home, LibraryIcon, Shield, MessageSquarePlus, CircleHelp, Info, Settings2, Zap, RotateCcw, ScrollText } from "lucide-react";
import { useSwapPreferencesStore } from "@/apps/app/stores/swapPreferencesStore";
import { useRouter } from "next/router";
import { FC, useEffect, useState } from "react";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "@/apps/app/components/Icons/ChatIcon";
import inIframe from "@/apps/app/components/utils/inIframe";
import GitHubLogo from "@/apps/app/components/Icons/GitHubLogo";
import TwitterLogo from "@/apps/app/components/Icons/TwitterLogo";
import Link from "next/link";
import Popover from "@/apps/app/components/Modal/popover";
import SendFeedback from "@/apps/app/components/sendFeedback";
import Menu from "./Menu";
import dynamic from "next/dynamic";
import { MenuStep } from "@/apps/app/Models/Wizard";
import useWindowDimensions from "@/apps/app/hooks/useWindowDimensions";
import { UserStatusMenu } from "../SecretDerivation";

const WalletsMenu = dynamic(() => import("../Wallet/ConnectedWallets").then((comp) => comp.WalletsMenu), {
    loading: () => <></>
})

const MenuList: FC<{ goToStep: (step: MenuStep, path?: string) => void }> = ({ goToStep }) => {
    const router = useRouter();
    const { boot, show, update } = useIntercom()
    const [embedded, setEmbedded] = useState<boolean>()
    const [openFeedbackModal, setOpenFeedbackModal] = useState(false);
    const { isMobile } = useWindowDimensions()
    const { autoRevealSecret, setAutoRevealSecret } = useSwapPreferencesStore()

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    const handleCloseFeedback = () => {
        setOpenFeedbackModal(false)
    }
    return <div className="text-sm font-medium focus:outline-none h-full">
        <Menu>

            <UserStatusMenu />
            <WalletsMenu />


            <Menu.Group>
                <>
                    {
                        router.pathname != '/' &&
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

                    <Menu.ToggleItem
                        icon={<Zap className="h-5 w-5" />}
                        checked={autoRevealSecret}
                        onChange={setAutoRevealSecret}
                    >
                        Auto Reveal Secret
                    </Menu.ToggleItem>

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

                {
                    isMobile
                        ? <>
                            <Menu.Item pathname='https://v8-docs.layerswap.io/protocol/introduction' target="_blank" icon={<CircleHelp className="h-5 w-5" />} >
                                How
                            </Menu.Item>
                            <Menu.Item pathname='https://v8-docs.layerswap.io/protocol/introduction' target="_blank" icon={<Info className="h-5 w-5" />} >
                                About
                            </Menu.Item>
                        </>
                        : <></>
                }

                <Menu.Item pathname='https://v8-docs.layerswap.io/protocol/introduction' target="_blank" icon={<BookOpen className="h-5 w-5" />} >
                    Protocol Docs
                </Menu.Item>
            </Menu.Group>

            <Menu.Group>
                <Menu.Item pathname='https://docs.layerswap.io/user-docs/information/privacy-policy/' target="_blank" icon={<Shield className="h-5 w-5" />} >
                    Privacy Policy
                </Menu.Item>
                <Menu.Item pathname='https://docs.layerswap.io/user-docs/information/terms-of-services/' target="_blank" icon={<LibraryIcon className="h-5 w-5" />} >
                    Terms of Service
                </Menu.Item>
            </Menu.Group>


            <Menu.Group>
                <Popover
                    opener={
                        <Menu.Item onClick={() => setOpenFeedbackModal(true)} target="_blank" icon={<MessageSquarePlus className="h-5 w-5" />} >
                            Suggest a Feature
                        </Menu.Item>
                    }
                    isNested={true}
                    show={openFeedbackModal}
                    header="Suggest a Feature"
                    setShow={setOpenFeedbackModal}
                    popoverId={"feedback"}
                >
                    <div className="p-0 md:max-w-md">
                        <SendFeedback onSend={handleCloseFeedback} />
                    </div>
                </Popover>
            </Menu.Group>

            <div className="space-y-3 w-full">
                <hr className="border-secondary-500" />
                <p className="text-primary-text-tertiary flex justify-center my-3">Media links & suggestions:</p>
            </div>

            <div className="grid grid-cols-2 gap-2 justify-center">
                {navigation.social.map((item, index) => (
                    <Link key={index} target="_blank" href={item.href} className={`flex relative bg-secondary-700 hover:bg-secondary-600 rounded-md cursor-pointer select-none items-center outline-none text-primary-text ${item.className}`}>
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
            className: 'plausible-event-name=Twitter'
        },
        {
            name: 'GitHub',
            href: 'https://github.com/TrainProtocol/app',
            icon: (props) => GitHubLogo(props),
            className: 'plausible-event-name=GitHub'
        },
    ]
}

export default MenuList