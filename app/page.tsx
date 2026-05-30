import Image from "next/image";
import localFont from "next/font/local";

import HomeReadySignal from "@/components/common/home-ready-signal";

const horizon = localFont({
  src: "../public/fonts/Horizon/gc-horizon-1.otf",
});

export default function Home() {
  return (
    <section className="relative min-h-[calc(100svh)] overflow-hidden md:min-h-[calc(100svh)]">
      <Image
        src="/CONFIDEX.png"
        alt="confidex bg"
        fill
        priority
        sizes="100vw"
        className="
          object-cover
          object-[100%_center]
          sm:object-[100%_center]
          md:object-center
        "
      />

      <div className="relative z-10 flex min-h-[calc(100svh-5rem)] items-center justify-center px-4 py-8 sm:px-6 md:min-h-[calc(100svh-6rem)] md:px-8">
        <h1
          className={`${horizon.className} w-full max-w-[92vw] text-center text-[1.8rem] leading-tight font-bold text-[#EE964B] drop-shadow-[-1px_4px_2px_rgba(32,30,29,0.72)] sm:max-w-[85vw] sm:text-[2.5rem] md:max-w-[70vw] md:text-[4.5em] dark:text-[#F4D35E] dark:drop-shadow-[-1px_5px_1px_rgba(91,75,43,1)]`}
        >
          VENDING-BASED SELF-SERVICE BOOTH FOR ANONYMOUS BLOOD-BASED HEALTH
          SCREENING
        </h1>
      </div>

      <HomeReadySignal />
    </section>
  );
}
