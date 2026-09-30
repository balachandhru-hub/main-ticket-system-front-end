// src/api/msalConfig.ts
import {
  EventMessageUtils,
  InteractionStatus,
  PublicClientApplication,
} from "@azure/msal-browser";
import type { AuthenticationResult, EventMessage } from "@azure/msal-browser";

export const loginRequest = {
  scopes: ['user.Read'],
};

/**
 * Result of draining the redirect response on page load. `error` is populated
 * when the authorization code could not be redeemed (e.g. AADSTS70008 -
 * expired code). It is reported, never thrown, so a failed/stale redirect can
 * never block the user from starting a fresh sign-in.
 */
export interface MsalRedirectOutcome {
  response: AuthenticationResult | null;
  error: unknown | null;
}

let msalInstance: PublicClientApplication | null = null;
let msalReady: Promise<MsalRedirectOutcome> | null = null;
let interactionStatus: InteractionStatus = InteractionStatus.Startup;

export const getMsalInstance = (): PublicClientApplication => {
  if (msalInstance) return msalInstance;

  const redirectUri = window.location.origin;

  msalInstance = new PublicClientApplication({
    auth: {
      clientId: '42fa683e-0c5a-4281-9cdd-f908bfd058fc',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri,
      postLogoutRedirectUri: redirectUri,
      // Redeem the authorization code on the page we land on instead of doing
      // an extra full page load back to the login-request URL first. That extra
      // load re-boots the host app and the federated remote before the code is
      // redeemed, which widens the window for the code to expire (AADSTS70008).
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  });

  // Mirror MSAL's own InteractionStatus (the mechanism @azure/msal-react uses)
  // so we never start a second interactive request while one is still running.
  msalInstance.addEventCallback((message: EventMessage) => {
    const status = EventMessageUtils.getInteractionStatusFromEvent(
      message,
      interactionStatus
    );
    if (status !== null) interactionStatus = status;
  });

  return msalInstance;
};

/**
 * Initializes MSAL and drains a pending redirect response exactly once per page
 * load. Every caller shares the same promise, so React StrictMode double
 * mounts, re-renders and concurrent callers can never run two redirect
 * handlers. handleRedirectPromise() is always awaited (never skipped) because
 * it is the only thing that clears MSAL's `interaction_in_progress` flag.
 */
export const initializeMsal = (): Promise<MsalRedirectOutcome> => {
  if (!msalReady) {
    const instance = getMsalInstance();
    msalReady = (async () => {
      try {
        await instance.initialize();
      } catch (error) {
        // initialize() failing is fatal but retryable - drop the cached promise.
        msalReady = null;
        throw error;
      }

      try {
        return { response: await instance.handleRedirectPromise(), error: null };
      } catch (error) {
        /*
         * MSAL caches the handleRedirectPromise() promise for the lifetime of
         * the page, so a rejection here would be replayed to every later
         * caller. Capture it instead: MSAL has already cleared its request
         * cache and the interaction flag, so a new loginRedirect() is safe.
         */
        return { response: null, error };
      }
    })();
  }
  return msalReady;
};

export const getInteractionStatus = (): InteractionStatus => interactionStatus;

/** True while MSAL is running a login / logout / acquireToken / redirect flow. */
export const isInteractionInProgress = (): boolean =>
  interactionStatus !== InteractionStatus.None &&
  interactionStatus !== InteractionStatus.Startup;
