import { getSeasonsWithStats } from "@/lib/services/league";
import { SeasonManagerClient } from "@/components/admin/SeasonManagerClient";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";

export default async function AdminTemporadasPage() {
  const { seasons, schemaMissing } = await getSeasonsWithStats();

  if (schemaMissing) {
    return <Phase2SchemaNotice backHref="/admin" />;
  }

  return <SeasonManagerClient initialSeasons={seasons} />;
}
