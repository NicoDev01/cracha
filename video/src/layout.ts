import { CX } from "./theme";

// Positions that two scenes share: one scene hands an element to the next.

/** The crawled start page while it is being scanned, centre stage. */
export const ROOT_BIG = { cx: CX, cy: 560, w: 460, h: 290, r: 26 };
/** The same page once it steps left to become the root of the tree. */
export const ROOT_SMALL = { cx: 600, cy: 425, w: 250, h: 158, r: 18 };

/** Where the pages flow in and the knowledge base stands. */
export const DB_POS = { x: CX, y: 560 };

/** The chat column: question on the right edge, answer on the left. */
export const CHAT = { left: CX - 480, right: CX + 480 };
export const QUESTION = { text: "Welche Zahlungsarten bietet ihr an?", w: 610, h: 80, cy: 440 };
export const INPUT = { cx: CX, cy: 600, w: 900, h: 96 };
export const CTA = { cx: CX, cy: 590, w: 560, h: 120 };
