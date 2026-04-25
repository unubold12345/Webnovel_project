export interface CoinChangeEvent {
  amount: number;
}

export function dispatchCoinChange(amount: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<CoinChangeEvent>("coinChange", {
        detail: { amount },
      })
    );
  }
}

export function listenCoinChange(
  callback: (e: CoinChangeEvent) => void
): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent<CoinChangeEvent>).detail);
  };
  window.addEventListener("coinChange", handler);
  return () => window.removeEventListener("coinChange", handler);
}
