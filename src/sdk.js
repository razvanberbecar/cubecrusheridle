const sdk = window.CrazyGames?.SDK;
const SAVE_KEY = 'cci_save';

const ALLOWED_HOSTS = [
  'crazygames.com',
  'crazygames.net',
  'crazygames.io',
  '1001juegos.com',
  'localhost',
  '127.0.0.1',
];

export function checkSitelock() {
  try {

    const host = (document.referrer && new URL(document.referrer).hostname) ||
      window.location.hostname;
    return ALLOWED_HOSTS.some(
      (h) => host === h || host.endsWith('.' + h) || host === ''
    );
  } catch {
    return true; // never block the game on a parsing error
  }
}

// ---- Init --------------------------------------------------------------
// SDK v3 MUST be initialized before any game.* / data.* / ad.* call, otherwise
// every call no-ops with "CrazySDK is not initialized yet". Guarded + memoized
// so local dev (no SDK, or not on a CrazyGames domain) still runs cleanly.
let _initPromise = null;
export function initSDK() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      await sdk?.init?.();
    } catch {
      // SDK unavailable or running outside CrazyGames — the game continues and
      // saves fall back to localStorage.
    }
  })();
  return _initPromise;
}

// ---- Lifecycle ---------------------------------------------------------
export function loadingStart() {
  try {
    sdk?.game?.loadingStart?.();
  } catch {}
}

export function loadingStop() {
  try {
    sdk?.game?.loadingStop?.();
  } catch {}
}

export function gameplayStart() {
  try {
    sdk?.game?.gameplayStart?.();
  } catch {}
}

export function gameplayStop() {
  try {
    sdk?.game?.gameplayStop?.();
  } catch {}
}

// ---- Ads ----------------------------------------------------------------
// Midgame (interstitial) ad. `onFinish` ALWAYS runs — on finish, on error, or
// when there's no SDK — so the game reliably un-pauses afterwards.
export function requestMidgameAd({ onStart, onFinish } = {}) {
  if (!sdk?.ad) {
    onFinish?.();
    return;
  }
  try {
    sdk.ad.requestAd('midgame', {
      adStarted: () => onStart?.(),
      adFinished: () => onFinish?.(),
      adError: () => onFinish?.(),
    });
  } catch {
    onFinish?.();
  }
}

export function requestRewardedAd({ onStart, onReward, onFinish } = {}) {
  if (!sdk?.ad) {
    onReward?.();
    onFinish?.();
    return;
  }
  try {
    sdk.ad.requestAd('rewarded', {
      adStarted: () => onStart?.(),
      adFinished: () => {
        onReward?.();
        onFinish?.();
      },
      adError: () => onFinish?.(),
    });
  } catch {
    onFinish?.();
  }
}

export async function saveGame(state) {
  const payload = JSON.stringify(state);
  try {
    if (sdk?.data) await sdk.data.setItem('save', payload);
    else localStorage.setItem(SAVE_KEY, payload);
  } catch {

  }
}

export async function loadGame() {
  try {
    const raw = sdk?.data
      ? await sdk.data.getItem('save')
      : localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const hasSDK = !!sdk;
