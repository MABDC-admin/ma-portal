import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyDllFn } from "@/lib/teacher.functions";

export const Route = createFileRoute("/_authenticated/_teacher/my-dlls/$id")({
  head: () => ({ meta: [{ title: "Lesson Log — AttendCloud" }] }),
  component: MyDllDetail,
});

function MyDllDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getMyDllFn);
  const q = useQuery({
    queryKey: ["my-dll", id],
    queryFn: () => getFn({ data: { id } }),
  });

  if (q.isLoading)
    return (
      <AppShell>
        <p className="text-tertiary">Loading…</p>
      </AppShell>
    );
  if (q.error || !q.data)
    return (
      <AppShell>
        <p className="text-status-absent">Not found or you don't have access.</p>
      </AppShell>
    );

  const d = q.data as typeof q.data & { sections: { name: string; grade_level: number } | null };
  const status = d.status as string;

  function duplicate() {
    // Stash prefill in sessionStorage; dll.new can pick it up
    try {
      sessionStorage.setItem(
        "dll:prefill",
        JSON.stringify({
          subject: d.subject,
          section_id: d.section_id,
          objectives: d.objectives,
          content: d.content,
          procedures: d.procedures,
          assessment: d.assessment,
        }),
      );
    } catch {
      /* noop */
    }
    navigate({ to: "/dll/new" });
  }

  return (
    <AppShell>
      <header className="mb-6">
        <Link
          to="/my-dlls"
          className="mb-3 flex items-center gap-1 text-sm text-tertiary hover:text-foreground"
        >
          <Icon name="arrow_back" size={16} /> Back to my lesson logs
        </Link>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-3xl font-extrabold">{d.subject}</h1>
            <p className="mt-1 text-sm text-tertiary num">
              Lesson date: {d.lesson_date}
              {d.sections?.name && <> · {d.sections.name}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {status === "returned" && (
              <button
                onClick={duplicate}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Icon name="content_copy" size={16} /> Revise as new draft
              </button>
            )}
          </div>
        </div>
      </header>

      {d.feedback && (status === "returned" || status === "approved") && (
        <Card
          className={`mb-6 p-5 ${status === "returned" ? "border border-status-absent/30 bg-status-absent/5" : "border border-status-present/30 bg-status-present/5"}`}
        >
          <div className="flex items-start gap-3">
            <Icon
              name={status === "returned" ? "assignment_return" : "check_circle"}
              filled
              className={status === "returned" ? "text-status-absent" : "text-status-present"}
            />
            <div className="flex-1">
              <p
                className={`text-xs font-bold uppercase tracking-widest ${status === "returned" ? "text-status-absent" : "text-status-present"}`}
              >
                Director's feedback
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{d.feedback}</p>
              {d.reviewed_at && (
                <p className="mt-2 text-xs text-tertiary num">
                  {new Date(d.reviewed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Learning Objectives" body={d.objectives} />
        <Section title="Content / Topics" body={d.content} />
        <Section title="Procedures / Activities" body={d.procedures} />
        <Section title="Assessment" body={d.assessment} />
      </div>
    </AppShell>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  return (
    <Card className="p-6">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {body || <em className="text-tertiary">Not provided.</em>}
      </p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "draft")
    return (
      <StatusPill tone="neutral" icon="edit">
        Draft
      </StatusPill>
    );
  if (status === "submitted")
    return (
      <StatusPill tone="late" icon="pending">
        Awaiting review
      </StatusPill>
    );
  if (status === "approved")
    return (
      <StatusPill tone="present" icon="check_circle">
        Approved
      </StatusPill>
    );
  if (status === "returned")
    return (
      <StatusPill tone="absent" icon="assignment_return">
        Returned
      </StatusPill>
    );
  return <StatusPill tone="neutral">{status}</StatusPill>;
}
