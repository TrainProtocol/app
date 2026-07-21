import { FC } from "react";
import SubmitButton from "../buttons/submitButton";

/**
 * Inline emoji-verification step for the Azguard (Aztec) connection flow.
 * Rendered as one of ConnectorsList's connection steps — not a separate
 * overlay — so it can't be covered by the connect drawer/dialog.
 */
const AztecEmojiVerification: FC<{
    emojis: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ emojis, onConfirm, onCancel }) => {
    const emojiChars = [...emojis];
    const rows = [
        emojiChars.slice(0, 3),
        emojiChars.slice(3, 6),
        emojiChars.slice(6, 9),
    ];

    return (
        <div className="w-full flex flex-col items-center relative h-full">
            <div className="flex grow flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-primary-text text-center mb-2">
                    Verify Connection
                </h3>
                <p className="text-sm text-secondary-text text-center mb-6 max-w-xs">
                    Confirm these emojis match what your wallet displays
                </p>
                <div className="flex flex-col items-center gap-1">
                    {rows.map((row, i) => (
                        <div key={i} className="flex gap-1">
                            {row.map((emoji, j) => (
                                <div
                                    key={j}
                                    className="w-14 h-14 flex items-center justify-center bg-secondary-700 rounded-lg text-3xl"
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex gap-3 w-full mt-auto pt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 rounded-lg border border-secondary-500 text-secondary-text text-sm font-medium cursor-pointer bg-transparent hover:bg-secondary-500 transition-colors"
                >
                    Cancel
                </button>
                <SubmitButton
                    type="button"
                    onClick={onConfirm}
                >
                    Emojis Match
                </SubmitButton>
            </div>
        </div>
    );
};

export default AztecEmojiVerification;
