"use client"

import { TriangleAlert, ExternalLink } from "lucide-react"
import MessageComponent from "@/components/MessageComponent"
import { Widget } from "@/components/Widget/Index"

const TESTNET_FAUCET_URL = "https://testnet.train.tech/faucet"

export default function FaucetTestnetOnly() {
    return (
        <Widget hideMenu>
            <div className="flex flex-col h-[80svh] sm:h-[390px]">
                <MessageComponent>
                    <MessageComponent.Content center>
                        <MessageComponent.Header className="mb-3">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-background">
                                <TriangleAlert className="h-10 w-10 text-warning-foreground" />
                            </div>
                            <h1 className="text-center text-2xl font-semibold text-primary-text">
                                Testnet only
                            </h1>
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                The faucet mints test tokens, so it&apos;s only available on the testnet version of the app.
                            </p>
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <a
                            href={TESTNET_FAUCET_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-400 px-5 py-4 text-base font-semibold leading-6 text-primary-text hover:bg-secondary-300 focus:outline-none transition"
                        >
                            <span>Open testnet faucet</span>
                            <ExternalLink className="h-5 w-5" aria-hidden="true" />
                        </a>
                    </MessageComponent.Buttons>
                </MessageComponent>
            </div>
        </Widget>
    )
}
