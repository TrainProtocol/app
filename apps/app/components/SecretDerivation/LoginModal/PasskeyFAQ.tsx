"use client"

import { ChevronDown, KeyRound } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from '@/components/shadcn/accordion';
import AppShellDialog from '@/components/shared/AppShellDialog';
import VaulDrawer from '@/components/Modal/vaulModal';
import useWindowDimensions from '@/hooks/useWindowDimensions';

const FAQ_ITEMS: { id: string; question: string; answer: string }[] = [
  {
    id: 'faq-1',
    question: 'Why do I need to log in?',
    answer:
      "Train is fully non-custodial — no servers hold your funds, and there's no email or password reset path. Every swap is secured by a Hash Time-Locked Contract (HTLC), which can only be unlocked by a secret that nobody but you can produce. Logging in is how Train obtains that secret material on your device, without ever transmitting or storing it. Without a login, there'd be no way to lock the source chain or claim the destination side when the solver responds.",
  },
  {
    id: 'faq-2',
    question: 'What does logging in actually do?',
    answer:
      "It runs a two-step key derivation, entirely in your browser:\n\n1. Master key. Your passkey evaluates the WebAuthn PRF extension against a fixed Train salt, returning a deterministic 32-byte value. Train feeds that through HKDF-SHA256 to produce a 32-byte master key for your session. The master key never leaves the tab.\n\n2. Per-swap secret. Each swap gets a unique timestamp (the nonce). For every swap, the master key is fed back into HKDF-SHA256 with that timestamp as the salt, producing a fresh 32-byte secret used only for that one swap. The on-chain hashlock is sha256(secret) — that hash is all Train and the solver ever see.\n\nBecause both steps are deterministic, the same passkey + same timestamp always re-produces the same secret on any device that can sign with that passkey.",
  },
  {
    id: 'faq-3',
    question: 'Does Train store my passkey, master key, or swap secret?',
    answer:
      "No. Your passkey itself stays in your OS or password manager's secure store (Secure Enclave, TPM, Titan chip, YubiKey, etc.) — Train can't read it. The PRF output, master key, and each per-swap secret are computed locally and held only in browser memory for the session. Train's servers receive only the public hashlock (sha256 of the secret), which is what funds are locked against on-chain. Hashes can't be reversed back into the secret, so even a full database leak couldn't reveal your keys.",
  },
  {
    id: 'faq-4',
    question: 'What if I refresh the page or come back later mid-swap?',
    answer:
      "Each swap's timestamp (nonce) is stored in the URL and in the on-chain userData field of the lock. When you return, Train reads that timestamp, asks your passkey to re-derive the master key, then re-runs the HKDF step with the timestamp — re-creating the exact same swap secret. Your funds are never stranded as long as you have the passkey: even months later, the same passkey + the same timestamp produces the same secret.",
  },
  {
    id: 'faq-5',
    question: 'Why a passkey instead of a password or wallet signature?',
    answer:
      "Three things make passkeys a fit for this kind of key derivation:\n\n• Deterministic. WebAuthn's PRF extension returns the same 32-byte output every time for the same passkey + salt, so the master key can be re-derived on demand without ever being stored.\n\n• Non-extractable. The underlying key material lives inside your device's secure hardware. Train only sees the PRF output, never the key that produced it.\n\n• Phishing-resistant. Passkeys are bound to the origin they were registered on — a lookalike site can't get your authenticator to produce the same PRF output, no matter how convincing it looks.\n\nPasswords can't deterministically produce a 32-byte key and can be phished or leaked. Wallet signatures can derive keys too, but they require a wallet popup per derivation and behave inconsistently across wallets, which is a poor fit for the per-swap derivation Train needs.",
  },
  {
    id: 'faq-6',
    question: 'What is a passkey?',
    answer:
      "A passkey is a phishing-resistant credential standardized by FIDO2/WebAuthn. It's a public/private key pair where the private key is generated and locked inside your device's secure hardware (Face ID, Touch ID, Windows Hello, Android biometrics, or an external security key like YubiKey). Sites only ever see the public key and signed challenges — the private key never leaves the device, and biometric or PIN verification is required for every use.",
  },
  {
    id: 'faq-7',
    question: 'Where is my passkey stored?',
    answer:
      "Your passkey is stored by your operating system or password manager — for example iCloud Keychain on Apple, Google Password Manager on Android, Windows Hello on Windows, or apps like 1Password and Dashlane. The actual key material lives inside that secure store and is never exposed to Train or any website you visit. Train only stores a small label and credential ID locally (in your browser) so you can pick which saved login to use.",
  },
  {
    id: 'faq-8',
    question: 'Can I use the same passkey on multiple devices?',
    answer:
      "Yes, if your passkey is synced through a service like iCloud Keychain, Google Password Manager, or 1Password — it'll appear automatically on your other signed-in devices. Because the PRF output is deterministic per credential, the master key and every derived swap secret will be identical across all synced devices. Hardware security keys (like a YubiKey) stay on the physical key itself and aren't synced — you'd plug the same key into each device you want to use.",
  },
  {
    id: 'faq-9',
    question: 'What happens if I lose my device?',
    answer:
      "If your passkey is synced through a cloud-backed password manager (iCloud, Google, 1Password, etc.), you can sign in again on a new device once it syncs over — the same master key will be re-derived and any in-flight swaps recovered from their on-chain timestamps. If your passkey isn't synced — for example a hardware key with no backup — that credential can't be recovered and a new passkey would mean a new master key (existing in-flight swaps would need to be refunded via the HTLC timeout). We recommend using a synced passkey so you always have a way back in.",
  },
];

function PasskeyFAQContent() {
  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center pt-2 pb-6 shrink-0">
        <div className="w-20 h-20 rounded-3xl bg-secondary-500 flex items-center justify-center">
          <KeyRound className="w-12 h-12 text-primary-text" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-primary-text text-xl font-semibold">About logging in</p>
          <p className="text-secondary-text text-sm max-w-[320px]">
            Why Train needs a login, what it does, and how passkeys keep it secure.
          </p>
        </div>
      </div>
      <div className="max-h-[55svh] overflow-y-auto styled-scroll -mx-1 px-1">
        <Accordion type="single" collapsible className="flex flex-col gap-2">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="rounded-xl bg-secondary-500 hover:bg-secondary-400 transition-colors overflow-hidden"
            >
              <AccordionTrigger className="group flex items-center justify-between gap-3 py-4 px-3 text-left">
                <span className="text-sm font-medium text-primary-text">{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-secondary-text transition-transform duration-200 group-aria-expanded:rotate-180"
                  strokeWidth={2}
                />
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-3 pb-3 text-sm text-secondary-text leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}

interface PasskeyFAQModalProps {
  open: boolean;
  onClose: () => void;
}

export function PasskeyFAQModal({ open, onClose }: PasskeyFAQModalProps) {
  const { isMobile } = useWindowDimensions();

  if (isMobile) {
    return (
      <VaulDrawer
        show={open}
        setShow={(show) => { if (!show) onClose(); }}
        modalId="passkey-faq"
        mode="fitHeight"
      >
        <VaulDrawer.Snap id="item-1" openFullHeight className="h-full">
          <div className="px-4 pb-4">
            <PasskeyFAQContent />
          </div>
        </VaulDrawer.Snap>
      </VaulDrawer>
    );
  }

  return (
    <AppShellDialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
    >
      <PasskeyFAQContent />
    </AppShellDialog>
  );
}
