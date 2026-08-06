import { ImgHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { normalizeAnamnesePath } from "@/lib/anamnese-files";
import { useSignedFileUrl } from "@/hooks/useSignedFileUrl";

/** Imagem de arquivo privado de anamnese (resolve signed URL on-demand). */
export function SignedAnamneseImg({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const path = normalizeAnamnesePath(src);
  const url = useSignedFileUrl(path);

  if (!path || !url) {
    return (
      <div className="flex items-center justify-center bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <img src={url} alt={alt} {...props} />;
}

/** Link para arquivo privado de anamnese (ex.: documento de limitação). */
export function SignedAnamneseLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const path = normalizeAnamnesePath(href);
  const url = useSignedFileUrl(path);

  if (!path || !url) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

/**
 * Foto de anamnese que abre a versão em tela cheia em nova aba.
 * Resolve a signed URL uma única vez e exibe um skeleton enquanto carrega.
 */
export function SignedAnamnesePhoto({ path, alt }: { path: string; alt: string }) {
  const url = useSignedFileUrl(normalizeAnamnesePath(path));

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md overflow-hidden border hover:opacity-90 transition-opacity"
    >
      {url ? (
        <img src={url} alt={alt} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-muted animate-pulse" />
      )}
    </a>
  );
}
