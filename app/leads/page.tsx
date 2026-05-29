import LeadsClient from "./LeadsClient";

export default function LeadsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const followupOnly = searchParams?.followup === "today";
  const status = typeof searchParams?.status === "string" ? searchParams.status : "";

  return <LeadsClient initialStatus={status} initialFollowupOnly={followupOnly} />;
}

