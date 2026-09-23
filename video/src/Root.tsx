import { Composition } from "remotion";
import { Promo } from "./Promo";
import { DURATION_S, FPS, HEIGHT, WIDTH } from "./theme";

export const Root: React.FC = () => (
  <Composition
    id="CraChaPromo"
    component={Promo}
    durationInFrames={DURATION_S * FPS}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
