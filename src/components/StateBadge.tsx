import type { FindingState } from "@/lib/domain/types";

export const STATE_LABEL: Record<FindingState, string> = {
  verified_accurate: "Accurate",
  incorrect: "Needs correction",
  not_found: "Not found",
  possible_match: "Possible match",
  unable_to_verify: "Could not verify",
  not_eligible: "Not applicable",
};

const STYLE: Record<FindingState, string> = {
  verified_accurate: "bg-ok/10 text-ok",
  incorrect: "bg-warn/10 text-warn",
  not_found: "bg-bad/10 text-bad",
  possible_match: "bg-warn/10 text-warn",
  unable_to_verify: "bg-neutral/10 text-neutral",
  not_eligible: "bg-neutral/10 text-neutral",
};

export function StateBadge({ state }: { state: FindingState }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[state]}`}>{STATE_LABEL[state]}</span>;
}
