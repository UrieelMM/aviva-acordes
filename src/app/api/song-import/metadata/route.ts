import { extractPublicSong } from "@/lib/song-page-import";

const supportedHosts = ["cifraclub.com", "lacuerda.net"];
const maxResponseBytes = 1_500_000;
const maxChordTextCharacters = 240_000;

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { url?: unknown };
    if (typeof payload.url !== "string") return Response.json({ error: "Escribe una URL válida." }, { status: 400 });

    const target = parseSupportedUrl(payload.url);
    if (!target) {
      return Response.json({ error: "Por ahora se admiten enlaces HTTPS de Cifra Club y LaCuerda." }, { status: 400 });
    }

    const response = await fetch(target, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "WorshipNotesSongImporter/1.0",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok || !response.body) throw new Error(`El sitio respondió con ${response.status}.`);
    const resolvedTarget = parseSupportedUrl(response.url);
    if (!resolvedTarget) throw new Error("El sitio redirigió a un dominio no permitido.");

    const html = await readLimitedText(response);
    const metadata = extractPublicSong(html, resolvedTarget.hostname);
    if (!metadata.title) throw new Error("No encontramos el título en esa página.");
    if (metadata.chordText.length > maxChordTextCharacters) throw new Error("La cifra es demasiado grande para importarla.");

    return Response.json({ ...metadata, url: resolvedTarget.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener los datos públicos.";
    return Response.json({ error: message }, { status: 422 });
  }
}

function parseSupportedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const supported = supportedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
    if (url.protocol !== "https:" || url.port || !supported) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

async function readLimitedText(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxResponseBytes) throw new Error("La página es demasiado grande para analizarla.");

  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxResponseBytes) {
      await reader.cancel();
      throw new Error("La página es demasiado grande para analizarla.");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(received);
  let offset = 0;
  chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.byteLength; });
  return new TextDecoder().decode(output);
}
