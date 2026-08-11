// "use client";

// import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
// import MetaBalls from "@/components/ui/MetaBalls";

// export default function PreviewLanding() {
//   return (
//     <div className="pb-6 sm:pb-16">
//       <MaxWidthWrapper>
//         <div className="relative aspect-video">
//           <MetaBalls
//             color="#000000"
//             cursorBallColor="#000000"
//             cursorBallSize={2}
//             ballCount={15}
//             animationSize={30}
//             enableMouseInteraction={true}
//             enableTransparency={true}
//             hoverSmoothness={0.05}
//             clumpFactor={1}
//             speed={0.3}
//           />
//         </div>
//       </MaxWidthWrapper>
//     </div>
//   );
// }

"use client";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import ImaginationCanvas from "@/components/ui/ImaginationCanvas";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";
import Link from "next/link";
import { Icons } from "@/components/shared/icons";

export default function CanvasSection() {
  return (
    <>
      {/* Desktop Version mit Canvas */}
      <div id="canvas-section" className="hidden md:block pb-16 pt-37 sm:pb-24 overflow-hidden">
        <MaxWidthWrapper>
          <div className="relative h-[42vh] w-full overflow-hidden">
            <ImaginationCanvas />
          </div>
          <div className="flex flex-col items-center gap-7 text-center">
            <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
              Mach jede Website zu <br /> deinem{" "}
              <span className="text-gradient_indigo-purple">persönlichen Chatbot</span>
            </h2>
            <Link href="/login" prefetch={true}>
              <RainbowButton className="gap-2">
                <span>Jetzt loslegen</span>
                <Icons.arrowRight className="size-4" />
              </RainbowButton>
            </Link>
          </div>
        </MaxWidthWrapper>
      </div>

      {/* Mobile Version nur mit Text und Button */}
      <div className="block md:hidden pb-16 pt-8 px-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto">
          <h2 className="font-heading text-2xl leading-tight text-foreground">
            Verwandle das Internet in <br /> deinen{" "}
            <span className="text-gradient_indigo-purple">persönlichen Chatbot</span>
          </h2>
          <Link href="/login" prefetch={true}>
            <RainbowButton className="gap-2">
              <span>Jetzt loslegen</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </Link>
        </div>
      </div>
    </>
  );
}