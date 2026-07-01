// The vanity domains a member can claim their handle under. kirari.cafe is the
// house domain; the rest are the "premium" set shown on the landing + signup.
// A page always lives at kirari.cafe/@handle under the hood — the domain is the
// label the member picks to brand their link.
export interface DomainDef {
  id: string;
  label: string;
  vibe: string;
  premium?: boolean; // shown with a crown; reserved / coming soon
}

export const DOMAINS: DomainDef[] = [
  { id: "kirari.cafe", label: "kirari.cafe", vibe: "the house domain" },
  { id: "prey.lol", label: "prey.lol", vibe: "sharp + short" },
  { id: "pouty.lol", label: "pouty.lol", vibe: "soft + bratty" },
  { id: "ribbon.lol", label: "ribbon.lol", vibe: "dainty + cute" },
  { id: "twig.lol", label: "twig.lol", vibe: "quiet + minimal" },
  { id: "seraph.cash", label: "seraph.cash", vibe: "reserved", premium: true },
  { id: "moth.rip", label: "moth.rip", vibe: "reserved", premium: true },
];

export const DEFAULT_DOMAIN = "prey.lol";

export function domainLabel(id?: string): string {
  return DOMAINS.find((d) => d.id === id)?.label || id || "kirari.cafe";
}
