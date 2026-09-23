import { AbsoluteFill } from "remotion";
import { Background } from "./Background";
import { Caption, Words, words } from "./Caption";
import { MorphBox } from "./MorphBox";
import { Chat } from "./scenes/Chat";
import { Crawl } from "./scenes/Crawl";
import { Cursor, Url } from "./scenes/Cta";
import { Knowledge } from "./scenes/Knowledge";
import { CX } from "./theme";
import { T } from "./timeline";

const Tagline: React.FC<{ start: number; end: number; y: number }> = ({ start, end, y }) => (
  <div style={{ position: "absolute", top: y, left: CX - 800, width: 1600 }}>
    <Words words={words("Crawlen. Indexieren. *Chatten.*")} start={start} end={end} size={84} stagger={0.14} />
  </div>
);

export const Promo: React.FC = () => (
  <AbsoluteFill>
    <Background />

    <Tagline start={T.tagline + 0.2} end={T.logoOut} y={600} />

    <Caption title="CraCha crawlt sich durch *jede Website*" start={T.input + 0.2} end={T.converge} />
    <Caption title="CraCha generiert dir automatisch *deine Wissensbasis*" start={T.converge + 0.25} end={T.multi} />
    <Caption title="Beliebig viele *Wissensbasen*" start={T.multi + 0.2} end={T.multiBack + 0.4} />
    <Caption
      title="Chatte mit dem *gesamten Wissen* | der Website und aller Unterseiten"
      start={T.chat + 0.35}
      end={T.cta}
    />
    <Caption title="Starte jetzt mit *CraCha*" sub="100 Start-Credits gratis" start={T.cta + 0.4} end={T.outro + 0.1} y={300} />

    <Crawl />
    <Knowledge />
    <Chat />
    <MorphBox />
    <Cursor />

    <Tagline start={T.outro + 0.9} end={99} y={600} />
    <Url />
  </AbsoluteFill>
);
