import { InfoLdg } from "@/types";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import Image from "next/image";

export default function ProductShowcase() {
    const reverse = true;
    const data = {
        title: "Warum CraCha?",
        description: "Während Standard-KIs an der Oberfläche kratzen, taucht CraCha tief in Ihre Inhalte ein. Wir lesen jede einzelne Unterseite, extrahieren das Wesentliche und verwandeln unstrukturierte Daten in einen präzisen, dialogfähigen Wissens-Hub – damit Sie Antworten statt nur Links erhalten.",
        video: "/videos/animation.webm",
        list: []
    }

    return (
        <section className="py-16 md:py-24">
            <MaxWidthWrapper>
                <div className="grid gap-10 px-2.5 lg:grid-cols-2 lg:items-center lg:px-7">
                    <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>
                        <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
                           Warum <span className="text-gradient_indigo-purple">CraCha</span>?
                        </h2>
                        <p className="mt-4 text-base text-muted-foreground">
                            {data.description}
                        </p>
                    </div>
                    <div
                        className={cn(
                            "overflow-hidden rounded-xl border lg:-m-4",
                            reverse ? "order-1" : "order-2",
                        )}
                    >
                        <div className="aspect-video">
                            <video
                                className="size-full object-cover object-center"
                                src={data.video}
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        </div>
                    </div>
                </div>
            </MaxWidthWrapper>
        </section>
    );
}