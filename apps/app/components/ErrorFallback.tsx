import { RotateCcw } from "lucide-react";
import NotFoundIcon from "./Icons/NotFoundIcon";
import SubmitButton from "./buttons/submitButton";
import StatusPage, { BackToAppButton, SupportLink } from "./StatusPage";

export default function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <StatusPage
            tone="error"
            icon={<NotFoundIcon className="text-error-foreground" />}
            title="Unable to complete the request"
            description={
                <>
                    <span>Our team is informed and are now investigating the issue. Please try again, if the issue persists you can</span>
                    <SupportLink>contact our support.</SupportLink>
                </>
            }
        >
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
                <BackToAppButton onClick={resetErrorBoundary} />
            </div>
        </StatusPage>
    );
}
