// Every beat of the film in seconds, so scenes that hand an element to each
// other stay in sync when one beat moves.
export const T = {
  dot: 0.15,
  pill: 0.85,
  logoIn: 1.1,
  tagline: 1.95,
  logoOut: 3.85,

  input: 3.9,
  typeStart: 4.7,
  typeEnd: 5.6,
  press: 5.9,
  root: 6.1,
  scan: 6.8,
  shrink: 8.35,
  tree: 9.0,
  counted: 11.7,
  converge: 12.3,

  db: 12.5,
  multi: 15.9,
  multiBack: 18.0,

  chat: 18.6,
  askStart: 19.55,
  askEnd: 20.45,
  send: 20.75,
  search: 21.4,
  answer: 22.5,
  answerEnd: 24.1,
  sources: 24.3,
  highlight: 25.2,

  cta: 26.6,
  click: 28.25,
  outro: 29.05,
  end: 33,
};

/** Pages found on the crawled site; the database and chat quote the same number. */
export const PAGES = 1248;
export const SITE = "deine-website.de";
