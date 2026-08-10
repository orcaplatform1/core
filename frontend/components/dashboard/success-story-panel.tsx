"use client";
import { useState } from "react";
import { Star, Clock, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useMySuccessStory,
  useSubmitSuccessStory,
  useDeleteMySuccessStory,
} from "@/lib/hooks/use-success-stories";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-body-sm text-foreground outline-none focus:border-primary w-full";
}

// Mezun olmuş VE quiz başarı oranı %95+ olan kullanıcının kendi başarı hikayesini
// yazıp admin onayına gönderdiği panel. Sertifika sayfasında (hasCertificate=true iken) gösterilir.
export function SuccessStoryPanel() {
  const { data, isLoading } = useMySuccessStory();
  const submit = useSubmitSuccessStory();
  const removeMine = useDeleteMySuccessStory();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);

  if (isLoading || !data) return null;
  if (!data.eligible && !data.story) return null;

  async function handleSubmit() {
    if (!title.trim() || content.trim().length < 50) {
      toast.error("Başlık ve en az 50 karakterlik bir hikaye yazmalısın");
      return;
    }
    try {
      await submit.mutateAsync({ title: title.trim(), content: content.trim() });
      toast.success("Hikayen incelemeye gönderildi, onaylanınca vitrinde yayınlanacak");
      setShowForm(false);
      setTitle("");
      setContent("");
    } catch (err: any) {
      toast.error(err?.message ?? "Gönderilemedi");
    }
  }

  async function handleDelete() {
    if (!confirm("Başarı hikayeni silmek istediğine emin misin?")) return;
    try {
      await removeMine.mutateAsync();
      toast.success("Hikayen silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Star className="size-5 text-[#D9A441]" />
        <h3 className="text-card-title-sm text-foreground">Başarı Hikayen</h3>
      </div>

      {data.story ? (
        <div className="space-y-3">
          {data.story.status === "PENDING" && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card-inner px-3 py-2 text-body-xs text-muted-foreground">
              <Clock size={14} /> İnceleniyor — onaylanınca vitrinde yayınlanacak.
            </div>
          )}
          {data.story.status === "APPROVED" && (
            <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-body-xs text-success">
              <Star size={14} /> Yayında — hikayen vitrinde görünüyor.
            </div>
          )}
          {data.story.status === "REJECTED" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-body-xs text-danger">
                <XCircle size={14} /> Reddedildi{data.story.rejectionReason ? `: ${data.story.rejectionReason}` : ""}
              </div>
              {!showForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTitle(data.story!.title);
                    setContent(data.story!.content);
                    setShowForm(true);
                  }}
                >
                  Yeniden Düzenle ve Gönder
                </Button>
              )}
            </div>
          )}
          <p className="text-body-sm font-medium text-foreground">{data.story.title}</p>
          <p className="whitespace-pre-wrap text-body-xs text-muted-foreground">{data.story.content}</p>
          {data.story.status !== "REJECTED" && (
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 size={12} className="mr-1 text-danger" /> Sil
            </Button>
          )}
        </div>
      ) : !showForm ? (
        <div className="space-y-2">
          <p className="text-body-sm text-muted-foreground">
            Mezun oldun ve quiz başarı oranın %{data.quizSuccessRate} — başarı hikayeni yazıp diğer öğrencilere ilham
            olmak ister misin? İstersen paylaşabilirsin, zorunlu değil.
          </p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            Hikayeni Paylaş
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className={inputClass()}
            placeholder="Başlık (örn. Sıfırdan 6 ayda düzenli işlem yapmaya başladım)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={inputClass()}
            placeholder="Hikayeni anlat — neyle başladın, ORCA'da neler öğrendin, süreç nasıl geçti..."
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submit.isPending}>
              Gönder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              İptal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
