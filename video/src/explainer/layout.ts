import { CX } from "../theme";
import { SITE } from "./timeline";

// Positions that two scenes share: one scene hands an element to the next.

/** The website the viewer clicks through at the start. */
export const PAGE = { cx: CX, cy: 610, w: 800, h: 470, r: 24 };
/** The logo pill. */
export const PILL = { cx: CX, cy: 480, w: 640, h: 176, r: 88 };
export const URL_FIELD = { cx: CX, cy: 560, w: 920, h: 108, r: 54 };

/** The start page while it is read, and once it tops the tree. */
export const ROOT_BIG = { cx: CX, cy: 600, w: 460, h: 290, r: 26 };
export const ROOT_SMALL = { cx: CX, cy: 372, w: 190, h: 120, r: 16 };

export const DB_POS = { x: CX, y: 590 };

export const CHAT = { left: CX - 480, right: CX + 480 };
export const QUESTION = { text: "Welche Zahlungsarten bietet ihr an?", w: 610, h: 80, cy: 400 };
export const INPUT = { cx: CX, cy: 600, w: 900, h: 96 };
export const ANSWER = { top: QUESTION.cy + QUESTION.h / 2 + 34, h: 158 };

export const CHIP_H = 60;
export const CHIP_TOP = ANSWER.top + ANSWER.h + 22;
export const SOURCES = [
  { n: 1, url: `${SITE}/service/hilfe/zahlung`, w: 560, left: CHAT.left },
  { n: 2, url: `${SITE}/versand`, w: 390, left: CHAT.left + 576 },
];
/** Source 1 as a box, so the morphing box can take its place. */
export const CHIP1 = { cx: SOURCES[0].left + SOURCES[0].w / 2, cy: CHIP_TOP + CHIP_H / 2, w: SOURCES[0].w, h: CHIP_H, r: CHIP_H / 2 };

/** The original page the answer was taken from. */
export const SOURCE = { cx: CX, cy: 620, w: 940, h: 450, r: 28 };
export const CTA = { cx: CX, cy: 590, w: 560, h: 120 };
