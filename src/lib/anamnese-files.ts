/**
 * O bucket anamnese-files é privado: as URLs armazenadas são caminhos
 * relativos e devem ser resolvidas via signed URL no momento da exibição.
 * Registros antigos podem conter a URL pública completa — normalizamos aqui.
 */

const ANANMESE_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/anamnese-files/`;

/** Converte URL pública antiga (ou caminho) em caminho relativo do storage. */
export function normalizeAnamnesePath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith(ANANMESE_PREFIX)) {
    return urlOrPath.slice(ANANMESE_PREFIX.length);
  }
  return urlOrPath;
}
