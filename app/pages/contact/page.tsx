"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  OctagonAlert,
  Phone,
  Send,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const contactCards = [
  {
    icon: Mail,
    title: "Email",
    value: "confidex.ph@gmail.com",
    helper: "For booth support, inquiries, and coordination.",
    wide: false,
  },
  {
    icon: Phone,
    title: "Phone",
    value: "+63 993 450 2304",
    helper: "Available for urgent project-related concerns.",
    wide: false,
  },
  {
    icon: MapPin,
    title: "Location",
    value: "National University Fairview",
    helper:
      "SM City Fairview Complex, Quirino Highway corner Regalado Avenue, Greater Lagro, Quezon City 1100.",
    wide: true,
  },
];

const medicalContacts = [
  {
    icon: Building2,
    title: "Partner Clinic / Testing Facility",
    name: "Facility Name Placeholder",
    details:
      "Add address, contact number, email, and available consultation schedule.",
  },
  {
    icon: Stethoscope,
    title: "Medical Professional",
    name: "Doctor / Counselor Name Placeholder",
    details:
      "Add specialization, appointment availability, and consultation details.",
  },
  {
    icon: HeartHandshake,
    title: "Community Health Center",
    name: "Barangay / City Health Office Placeholder",
    details:
      "Add local counseling, referral, and public health support information.",
  },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  concern: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  concern: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setStatusMessage("");
    setStatusType("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to send message.");
      }

      setStatusType("success");
      setStatusMessage(data.message || "Your message has been sent.");
      setForm(initialForm);
    } catch (error) {
      setStatusType("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while sending your message.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative min-h-[calc(100svh-var(--navbar-height)-var(--footer-height))] overflow-hidden bg-background pt-[calc(var(--navbar-height)+1.25rem)] pb-[calc(var(--footer-height)+1.25rem)] sm:pt-[calc(var(--navbar-height)+2rem)] sm:pb-[calc(var(--footer-height)+2rem)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(196,106,42,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(36,87,165,0.12),transparent_30%)]" />

      <div className="confidex-container space-y-5 sm:space-y-6">
        <div className="confidex-card overflow-hidden bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between gap-6 border-b-2 border-border bg-black p-5 text-white sm:p-6 md:p-8 lg:border-b-0 lg:border-r-2 lg:p-10">
              <div className="space-y-5">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75 sm:px-4 sm:tracking-[0.22em]">
                  <ShieldCheck className="size-4 shrink-0 text-primary" />
                  <span className="truncate">Contact Confidex</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                    Need help or consultation guidance?
                  </h1>

                  <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8 md:text-lg">
                    Reach out for Confidex support, booth-related concerns, or
                    guidance on where users can seek further medical
                    consultation after using the screening service.
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/15 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <OctagonAlert className="size-5" />
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                      Important note
                    </p>

                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Confidex is for screening support only. Users should
                      consult a qualified medical professional or accredited
                      facility for proper diagnosis, confirmation, counseling,
                      and treatment advice.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 md:p-8 lg:p-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {contactCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className={[
                        "flex min-h-full flex-col rounded-[24px] border-2 border-border bg-background p-5",
                        item.wide ? "sm:col-span-2" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="mb-4 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>

                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {item.title}
                      </p>

                      <p className="mt-2 break-words text-lg font-black leading-tight text-foreground sm:text-xl">
                        {item.value}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {item.helper}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_0.88fr] lg:items-stretch">
          <div
            id="contact-form"
            className="confidex-card flex min-h-full scroll-mt-28 flex-col bg-card p-5 sm:p-6 md:p-8"
          >
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary sm:text-sm sm:tracking-[0.28em]">
                  Send a message
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl">
                  Contact Us
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Juan Dela Cruz"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="juan@example.com"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Contact number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+63 900 000 0000"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concern">Concern type</Label>
                  <Input
                    id="concern"
                    name="concern"
                    placeholder="Booth support, consultation, partnership..."
                    value={form.concern}
                    onChange={(event) =>
                      updateField("concern", event.target.value)
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-1 flex-col space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={(event) =>
                    updateField("message", event.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  className="min-h-[220px] flex-1 resize-none rounded-2xl border-2 bg-background px-4 py-3"
                />
              </div>

              {statusMessage ? (
                <div
                  className={[
                    "mt-4 rounded-2xl border-2 p-4 text-sm font-semibold",
                    statusType === "success"
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {statusMessage}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 border-t-2 border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  We will review your message and respond through your provided
                  contact details.
                </p>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl px-6 font-bold sm:w-auto cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      Sending
                      <Loader2 className="size-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Send message
                      <Send className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          <aside className="flex min-h-full flex-col gap-5">
            <div className="confidex-card flex flex-1 flex-col bg-card p-5 sm:p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <UserCheck className="size-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary sm:tracking-[0.22em]">
                    Consultation directory
                  </p>

                  <h2 className="text-2xl font-black text-foreground">
                    Medical contacts
                  </h2>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {medicalContacts.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="flex flex-1 rounded-[22px] border-2 border-border bg-background p-4"
                    >
                      <div className="flex gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            {item.title}
                          </p>

                          <h3 className="mt-1 text-base font-black leading-tight text-foreground">
                            {item.name}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.details}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="confidex-card overflow-hidden bg-primary text-primary-foreground">
              <div className="p-5 sm:p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15 text-primary-foreground">
                    <HeartHandshake className="size-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
                      Partnerships
                    </p>

                    <h2 className="mt-2 text-2xl font-black leading-tight">
                      Work with Confidex
                    </h2>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-primary-foreground/80">
                  For schools, clinics, facilities, or health organizations
                  interested in collaboration, deployment, consultation support,
                  or future validation, please send us a message through the
                  contact form.
                </p>

                <div className="mt-6 grid gap-3 text-sm text-primary-foreground/85">
                  <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                    Booth deployment inquiries
                  </div>

                  <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                    Clinic or facility coordination
                  </div>

                  <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                    Consultation and referral support
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
