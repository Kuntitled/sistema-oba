import type { PartRow } from "@/types/domain";

export function normalizePartQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactPartText(value: string): string {
  return normalizePartQuery(value).replace(/[^a-z0-9]/g, "");
}

export function partMatchesQuery(
  part: Pick<PartRow, "name" | "aliases" | "line">,
  query: string
): boolean {
  const normalized = normalizePartQuery(query);
  if (!normalized) return true;

  const compactQuery = compactPartText(normalized);
  const candidates = [part.name, ...(part.aliases ?? []), part.line].filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0
  );

  return candidates.some((candidate) => {
    const normCandidate = normalizePartQuery(candidate);
    if (normCandidate.includes(normalized)) return true;
    if (compactQuery.length >= 2) {
      return compactPartText(candidate).includes(compactQuery);
    }
    return false;
  });
}
