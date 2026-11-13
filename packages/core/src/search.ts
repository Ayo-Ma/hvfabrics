import type { CatalogueProduct } from "./catalogue";
import { LINE_LABELS } from "./schemas";

/**
 * Custom search (PLAN.md): the index is rebuilt on publish, served from the edge,
 * and searched in the browser with typo tolerance and synonyms.
 */

/**
 * Synonym groups. Any term in a group matches the others.
 * PLAN.md examples: ankara = wax print, bra = lingerie.
 * Extend from the questions in her WhatsApp and Instagram DMs.
 */
export const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["ankara", "wax print", "wax"],
  ["lingerie", "bra"],
];

export interface SearchDoc {
  id: string;
  slug: string;
  title: string;
  line: CatalogueProduct["line"];
  /** Normalised tokens, title tokens first. */
  tokens: string[];
  titleTokens: number;
}

export interface SearchIndex {
  version: string;
  docs: SearchDoc[];
}

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenise(text: string): string[] {
  const n = normalise(text);
  return n ? n.split(" ") : [];
}

export function buildSearchIndex(products: readonly CatalogueProduct[], version: string): SearchIndex {
  return {
    version,
    docs: products.map((p) => {
      const titleTokens = tokenise(p.title);
      const rest = tokenise(
        [
          LINE_LABELS[p.line],
          p.attributes.fibre,
          ...p.variants.flatMap((v) => [v.colour, v.size]),
          p.description.slice(0, 400),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        line: p.line,
        tokens: [...titleTokens, ...rest],
        titleTokens: titleTokens.length,
      };
    }),
  };
}

/** Damerau–Levenshtein distance with an early exit once it exceeds `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[rows - 1]![cols - 1]!;
}

function allowedTypos(term: string): number {
  if (term.length >= 8) return 2;
  if (term.length >= 4) return 1;
  return 0;
}

/** Expands a query into alternative term lists, one per synonym match. */
function expandQuery(query: string): string[][] {
  const base = normalise(query);
  if (!base) return [];
  const variants = new Set<string>([base]);
  for (const group of SYNONYM_GROUPS) {
    for (const phrase of group) {
      const p = normalise(phrase);
      if (new RegExp(`(^| )${p}( |$)`).test(base)) {
        for (const alt of group) variants.add(base.replace(new RegExp(`(^| )${p}( |$)`), `$1${normalise(alt)}$2`));
      }
    }
  }
  return [...variants].map((v) => v.split(" "));
}

function termScore(term: string, doc: SearchDoc): number {
  let best = 0;
  doc.tokens.forEach((tok, i) => {
    const inTitle = i < doc.titleTokens;
    let s = 0;
    if (tok === term) s = 10;
    else if (term.length >= 2 && tok.startsWith(term)) s = 6;
    else {
      const max = allowedTypos(term);
      if (max > 0 && editDistance(term, tok, max) <= max) s = 4;
    }
    if (s && inTitle) s += 3;
    best = Math.max(best, s);
  });
  return best;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

/** Every query term must match (exactly, by prefix or within the typo allowance). Best expansion wins. */
export function search(index: SearchIndex, query: string, limit = 24): SearchHit[] {
  const expansions = expandQuery(query);
  if (!expansions.length) return [];
  const hits: SearchHit[] = [];
  for (const doc of index.docs) {
    let best = 0;
    for (const terms of expansions) {
      let total = 0;
      let all = true;
      for (const t of terms) {
        const s = termScore(t, doc);
        if (!s) {
          all = false;
          break;
        }
        total += s;
      }
      if (all) best = Math.max(best, total);
    }
    if (best) hits.push({ doc, score: best });
  }
  return hits.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit);
}
