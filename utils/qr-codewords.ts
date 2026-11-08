/**
 * Codeword mapping for QR art (`utils/qr-codewords.ts`).
 *
 * Reed–Solomon buys back a share of the codeword stream, and it budgets in
 * whole codewords: one wrong bit in a codeword costs exactly as much as eight.
 * So painting has to happen in codeword-shaped chunks — flipping scattered
 * modules burns the same budget for a fraction of the pixels.
 *
 * This module rebuilds the ISO 18004 placement order, groups the data area into
 * codewords, and hands back the module coordinates of each one. It is verified
 * against the standard codeword totals for every version (see
 * `tests/looks_test.ts`): data modules must equal 8 × codewords + remainder.
 */

/** Alignment pattern centres (ISO 18004, versions 1–40). */
export function alignmentCenters(count: number): number[] {
  const version = (count - 17) / 4;
  if (version === 1) return [];
  const n = Math.floor(version / 7) + 2;
  const step = version === 32
    ? 26
    : Math.floor((version * 4 + n * 2 + 1) / (n * 2 - 2)) * 2;
  const positions = [6];
  for (let i = n - 1; i > 0; i--) positions.push(count - 7 - (i - 1) * step);
  return positions;
}

/**
 * Every module that is not data: the three finder corners (finder, separator
 * and the format strip together make an L of 9×9, 9×8 and 8×9), the timing
 * runs, the alignment patterns, and the version blocks on v7+.
 */
export function functionMask(count: number): boolean[][] {
  const n = count;
  const reserved = Array.from({ length: n }, () => new Array(n).fill(false));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) reserved[r][c] = true;
  }
  for (let r = 0; r < 9; r++) {
    for (let c = n - 8; c < n; c++) reserved[r][c] = true;
  }
  for (let r = n - 8; r < n; r++) {
    for (let c = 0; c < 9; c++) reserved[r][c] = true;
  }

  for (let i = 8; i <= n - 9; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  const centres = alignmentCenters(n);
  for (const ar of centres) {
    for (const ac of centres) {
      // The three that sit on a finder are already covered.
      if (
        (ar === 6 && (ac === 6 || ac === n - 7)) || (ac === 6 && ar === n - 7)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) reserved[ar + dr][ac + dc] = true;
      }
    }
  }

  if (n >= 45) {
    for (let r = 0; r < 6; r++) {
      for (let c = n - 11; c <= n - 9; c++) {
        reserved[r][c] = true;
        reserved[c][r] = true;
      }
    }
  }

  return reserved;
}

/** Total codewords per version, ISO 18004 table. */
export const TOTAL_CODEWORDS = [
  26,
  44,
  70,
  100,
  134,
  172,
  196,
  242,
  292,
  346,
  404,
  466,
  532,
  581,
  655,
  733,
  815,
  901,
  991,
  1085,
  1156,
  1258,
  1364,
  1474,
  1588,
  1706,
  1828,
  1921,
  2051,
  2185,
  2323,
  2465,
  2611,
  2761,
  2876,
  3034,
  3196,
  3362,
  3532,
  3706,
];

/** Trailing bits that belong to the data area but carry no codeword. */
export function remainderBits(version: number): number {
  if (version <= 1) return 0;
  if (version <= 6) return 7;
  if (version <= 13) return 0;
  if (version <= 20) return 3;
  if (version <= 27) return 4;
  if (version <= 34) return 3;
  return 0;
}

/**
 * Data modules in placement order: two-wide columns from the right, zig-zagging
 * up and down, skipping the vertical timing column.
 */
export function dataOrder(count: number): [number, number][] {
  const n = count;
  const reserved = functionMask(n);
  const order: [number, number][] = [];
  let col = n - 1;
  let upward = true;
  while (col > 0) {
    if (col === 6) col--;
    for (let step = 0; step < n; step++) {
      const row = upward ? n - 1 - step : step;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (!reserved[row][cc]) order.push([row, cc]);
      }
    }
    upward = !upward;
    col -= 2;
  }
  return order;
}

/** The data area cut into codewords of eight modules. */
export function codewordGroups(count: number): [number, number][][] {
  const order = dataOrder(count);
  const groups: [number, number][][] = [];
  // The trailing remainder bits belong to the data area but not to a codeword;
  // a painter must never spend budget on them.
  for (let i = 0; i + 8 <= order.length; i += 8) {
    groups.push(order.slice(i, i + 8));
  }
  return groups;
}

/**
 * How much the code disagrees with the picture, per codeword.
 *
 * A codeword is worth flipping when the modules inside it *mostly* want the
 * opposite polarity, and when they feel strongly about it. Flipping the group
 * costs the same however it scores, so the ranking is what makes the budget go
 * far: spend it where the picture is being fought hardest.
 */
export function rankCodewords(
  groups: [number, number][][],
  isDark: (row: number, col: number) => boolean,
  wantDark: (row: number, col: number) => number,
): { index: number; score: number }[] {
  return groups
    .map((group, index) => {
      let score = 0;
      for (const [row, col] of group) {
        const want = wantDark(row, col); // -1 … 1, +1 = strongly dark
        const disagree = (want > 0) !== isDark(row, col);
        score += disagree ? Math.abs(want) : -Math.abs(want);
      }
      return { index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Pick the codewords to flip. `share` is a fraction of the whole stream — the
 * correction budget is per codeword, so it scales with the version rather than
 * with the payload.
 */
export function chooseFlips(
  groups: [number, number][][],
  isDark: (row: number, col: number) => boolean,
  wantDark: (row: number, col: number) => number,
  share: number,
): Set<number> {
  const budget = Math.max(0, Math.round(groups.length * share));
  const ranked = rankCodewords(groups, isDark, wantDark).slice(0, budget);
  return new Set(ranked.map((entry) => entry.index));
}
