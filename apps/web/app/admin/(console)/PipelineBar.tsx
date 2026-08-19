import Link from "next/link";
import { PIPELINE, STATUS_LABEL, toneFor } from "@/lib/transitions";
import type { RequestStatus } from "@/lib/supabase/types";

/**
 * Where the open work is sitting.
 *
 * Deliberately not a chart of requests over time. Every request in this
 * database was filed in one month, so a time series would draw a single spike
 * and teach an operator nothing -- and a dashboard whose graph says nothing is
 * one people stop looking at.
 *
 * What an operator actually asks each morning is "where is everything stuck",
 * and that is a distribution across a fixed, ordered set of stages. A bar in
 * pipeline order answers it in one glance: a wide segment early in the line is
 * a backlog, a wide one late is a fleet problem. The tiles above already give
 * the exact counts, so this trades precision for shape, which is the one thing
 * a column of numbers cannot show.
 *
 * Completed and cancelled are excluded: they are history, and including them
 * would let finished work visually crowd out the work that still needs doing.
 */
export function PipelineBar({
  byStatus,
}: {
  byStatus: Map<RequestStatus, number>;
}) {
  const stages = PIPELINE.filter((s) => s !== "completed").map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }));

  const total = stages.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  return (
    <div className="panel" style={{ marginBottom: "1.75rem" }}>
      <h2 className="panel-title">Where the open work is</h2>

      <div className="pipe-bar">
        {stages
          .filter((s) => s.count > 0)
          .map(({ status, count }) => (
            <Link
              key={status}
              href={`/admin/requests?status=${status}`}
              className="pipe-seg"
              data-tone={toneFor(status)}
              // Percentage rather than flex-grow so a stage holding one of
              // twelve requests is visibly one twelfth, not an equal share.
              style={{ width: `${(count / total) * 100}%` }}
              title={`${count} ${STATUS_LABEL[status].toLowerCase()}`}
            >
              <span className="pipe-seg-count">{count}</span>
            </Link>
          ))}
      </div>

      <div className="pipe-key">
        {stages
          .filter((s) => s.count > 0)
          .map(({ status, count }) => (
            <span key={status} className="pipe-key-item">
              <span className="pipe-key-dot" data-tone={toneFor(status)} />
              {STATUS_LABEL[status]}
              <span className="pipe-key-n">{count}</span>
            </span>
          ))}
      </div>
    </div>
  );
}
