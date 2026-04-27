import { Home, RefreshCcw } from "lucide-react";
import React from "react";
import SubmitButton from "./buttons/submitButton"
import ContactSupport from "./ContactSupport"
import MessageComponent from "./MessageComponent"
import GoHomeButton from "./utils/GoHome"
import { IsExtensionError } from "../helpers/errorHelper";
import { Widget } from "./Widget/Index";

export default function ErrorFallback({ error, resetErrorBoundary }) {

    const extension_error = IsExtensionError(error)

    return (
        <Widget hideMenu>
            <Widget.Content center>
                <MessageComponent>
                    <MessageComponent.Content icon="red">
                        <MessageComponent.Header>
                            Unable to complete the request
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            <p>
                                <span>Sorry, but we were unable to complete this request.&nbsp;</span>
                                {
                                    extension_error ?
                                        <span>It seems that some of your extensions are preventing the app from running.</span>
                                        : <span>We are informed, and are now investigating the issue.</span>
                                }
                            </p>
                            <p>
                                {
                                    extension_error ?
                                        <span>Please disable extensions and try again or open in incognito mode. If the issue keeps happening,&nbsp;</span>
                                        :
                                        <span>Please try again. If the issue keeps happening,&nbsp;</span>
                                }
                                <span className="underline cursor-pointer text-primary "><ContactSupport>contact our support team.</ContactSupport></span>
                            </p>
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <div className="flex flex-row text-primary-text text-xs sm:text-base space-x-2">
                            <div className='flex-1'>
                                <GoHomeButton onClick={resetErrorBoundary}>
                                    <SubmitButton buttonStyle="secondary" isDisabled={false} isSubmitting={false} icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                        Go home
                                    </SubmitButton>
                                </GoHomeButton>
                            </div>
                            <div className='flex-1'>
                                <SubmitButton isDisabled={false} isSubmitting={false}
                                    onClick={() => resetErrorBoundary()}
                                    icon={<RefreshCcw className="h-5 w-5" aria-hidden="true" />}>
                                    Try Again
                                </SubmitButton>
                            </div>
                        </div>
                    </MessageComponent.Buttons>
                </MessageComponent>
            </Widget.Content>
        </Widget>
    );
}
