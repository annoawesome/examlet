/** Returns a value in [0, 1). Injectable so tests can be deterministic. */
export type RandomSource = () => number;

/** Fisher–Yates shuffle. Returns a new array and leaves the input untouched. */
export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }

  return result;
}
