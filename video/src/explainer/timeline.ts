// Every beat of the explainer in seconds. One thing happens at a time; each
// state gets a moment of rest before it turns into the next.
export const E = {
  // The problem: clicking through a site without finding the answer.
  pageIn: 0.25,
  clicks: [1.35, 2.15, 2.95],
  lost: 3.75,
  pageOut: 4.7,

  // CraCha
  logoIn: 5.35,
  tagline: 5.9,
  logoOut: 7.6,

  // URL
  input: 7.7,
  typeStart: 8.5,
  typeEnd: 9.4,
  press: 9.8,

  // Crawl, down to the deepest level
  root: 10.0,
  scan: 10.7,
  shrink: 11.7,
  tree: 12.35,
  converge: 15.55,

  // Chat
  chat: 18.4,
  askStart: 19.2,
  askEnd: 20.1,
  send: 20.4,
  search: 21.0,
  answer: 21.8,
  answerEnd: 23.1,
  sources: 23.25,
  highlight: 23.9,
  /** The chat steps back, only the first source stays. */
  focus: 24.5,
  /** The source opens into the page it came from. */
  source: 25.0,
  marker: 25.9,

  cta: 27.6,
  click: 29.2,
  outro: 30.0,
  end: 34,
};

export const SITE = "kundenwebsite.de";
