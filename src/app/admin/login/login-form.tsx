"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  const input = "w-full border border-line px-3 py-3 text-base focus:border-ink focus:outline-none";
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} key={state.email ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      {state.error && (
        <p role="alert" className="border-l-[3px] border-accent-ink bg-accent-wash px-3 py-2 text-sm text-accent-ink">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center bg-ink font-semibold text-white hover:bg-charcoal disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
