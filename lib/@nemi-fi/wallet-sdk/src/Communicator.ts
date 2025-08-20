// copied and adapted from CoinbaseWalletSdk: https://github.com/coinbase/coinbase-wallet-sdk/blob/bb531e34133fde40f53229966812b77a6e5a2626/packages/wallet-sdk/src/core/communicator/Communicator.ts

/**
 * Communicates with a wallet popup window for to send and receive messages.
 *
 * This class is responsible for opening a popup window, posting messages to it,
 * and listening for responses.
 *
 * It also handles cleanup of event listeners and the popup window itself when necessary.
 */
export class Communicator {
  private readonly url: URL;
  private popup: Window | null = null;
  private listeners = new Map<
    (_: MessageEvent) => void,
    { reject: (_: Error) => void }
  >();

  private popupCloseInterval: any;

  private fallbackOpenPopup: FallbackOpenPopup | undefined;

  constructor(params: {
    url: string | URL;
    fallbackOpenPopup?: FallbackOpenPopup;
  }) {
    this.url = new URL(params.url);
    this.fallbackOpenPopup = params.fallbackOpenPopup;
  }

  /**
   * Posts a message to the popup window
   */
  postMessage = async (message: Message) => {
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(message, this.url.origin);
  };

  /**
   * Posts a request to the popup window and waits for a response
   */
  postRequestAndWaitForResponse = async <M extends Message>(
    request: Message,
  ): Promise<M> => {
    const responsePromise = this.onMessage<M>(
      ({ requestId }) => requestId === request.requestId,
    );
    await this.postMessage(request);
    return await responsePromise;
  };

  /**
   * Listens for messages from the popup window that match a given predicate.
   */
  onMessage = async <M extends Message>(
    predicate: (_: Partial<M>) => boolean,
  ): Promise<M> => {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent<M>) => {
        if (event.origin !== this.url.origin) return; // origin validation

        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          window.removeEventListener("message", listener);
          this.listeners.delete(listener);
        }
      };

      window.addEventListener("message", listener);
      this.listeners.set(listener, { reject });
    });
  };

  /**
   * Closes the popup, rejects all requests and clears the listeners
   */
  disconnect = () => {
    // Note: keys popup handles closing itself. this is a fallback.
    closePopup(this.popup);
    this.popup = null;

    if (this.popupCloseInterval != null) {
      clearInterval(this.popupCloseInterval);
      this.popupCloseInterval = undefined;
    }

    this.listeners.forEach(({ reject }, listener) => {
      reject(new Error("Request rejected"));
      window.removeEventListener("message", listener);
    });
    this.listeners.clear();
  };

  /**
   * Waits for the popup window to fully load and then sends a version message.
   */
  waitForPopupLoaded = async (): Promise<Window> => {
    if (this.popup && !this.popup.closed) {
      // In case the user un-focused the popup between requests, focus it again
      this.popup.focus();
      return this.popup;
    }

    this.popup = openPopup(this.url);
    if (!this.popup && this.fallbackOpenPopup) {
      console.log("failed to open, trying fallback");
      this.popup = await this.fallbackOpenPopup(() => openPopup(this.url));
    }
    if (!this.popup) {
      throw new Error("Failed to open popup: failed to load");
    }

    this.onMessage<ConfigMessage>(({ event }) => event === "PopupUnload")
      .then(this.disconnect)
      .catch(() => {});
    if (this.popupCloseInterval == null) {
      this.popupCloseInterval = setInterval(() => {
        if (!this.popup || this.popup.closed) {
          this.disconnect();
        }
      }, 100);
    }

    const pingInterval: any = setInterval(() => {
      if (!this.popup || this.popup.closed) {
        clearInterval(pingInterval);
        return;
      }
      this.popup.postMessage({ event: "PopupLoadedRequest" }, this.url.origin);
    }, 100);
    try {
      const message = await this.onMessage<ConfigMessage>(({ event }) => {
        return event === "PopupLoaded";
      });
    } finally {
      clearInterval(pingInterval);
    }
    // await this.postMessage({
    //   requestId: message.id,
    //   data: {
    //     version: VERSION,
    //     metadata: this.metadata,
    //     preference: this.preference,
    //   },
    // });

    return this.popup;
  };
}

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

// Window Management

export function openPopup(url: URL): Window | null {
  const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
  const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

  const popup = window.open(
    url,
    "Smart Wallet",
    `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`,
  );

  popup?.focus();

  return popup;
}

export function closePopup(popup: Window | null) {
  if (popup && !popup.closed) {
    popup.close();
  }
}

type Message = {
  requestId: string;
  data: unknown;
};

export interface ConfigMessage extends Message {
  event: ConfigEvent;
}

export type ConfigEvent = "PopupLoaded" | "PopupUnload";

export type FallbackOpenPopup = (
  openPopup: () => Window | null,
) => Promise<Window | null>;
