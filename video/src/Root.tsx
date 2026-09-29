import { Composition } from "remotion";
import { Explainer } from "./explainer/Explainer";
import { E } from "./explainer/timeline";
import { Film15 } from "./film15/Film15";
import cues from "./film15/cues.json";
import { Promo } from "./Promo";
import { DURATION_S, FPS, HEIGHT, WIDTH } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition
      id="CraChaPromo"
      component={Promo}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="CraChaExplainer"
      component={Explainer}
      durationInFrames={E.end * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="CraCha15"
      component={Film15}
      durationInFrames={cues.duration * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
