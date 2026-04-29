import { Home, RotateCcw } from "lucide-react";
import MessageComponent from "./MessageComponent";
import NotFoundIcon from "./Icons/NotFoundIcon";
import GoHomeButton from "./utils/GoHome";
import SubmitButton from "./buttons/submitButton";
import ContactSupport from "./ContactSupport";
import { Widget } from "./Widget/Index";

export default function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <Widget hideMenu>
            <div className="flex flex-col h-[80svh] sm:h-[400px]">
                <MessageComponent>
                <MessageComponent.Content center>
                    <MessageComponent.Header className="mb-3">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
                            <NotFoundIcon className="text-error-foreground" />
                        </div>
                        <h1 className="text-center text-2xl font-semibold text-primary-text">
                            Unable to complete the request
                        </h1>
                    </MessageComponent.Header>
                    <MessageComponent.Description>
                        <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                            <span>Our team is informed and are now investigating the issue. Please try again, if the issue persists you can</span>
                            <ContactSupport>
                                <button
                                    type="button"
                                    className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1420] focus:ring-gray-400 rounded"
                                >
                                    <span>contact our support.</span>
                                </button>
                            </ContactSupport>
                        </p>
                    </MessageComponent.Description>
                </MessageComponent.Content>
                <MessageComponent.Buttons>
                    <div className="flex flex-col w-full text-primary-text text-base space-y-2">
                        <SubmitButton
                            style={{ display: 'ruby' }}
                            className="py-3 text-center"
                            button_align="right"
                            text_align="left"
                            isDisabled={false}
                            isSubmitting={false}
                            onClick={() => resetErrorBoundary()}
                            icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
                        >
                            <span>Try Again</span>
                        </SubmitButton>
                        <GoHomeButton onClick={resetErrorBoundary}>
                            <button
                                type="button"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-400 px-5 py-3 text-base font-semibold leading-6 hover:bg-secondary-300 focus:outline-none transition"
                            >
                                <Home className="h-5 w-5" aria-hidden="true" />
                                <span>Back to app</span>
                            </button>
                        </GoHomeButton>
                    </div>
                </MessageComponent.Buttons>
                </MessageComponent>
            </div>
        </Widget>
    );
}
