import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE, STATUS_LABEL } from "@/lib/transitions";
import { StatusDot, When } from "../../../ui";
import { RequestActions } from "./RequestActions";
import { PageIn } from "../../../Motion";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("pickup_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <>
        <Link href="/admin/requests" className="back">
          ← Requests
        </Link>
        <p className="notice">Could not load this request: {error.message}</p>
      </>
    );
  }

  if (!request) notFound();

  const [{ data: org }, { data: assignment }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, city, state, org_type")
      .eq("id", request.org_id)
      .maybeSingle(),
    supabase
      .from("job_assignments")
      .select("status, agent_id, claimed_at, actual_units")
      .eq("request_id", id)
      .neq("status", "cancelled")
      .maybeSingle(),
  ]);

  const currentIndex = PIPELINE.indexOf(request.status);
  const cancelled = request.status === "cancelled";

  return (
    <PageIn>
      <Link href="/admin/requests" className="back">
        ← Requests
      </Link>

      <div className="admin-head">
        <h1 className="admin-h1">{request.dock_address}</h1>
        <StatusDot status={request.status} />
      </div>

      {/* The pipeline the database enforces, drawn. A cancelled request is not
          somewhere along it, so it gets a sentence instead of a position. */}
      {cancelled ? (
        <p className="rail-stopped">
          This request was cancelled. It cannot be moved again.
        </p>
      ) : (
        <ol className="rail">
          {PIPELINE.map((stage, i) => (
            <li
              key={stage}
              className="rail-stop"
              data-passed={i <= currentIndex}
              data-current={i === currentIndex}
            >
              <span className="rail-dot" />
              <span className="rail-label">{STATUS_LABEL[stage]}</span>
            </li>
          ))}
        </ol>
      )}

      <RequestActions requestId={request.id} status={request.status} />

      <div className="panel">
        <h2 className="panel-title">Collection</h2>
        <dl className="facts">
          <div className="fact">
            <dt>Organization</dt>
            <dd>{org?.name ?? "—"}</dd>
          </div>
          <div className="fact">
            <dt>Location</dt>
            <dd>{org ? `${org.city}, ${org.state}` : "—"}</dd>
          </div>
          <div className="fact">
            <dt>Units booked</dt>
            <dd className="mono">{request.unit_count}</dd>
          </div>
          <div className="fact">
            <dt>Size tier</dt>
            <dd className="mono">{request.size_tier.replace("tier_", "").replace(/_/g, "–")}</dd>
          </div>
          <div className="fact">
            <dt>Window opens</dt>
            <dd className="mono">
              <When value={request.window_start} />
            </dd>
          </div>
          <div className="fact">
            <dt>Window closes</dt>
            <dd className="mono">
              <When value={request.window_end} />
            </dd>
          </div>
          <div className="fact">
            <dt>Timezone</dt>
            <dd className="mono">{request.timezone}</dd>
          </div>
          <div className="fact">
            <dt>Categories</dt>
            <dd>{request.categories.map((c) => c.replace(/_/g, " ")).join(", ") || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="panel">
        <h2 className="panel-title">On site</h2>
        <dl className="facts">
          <div className="fact">
            <dt>Contact</dt>
            <dd>{request.on_site_contact_name}</dd>
          </div>
          <div className="fact">
            <dt>Phone</dt>
            <dd className="mono">{request.on_site_contact_phone}</dd>
          </div>
          <div className="fact">
            <dt>Instructions</dt>
            <dd>{request.instructions || "None given"}</dd>
          </div>
        </dl>
      </div>

      {assignment && (
        <div className="panel">
          <h2 className="panel-title">Assigned agent</h2>
          <dl className="facts">
            <div className="fact">
              <dt>Job status</dt>
              <dd className="mono">{assignment.status.replace(/_/g, " ")}</dd>
            </div>
            <div className="fact">
              <dt>Claimed</dt>
              <dd>
                <When value={assignment.claimed_at} />
              </dd>
            </div>
            <div className="fact">
              <dt>Units found</dt>
              <dd className="mono">{assignment.actual_units ?? "—"}</dd>
            </div>
          </dl>
        </div>
      )}
    </PageIn>
  );
}
