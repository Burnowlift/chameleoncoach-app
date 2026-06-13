import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

const StudentAvatarDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  avatarUrl,
  onAvatarChange,
}: StudentAvatarDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${studentId}/avatar.${ext}`;

    // Remove old file if exists
    await supabase.storage.from("avatars").remove([path]);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar imagem.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("students")
      .update({ avatar: publicUrl })
      .eq("id", studentId);

    if (updateError) {
      toast.error("Erro ao atualizar avatar.");
    } else {
      onAvatarChange(publicUrl);
      toast.success("Foto atualizada!");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async () => {
    setRemoving(true);
    // List and remove all files in folder
    const { data: files } = await supabase.storage
      .from("avatars")
      .list(studentId);

    if (files?.length) {
      await supabase.storage
        .from("avatars")
        .remove(files.map((f) => `${studentId}/${f.name}`));
    }

    await supabase
      .from("students")
      .update({ avatar: null })
      .eq("id", studentId);

    onAvatarChange(null);
    setRemoving(false);
    toast.success("Foto removida!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <Avatar className="h-32 w-32 border-4 border-primary/20">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={studentName} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-3 w-full">
            <Button
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : avatarUrl ? "Trocar foto" : "Enviar foto"}
            </Button>

            {avatarUrl && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={uploading || removing}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remover
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentAvatarDialog;
