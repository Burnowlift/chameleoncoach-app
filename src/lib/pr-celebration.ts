const PR_EVENT = "chameleon:pr";

interface PrDetail {
  liftLabel: string;
  e1rm: number;
}

export function emitPrCelebration(detail: PrDetail) {
  window.dispatchEvent(new CustomEvent(PR_EVENT, { detail }));
}

export function onPrCelebration(handler: (detail: PrDetail) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<PrDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(PR_EVENT, listener);
  return () => window.removeEventListener(PR_EVENT, listener);
}
