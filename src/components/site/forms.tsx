"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitApplication, submitLead, type FormState } from "@/app/actions/public";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false, message: "" };

const fieldBase =
  "w-full border-0 border-b border-ink bg-transparent px-0 py-3 text-lg font-normal text-ink placeholder:text-subtle focus:border-accent focus:ring-0 focus:outline-none";

function Field({
  label,
  name,
  type = "text",
  required,
  error,
  autoComplete,
  className,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  className?: string;
  defaultValue?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-accent-ink"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(fieldBase, error && "border-accent-ink")}
      />
      {error && <p id={`${id}-err`} className="text-sm text-accent-ink">{error}</p>}
    </div>
  );
}

function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input tabIndex={-1} autoComplete="off" name="company_website" />
      </label>
    </div>
  );
}

function Status({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        "border-l-[3px] py-2 pl-4 text-base",
        state.ok ? "border-accent text-ink" : "border-accent-ink text-accent-ink",
      )}
    >
      {state.message}
    </p>
  );
}

export function LeadForm({
  services,
  defaultService,
  source = "contact",
  dark = false,
}: {
  services: string[];
  defaultService?: string;
  source?: string;
  dark?: boolean;
}) {
  const [state, action, pending] = useActionState(submitLead, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form ref={ref} action={action} className={cn("relative grid gap-x-8 gap-y-9 sm:grid-cols-2", dark && "text-white")} noValidate>
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      <Field label="Full name" name="name" required autoComplete="name" error={e.name} defaultValue={v.name} />
      <Field label="Organisation" name="organisation" autoComplete="organization" error={e.organisation} defaultValue={v.organisation} />
      <Field label="Work email" name="email" type="email" required autoComplete="email" error={e.email} defaultValue={v.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" error={e.phone} defaultValue={v.phone} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor="f-service" className="text-sm font-semibold">Area of interest</label>
        <select id="f-service" name="service" defaultValue={v.service ?? defaultService ?? ""} className={cn(fieldBase, "cursor-pointer")}>
          <option value="">Choose one…</option>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="Other">Something else</option>
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor="f-message" className="text-sm font-semibold">
          How can we help?<span className="text-accent-ink"> *</span>
        </label>
        <textarea
          id="f-message"
          name="message"
          rows={4}
          required
          defaultValue={v.message}
          aria-invalid={!!e.message}
          aria-describedby={e.message ? "f-message-err" : undefined}
          className={cn(fieldBase, "resize-y")}
        />
        {e.message && <p id="f-message-err" className="text-sm text-accent-ink">{e.message}</p>}
      </div>
      <div className="flex flex-col gap-5 sm:col-span-2">
        <Status state={state} />
        <button type="submit" disabled={pending} className="btn-ink self-start disabled:opacity-60">
          {pending ? "Sending…" : "Send enquiry"} <ArrowRight className="text-accent" />
        </button>
        <p className="text-sm text-subtle">We reply within one working day. Your details are used only to respond to you.</p>
      </div>
    </form>
  );
}

export function ApplicationForm({ jobId }: { jobId?: number }) {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form ref={ref} action={action} className="relative grid gap-x-8 gap-y-9 sm:grid-cols-2" noValidate>
      <Honeypot />
      {jobId && <input type="hidden" name="jobId" value={jobId} />}
      <Field label="Full name" name="name" required autoComplete="name" error={e.name} defaultValue={v.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={e.email} defaultValue={v.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" error={e.phone} defaultValue={v.phone} className="sm:col-span-2" />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor="f-cv" className="text-sm font-semibold">
          CV (PDF or Word, max 8 MB)<span className="text-accent-ink"> *</span>
        </label>
        <input
          id="f-cv"
          name="cv"
          type="file"
          required
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-invalid={!!e.cv}
          className="block w-full border border-line bg-white p-3 text-base file:mr-4 file:border-0 file:bg-ink file:px-4 file:py-2.5 file:font-semibold file:text-white"
        />
        {e.cv && <p className="text-sm text-accent-ink">{e.cv}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor="f-cover" className="text-sm font-semibold">Why Tech Bucket? (optional)</label>
        <textarea id="f-cover" name="coverLetter" rows={4} defaultValue={v.coverLetter} className={cn(fieldBase, "resize-y")} />
      </div>
      <div className="flex flex-col gap-5 sm:col-span-2">
        <Status state={state} />
        <button type="submit" disabled={pending} className="btn-ink self-start disabled:opacity-60">
          {pending ? "Uploading…" : "Submit application"} <ArrowRight className="text-accent" />
        </button>
      </div>
    </form>
  );
}
