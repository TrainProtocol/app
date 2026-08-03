import { Home } from "lucide-react";
import { ReactNode } from "react";
import MessageComponent from "./MessageComponent";
import GoHomeButton from "./utils/GoHome";
import ContactSupport from "./ContactSupport";
import { Widget } from "./Widget/Index";

type Tone = 'error' | 'warning'

const TONE_BACKGROUNDS: Record<Tone, string> = {
    error: 'bg-error-background',
    warning: 'bg-warning-background',
}

type StatusPageProps = {
    /** Glyph for the tinted circle; sized by the caller. */
    icon: ReactNode
    tone: Tone
    title: string
    description: ReactNode
    /** Action buttons rendered at the bottom of the widget. */
    children?: ReactNode
}

/**
 * Full-widget terminal state — 404, error boundary, feature-unavailable.
 *
 * Anything with its own chrome (e.g. `Maintanance`, which renders outside the Widget)
 * should stay a standalone component rather than growing props here.
 */
export default function StatusPage({ icon, tone, title, description, children }: StatusPageProps) {
    return (
        <Widget hideMenu>
            <div className="flex flex-col h-[80svh] sm:h-[390px]">
                <MessageComponent>
                    <MessageComponent.Content center>
                        <MessageComponent.Header className="mb-3">
                            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${TONE_BACKGROUNDS[tone]}`}>
                                {icon}
                            </div>
                            <h1 className="text-center text-2xl font-semibold text-primary-text">
                                {title}
                            </h1>
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                {description}
                            </p>
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        {children}
                    </MessageComponent.Buttons>
                </MessageComponent>
            </div>
        </Widget>
    );
}

/** Inline "contact our support" link used inside StatusPage descriptions. */
export function SupportLink({ children }: { children: ReactNode }) {
    return (
        <ContactSupport>
            <button
                type="button"
                className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-700 focus:ring-gray-400 rounded"
            >
                <span>{children}</span>
            </button>
        </ContactSupport>
    )
}

/** Secondary action returning the user to the app root. */
export function BackToAppButton({ onClick }: { onClick?: () => void }) {
    return (
        <GoHomeButton onClick={onClick}>
            <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-400 px-5 py-4 text-base font-semibold leading-6 text-primary-text hover:bg-secondary-300 focus:outline-none transition"
            >
                <Home className="h-5 w-5" aria-hidden="true" />
                <span>Back to app</span>
            </button>
        </GoHomeButton>
    )
}
