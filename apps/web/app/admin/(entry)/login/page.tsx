import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

/**
 * Sign-in, in the one admin route group the staff gate does not wrap.
 *
 * `(console)` holds the gated pages and `(entry)` holds this one. Both groups
 * are invisible in the URL, so the paths stay `/admin/...` while only one
 * side redirects signed-out visitors -- which is what stops the gate from
 * redirecting to a page that would redirect back to it.
 */
export default async function LoginPage() {
  // Already signed in as staff: nothing to do here.
  const user = await getStaffUser();
  if (user) redirect("/admin");

  return (
    <div className="login">
      {/* The board this company collects, as the ground the console sits on:
          traces routing to vias, drawn once at low contrast. It is the same
          motif as the marketing hero, but there it moves and argues -- here
          it is quiet, because an operator sees this screen every morning. */}
      <svg className="login-board" viewBox="0 0 800 600" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.25">
          <path d="M60 90 H240 L280 130 H430" />
          <path d="M60 190 H180 L230 240 H430" />
          <path d="M60 300 H300" />
          <path d="M60 410 H200 L250 360 H430" />
          <path d="M60 500 H260 L310 450 H430" />
          <path d="M740 120 H600 L560 160 H430" />
          <path d="M740 240 H520" />
          <path d="M740 360 H580 L540 400 H430" />
          <path d="M740 470 H620 L580 430" />
        </g>
        <g fill="currentColor">
          <circle cx="430" cy="130" r="3.5" />
          <circle cx="430" cy="240" r="3.5" />
          <circle cx="300" cy="300" r="3.5" />
          <circle cx="430" cy="360" r="3.5" />
          <circle cx="430" cy="450" r="3.5" />
          <circle cx="520" cy="240" r="3.5" />
          <circle cx="430" cy="160" r="3.5" />
          <circle cx="430" cy="400" r="3.5" />
        </g>
      </svg>

      <div className="login-card">
        <div className="login-brand">
          <span className="login-node" aria-hidden="true" />
          <h1 className="login-mark">Rebin Tech</h1>
        </div>
        <p className="login-sub">Operations console</p>

        <LoginForm />

        <p className="login-foot">
          Operator accounts are issued, not registered. Ask the platform owner
          if you need access.
        </p>
      </div>
    </div>
  );
}
