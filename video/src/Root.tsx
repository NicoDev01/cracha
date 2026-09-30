import { Composition } from "remotion";
import { Ad } from "./ad/Ad";
import adCues from "./ad/cues.json";
import { Explainer } from "./explainer/Explainer";
import explainerCues from "./explainer/cues.json";
import { Film15 } from "./film15/Film15";
import cues from "./film15/cues.json";
import { Promo } from "./Promo";
import { Spot } from "./spot/Spot";
import spotCues from "./spot/cues.json";
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
      durationInFrames={Math.round(explainerCues.duration * FPS)}
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
    <Composition
      id="CraChaAd"
      component={Ad}
      durationInFrames={adCues.duration * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="CraChaSpot"
      component={Spot}
      durationInFrames={spotCues.duration * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
