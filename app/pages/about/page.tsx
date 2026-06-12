import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  HeartPulse,
  Linkedin,
  ShieldCheck,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Confidential screening",
    description:
      "Confidex helps users begin health screening in a private, guided, and less intimidating way.",
  },
  {
    icon: ClipboardCheck,
    title: "Guided self-service flow",
    description:
      "The booth supports login, payment, kit dispensing, result capture, and receipt access in one smooth process.",
  },
  {
    icon: HeartPulse,
    title: "Consultation-ready results",
    description:
      "Results are organized so users can discuss their screening records more clearly with medical professionals.",
  },
];

const goals = [
  "Make preliminary blood-based screening more approachable and easier to follow.",
  "Support confidential, code-based access to user records.",
  "Connect kiosk transactions, kit dispensing, result history, and admin monitoring in one system.",
  "Encourage users to seek proper medical consultation after receiving their screening result.",
];

const team = [
  {
    name: "Kimberly Shane B. Belledo",
    role: "Lead Researcher / Project Manager",
    image: "/team/Shane.jpg",
    imagePosition: "center top",
    description:
      "Leads project coordination, procurement planning, budget tracking, material management, and overall system integration. She ensures that the team’s technical, operational, and resource requirements stay aligned throughout the development of Confidex.",
    linkedin: "https://www.linkedin.com/in/kimberly-shane-belledo-aaa240306/",
  },
  {
    name: "Micaella Erlyne Chelsen R. Compañero",
    role: "Technical Researcher / Compliance Officer",
    image: "/team/Chelsen.png",
    imagePosition: "center top",
    description:
      "Handles technical documentation, research direction, and compliance review. She studies applicable solutions, health-screening requirements, system limitations, and best practices to strengthen the project’s reliability and relevance.",
    linkedin:
      "https://www.linkedin.com/in/micaella-erlyne-chelsen-compa%C3%B1ero-7799693b5/",
  },
  {
    name: "Christian Angelo Palebino",
    role: "Lead Software Engineer / Lead System Architect",
    image: "/team/Angelo.jpg",
    imagePosition: "center top",
    description:
      "Leads full-stack development, system architecture, database design, image-processing decisions, and software integration. He spearheads the selection of technologies, tools, and implementation strategies used across the booth and web platforms.",
    linkedin:
      "https://www.linkedin.com/in/christian-angelo-palebino-436865306/",
  },
  {
    name: "Mark Clein S. Toriano",
    role: "Frontend Developer / Mechanical and Structural Designer",
    image: "/team/Clein.jpg",
    imagePosition: "center top",
    description:
      "Designs the booth’s physical structure, material layout, and mechanical presentation. He uses 3D models to visualize the system, refine the booth form, and ensure that the design supports usability, accessibility, and component placement.",
    linkedin: "https://www.linkedin.com/in/mark-clein-toriano-4b3023306/",
  },
];

export default function AboutPage() {
  return (
    <section className="relative min-h-[calc(100svh-var(--navbar-height)-var(--footer-height))] overflow-hidden bg-background pt-[calc(var(--navbar-height)+1.25rem)] pb-[calc(var(--footer-height)+1.25rem)] sm:pt-[calc(var(--navbar-height)+2rem)] sm:pb-[calc(var(--footer-height)+2rem)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(196,106,42,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(36,87,165,0.10),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(244,211,94,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(238,150,75,0.10),transparent_32%)]" />

      <div className="confidex-container space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="confidex-card relative overflow-hidden bg-card p-5 sm:p-6 md:p-8 lg:p-10">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm sm:px-4">
              <span className="truncate text-xs font-black uppercase tracking-[0.18em] text-primary sm:text-sm md:text-base md:tracking-[0.22em]">
                About Confidex
              </span>
            </div>

            <div className="mt-6 max-w-3xl space-y-4 sm:mt-8 sm:space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary sm:text-sm sm:tracking-[0.3em]">
                Confidential health screening booth
              </p>

              <h1 className="text-4xl font-black leading-[1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Private screening, clearer next steps.
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8 md:text-lg">
                Confidex is a vending-based self-service booth designed to help
                users access blood-based health screening kits in a private,
                guided, and organized way. The system combines a custom kiosk
                interface, kit dispenser, custom-built coin change dispenser,
                image processing, user record access, and admin monitoring.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="rounded-2xl px-6 font-bold">
                <Link href="/pages/contact">
                  Contact the team
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="confidex-card flex flex-col overflow-hidden bg-card text-card-foreground">
            <div className="border-b-2 border-border p-5 sm:p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:size-12">
                  <Target className="size-5 sm:size-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:tracking-[0.24em]">
                    Purpose and goal
                  </p>
                  <h2 className="text-xl font-black sm:text-2xl">
                    Why it exists
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6 md:p-8">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                Confidex does not replace professional diagnosis. Its purpose is
                to make preliminary screening easier to access, easier to
                follow, and easier to discuss with qualified medical
                professionals.
              </p>

              <div className="grid gap-3">
                {goals.map((goal) => (
                  <div
                    key={goal}
                    className="flex gap-3 rounded-2xl border border-border bg-background p-4"
                  >
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      {goal}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="confidex-card flex h-full flex-col bg-card p-5 sm:p-6"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border-2 border-border bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </div>

                <h3 className="text-lg font-black text-foreground sm:text-xl">
                  {item.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="confidex-card overflow-hidden bg-card">
          <div className="border-b-2 border-border p-5 sm:p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary sm:text-sm sm:tracking-[0.28em]">
              The team behind Confidex
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Built by a multidisciplinary team
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Each member contributes a focused role across research,
              documentation, software engineering, system architecture,
              procurement, and physical booth design.
            </p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16.5rem),1fr))] gap-5 p-5 sm:p-6 md:p-8">
            {team.map((member) => (
              <article
                key={member.name}
                className="group flex min-h-full flex-col overflow-hidden rounded-[24px] border-2 border-border bg-background transition duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl sm:rounded-[26px]"
              >
                <div className="relative h-[clamp(18rem,36vw,24rem)] overflow-hidden bg-muted">
                  <Image
                    src={member.image}
                    alt={`${member.name} profile photo`}
                    fill
                    sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    style={{ objectPosition: member.imagePosition }}
                    priority={false}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 pt-20 sm:p-5 sm:pt-24">
                    <h3 className="max-w-full pr-14 text-base font-black leading-tight text-white drop-shadow-sm sm:pr-16 sm:text-lg lg:text-xl">
                      {member.name}
                    </h3>
                  </div>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${member.name} LinkedIn profile`}
                    className="absolute bottom-4 right-4 flex size-10 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md transition hover:bg-primary hover:text-primary-foreground sm:bottom-5 sm:right-5 sm:size-11"
                  >
                    <Linkedin className="size-5" />
                  </a>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm font-black leading-6 text-primary">
                    {member.role}
                  </p>

                  <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">
                    {member.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
