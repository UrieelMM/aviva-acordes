export type ExtractedSongPage = {
  title: string;
  artist: string;
  key: string;
  chordText: string;
  source: "Cifra Club" | "LaCuerda";
};

export function extractPublicSong(html: string, hostname: string): ExtractedSongPage {
  const h1Html = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const titleOnlyH1 = hostname.includes("lacuerda") ? h1Html.split(/<br\b/i)[0] ?? h1Html : h1Html;
  const h1 = decodeHtml(stripTags(titleOnlyH1)).trim();
  const metaTitle = getMetaContent(html, "property", "og:title") || getMetaContent(html, "name", "twitter:title");
  const documentTitle = decodeHtml(stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")).trim();
  const combinedTitle = metaTitle || documentTitle;
  const title = cleanTitle(h1 || combinedTitle, hostname);
  const artist = extractArtist(html, combinedTitle, title, hostname);
  const key = extractKey(html);
  const chordText = extractChordText(html, hostname);
  return { title, artist, key, chordText, source: hostname.includes("cifraclub") ? "Cifra Club" : "LaCuerda" };
}

function getMetaContent(html: string, attribute: string, expected: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const value = getAttribute(tag, attribute);
    if (value?.toLowerCase() === expected.toLowerCase()) return decodeHtml(getAttribute(tag, "content") ?? "").trim();
  }
  return "";
}

function getAttribute(tag: string, name: string) {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  if (quoted) return quoted[2];
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"))?.[1] ?? "";
}

function cleanTitle(value: string, hostname: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (hostname.includes("cifraclub")) return compact.split(/\s+-\s+/)[0]?.trim() ?? compact;
  return compact.replace(/\s*[:|-]\s*(?:acordes|cifra|tablatura).*$/i, "").trim();
}

function extractArtist(html: string, combinedTitle: string, title: string, hostname: string) {
  const jsonArtist = html.match(/"(?:byArtist|author)"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)?.[1];
  if (jsonArtist) return decodeHtml(jsonArtist).trim();

  if (hostname.includes("cifraclub")) {
    const parts = combinedTitle.split(/\s+-\s+/).map((part) => part.trim());
    if (parts.length >= 2 && parts[0]?.toLowerCase() === title.toLowerCase()) return parts[1] ?? "";
  }

  const lacuerdaArtist = combinedTitle.match(/(?:acordes|letra|tablatura)[^,]*,\s*([^|-]+)/i)?.[1];
  return lacuerdaArtist?.trim() ?? "";
}

function extractKey(html: string) {
  const configuredKey = html.match(/"keyShape"\s*:\s*"([A-G](?:#|b)?(?:m|maj|min)?)"/i)?.[1];
  if (configuredKey) return configuredKey;
  const plain = decodeHtml(stripTags(html)).replace(/\s+/g, " ");
  return plain.match(/\b(?:Tono|Tom)\s*:\s*([A-G](?:#|b)?(?:m|maj|min)?)(?=\s|$)/)?.[1] ?? "";
}

function extractChordText(html: string, hostname: string) {
  const encodedBlock = hostname.includes("cifraclub")
    ? html.match(/<pre\b(?=[^>]*\bdata-chord-content(?:\s*=\s*(?:["'][^"']*["']|[^\s>]+))?)[^>]*>([\s\S]*?)<\/pre>/i)?.[1]
    : extractLaCuerdaBlock(html);

  if (!encodedBlock) return "";

  const withoutPageElements = encodedBlock
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<div\b[^>]*class\s*=\s*(["'])[^"']*\btabs\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div\b[^>]*data-variant\s*=\s*(["'])middleChord\1[^>]*>[\s\S]*?(?=<div\b[^>]*class\s*=\s*(["'])[^"']*\bkvMV\b)/gi, "")
    .replace(/<div\b[^>]*>\s*<\/div>/gi, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  const normalized = decodeHtml(withoutPageElements)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return trimChordDiagramAppendix(normalized);
}

function extractLaCuerdaBlock(html: string) {
  return html.match(/<div\b[^>]*\bid\s*=\s*(["'])t_body\1[^>]*>\s*<pre\b[^>]*>([\s\S]*?)<\/pre>/i)?.[2]
    ?? html.match(/<div\b[^>]*\bclass\s*=\s*(["'])[^"']*\brtBody\b[^"']*\1[^>]*>\s*<pre\b[^>]*>([\s\S]*?)<\/pre>/i)?.[2]
    ?? html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
}

function trimChordDiagramAppendix(value: string) {
  const lines = value.split("\n");
  const appendixStart = lines.findIndex((line) => /^(?:acordes?\s+(?:raros?|usados?|utilizados?)|diagramas?\s+de\s+acordes?)\s*:?\s*$/i.test(line.trim()));
  return (appendixStart >= 0 ? lines.slice(0, appendixStart) : lines).join("\n").trim();
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
