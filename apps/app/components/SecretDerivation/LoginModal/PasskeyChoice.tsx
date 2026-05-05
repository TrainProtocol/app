import { useState } from 'react';
import { AlertTriangle, Fingerprint, Lock } from 'lucide-react';
import { type StoredPasskey } from '@train-protocol/auth';
import SubmitButton from '../../buttons/submitButton';
import { StepBody } from '../StepBody';
import { Input } from '@/components/shadcn/input';

const PASSKEY_NAME_ADJECTIVES = ['Swift', 'Brave', 'Quiet', 'Bright', 'Clever', 'Bold', 'Calm', 'Wild', 'Lucky', 'Mellow', 'Sunny', 'Crisp', 'Nimble', 'Gentle', 'Rapid'];
const PASSKEY_NAME_ANIMALS = ['Fox', 'Otter', 'Heron', 'Lynx', 'Falcon', 'Badger', 'Marten', 'Wren', 'Hare', 'Stoat', 'Owl', 'Raven', 'Puma', 'Sable', 'Crane'];

const generateRandomPasskeyName = (): string => {
  const adj = PASSKEY_NAME_ADJECTIVES[Math.floor(Math.random() * PASSKEY_NAME_ADJECTIVES.length)];
  const animal = PASSKEY_NAME_ANIMALS[Math.floor(Math.random() * PASSKEY_NAME_ANIMALS.length)];
  return `${adj} ${animal}`;
};

interface EntryStepProps {
  credentials: StoredPasskey[];
  onPick: (credentialId: string) => void;
  onCreateNew: () => void;
  onLoginWithExisting: () => void;
  onForgetAll: () => void;
  onShowFaq: () => void;
}

export function EntryStep({ credentials, onPick, onCreateNew, onLoginWithExisting, onForgetAll, onShowFaq }: EntryStepProps) {
  const hasSaved = credentials.length > 0;

  const info = hasSaved ? (
    <div className="flex flex-col items-stretch gap-2 w-full">
      <p className="text-secondary-text text-xs font-medium uppercase tracking-wide">Saved logins</p>
      <div className="flex flex-col gap-2">
        {credentials.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className="w-full flex items-center gap-3 py-3 px-3 rounded-xl bg-secondary-500 hover:bg-secondary-400 text-primary-text text-left transition-colors active:animate-press-down"
          >
            <Fingerprint className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium truncate">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
        <Lock className="w-8 h-8 text-primary-text" strokeWidth={2} />
      </div>
      <p className="text-primary-text text-xl font-medium">Log in</p>
    </div>
  );

  const actions = (
    <div className="flex flex-col gap-2 w-full">
      <SubmitButton type="button" onClick={onCreateNew}>
        Create new
      </SubmitButton>
      <SubmitButton type="button" buttonStyle="secondary" onClick={onLoginWithExisting}>
        Log in with existing
      </SubmitButton>
      <div className="flex items-center justify-center gap-3 mt-1">
        <button
          type="button"
          onClick={onShowFaq}
          className="text-xs text-secondary-text hover:text-primary-text transition-colors underline hover:no-underline"
        >
          What's a passkey?
        </button>
        {hasSaved && (
          <button
            type="button"
            onClick={onForgetAll}
            className="text-xs text-secondary-text hover:text-primary-text transition-colors underline hover:no-underline"
          >
            Forget all logins
          </button>
        )}
      </div>
    </div>
  );

  return <StepBody info={info} actions={actions} centerOverlay={!hasSaved} />;
}

interface CreateStepProps {
  onCreate: (label: string) => void;
  onShowFaq: () => void;
}

export function CreateStep({ onCreate, onShowFaq }: CreateStepProps) {
  const [name, setName] = useState('');
  const [suggestedName] = useState(generateRandomPasskeyName);

  const submit = () => onCreate(name.trim() || suggestedName);

  const info = (
    <>
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
          <Fingerprint className="w-8 h-8 text-primary-text" strokeWidth={2} />
        </div>
      </div>
      <div className="w-full flex flex-col gap-1.5">
        <label htmlFor="passkey-label" className="text-xs text-secondary-text font-medium">
          Name this passkey
        </label>
        <Input
          id="passkey-label"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggestedName}
          maxLength={64}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="bg-secondary-500 border-secondary-400 py-3"
        />
        <p className="text-xs text-secondary-text">
          Shown here and in your password manager. <button type="button" onClick={onShowFaq} className="text-secondary-text hover:text-primary-text transition-colors underline hover:no-underline">What's a passkey?</button>
        </p>
      </div>
    </>
  );

  const actions = (
    <SubmitButton type="button" onClick={submit}>
      Create
    </SubmitButton>
  );

  return <StepBody info={info} actions={actions} centerOverlay={false} overlayActionMt="mt-6" />;
}

interface ErrorStepProps {
  message: string;
  onBack: () => void;
}

export function ErrorStep({ message, onBack }: ErrorStepProps) {
  const info = (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-secondary-text" strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-primary-text text-xl font-medium">Login failed</p>
        <p className="text-secondary-text text-sm max-w-[280px]">{message}</p>
      </div>
    </div>
  );

  const actions = (
    <SubmitButton type="button" buttonStyle="secondary" onClick={onBack}>
      Back
    </SubmitButton>
  );

  return <StepBody info={info} actions={actions} />;
}
