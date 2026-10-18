// Renders the share images for the landing and marketing pages, one per
// language, into public/og/. Run after a headline change:
//   node scripts/render-og-images.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';

const font = (file) => readFile(new URL(`../src/assets/fonts/${file}`, import.meta.url));
const fonts = [
  { name: 'Cal Sans', data: await font('CalSans-SemiBold.ttf'), weight: 600 },
  { name: 'Inter', data: await font('Inter-Bold.ttf'), weight: 700 },
  { name: 'Inter', data: await font('Inter-Regular.ttf'), weight: 400 },
];

const copy = {
  de: ['Frag nicht das Internet.', 'Frag die Website.', 'CraCha liest Websites bis in die letzte Unterseite und beantwortet deine Fragen mit Quellen.'],
  en: ['Don’t ask the internet.', 'Ask the website.', 'CraCha reads a website down to the last subpage and answers your questions with sources.'],
};

await mkdir(new URL('../public/og/', import.meta.url), { recursive: true });
for (const [locale, [first, second, subline]] of Object.entries(copy)) {
  const image = h(
    'div',
    {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '80px 90px', color: '#fff', fontFamily: 'Inter',
        backgroundColor: '#0d0b14',
        backgroundImage: 'radial-gradient(ellipse 70% 70% at 85% 10%, rgba(91, 52, 160, 0.55), transparent 70%)',
        borderBottom: '6px solid #8b7cf6',
      },
    },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      h('span', { style: { fontFamily: 'Cal Sans', fontSize: 72 } }, 'CraCha'),
      h('span', { style: { fontSize: 26, color: '#9b97ab' } }, 'cracha-app.com')),
    h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('span', { style: { fontSize: 66, fontWeight: 700, lineHeight: 1.15 } }, first),
      h('span', { style: { fontSize: 66, fontWeight: 700, lineHeight: 1.15, color: '#a99cff' } }, second),
      h('span', { style: { marginTop: 28, fontSize: 28, color: '#b9b5c8', lineHeight: 1.4 } }, subline)),
  );
  const png = Buffer.from(await new ImageResponse(image, { width: 1200, height: 630, fonts }).arrayBuffer());
  await writeFile(new URL(`../public/og/cracha-${locale}.png`, import.meta.url), png);
  console.log(`public/og/cracha-${locale}.png`, png.length, 'bytes');
}
