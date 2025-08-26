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

// "use client";

// import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
// import ImaginationCanvas from "@/components/ui/ImaginationCanvas";

// export default function PreviewLanding() {
//   return (
//     <div className="hidden md:block pb-6 sm:pb-16 pt-4">
//       <MaxWidthWrapper>
//         <div className="relative h-[42vh] w-full">
//           <ImaginationCanvas />
//         </div>
//       </MaxWidthWrapper>
//     </div>
//   );
// }



"use client";

import Image from "next/image";

export default function PreviewLanding() {
  return (
    <div className="mx-auto max-w-7xl mb-3 [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
      <div className="[perspective:1200px] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
        <div className="[transform:rotateX(20deg);]">
          <div className="lg:h-[44rem] relative skew-x-[.36rad] overflow-hidden rounded-3xl [mask-image:linear-gradient(to_right,black_30%,transparent_100%)]">
            <Image
              className="z-[2] relative dark:hidden transition-opacity"
              src="/images/hero/Screenshot 2025-08-23 182239.png"
              alt="Tailark hero section"
              width={2880}
              height={2074}
              priority
              onLoadingComplete={(image) => {
                setTimeout(() => {
                  image.classList.remove("opacity-0");
                }, 300); // 300ms Verzögerung
              }}
            />
            <Image
              className="z-[2] relative hidden dark:block transition-opacity"
              src="/images/hero/Screenshot 2025-08-23 191201.png"
              alt="Tailark hero section"
              width={2880}
              height={2074}
              priority
              onLoadingComplete={(image) => {
                setTimeout(() => {
                  image.classList.remove("opacity-0");
                }, 300); // 300ms Verzögerung
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}