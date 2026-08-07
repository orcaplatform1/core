"use client";

import { useState } from "react";
import { Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  COMMUNITY_TIMEFRAMES,
  COMMUNITY_ICT_TAGS,
  COMMUNITY_POST_DISCLAIMER,
  useCreateCommunityPost,
  type PostDirection,
  type CommunityIctTag,
} from "@/lib/hooks/use-community";

const DIRECTION_OPTIONS: { value: PostDirection; label: string; activeClass: string }[] = [
  { value: "LONG", label: "Long", activeClass: "bg-success/15 border-success/40 text-success" },
  { value: "SHORT", label: "Short", activeClass: "bg-danger/15 border-danger/40 text-danger" },
  { value: "NEUTRAL", label: "Nötr", activeClass: "bg-muted border-border text-foreground" },
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function CreatePostSheet({
  postsToday,
  dailyPostLimit,
}: {
  postsToday: number;
  dailyPostLimit: number;
}) {
  const limitReached = postsToday >= dailyPostLimit;
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState<(typeof COMMUNITY_TIMEFRAMES)[number]>("1h");
  const [direction, setDirection] = useState<PostDirection>("LONG");
  const [ictTags, setIctTags] = useState<CommunityIctTag[]>([]);
  const [accepted, setAccepted] = useState(false);
  const createPost = useCreateCommunityPost();

  function resetForm() {
    setFile(null);
    setTitle("");
    setDescription("");
    setSymbol("");
    setTimeframe("1h");
    setDirection("LONG");
    setIctTags([]);
    setAccepted(false);
  }

  function toggleTag(tag: CommunityIctTag) {
    setIctTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleFileChange(f: File | null) {
    if (!f) return setFile(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("Görsel boyutu 10MB'ı aşamaz.");
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (limitReached) return;
    if (!file) return toast.error("Lütfen bir grafik görseli seçin.");
    if (!title.trim()) return toast.error("Başlık gerekli.");
    if (!symbol.trim()) return toast.error("Sembol gerekli.");
    if (!accepted) return toast.error("Devam etmek için onay kutusunu işaretlemelisiniz.");

    try {
      await createPost.mutateAsync({
        file,
        title: title.trim(),
        description: description.trim() || undefined,
        symbol: symbol.trim(),
        timeframe,
        direction,
        ictTags,
        disclaimerAccepted: accepted,
      });
      toast.success("Paylaşımın yayınlandı");
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Paylaşım gönderilemedi");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="gradient">
            <Plus className="size-4" /> Yeni Paylaşım
          </Button>
        }
      />
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Grafik Analizi Paylaş</SheetTitle>
          <SheetDescription>Analizini toplulukla paylaş, geri bildirim al.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <label className="card-inner flex cursor-pointer flex-col items-center gap-2 rounded-xl p-6 text-center transition-colors duration-200 hover:bg-[var(--card-hover)]">
            <Upload className="size-5 text-primary" />
            <span className="text-help text-muted-foreground">
              {file ? file.name : "Grafik görseli seç (JPG, PNG, WEBP — maks. 10MB)"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-muted-foreground">Başlık</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. BTCUSDT 4H Order Block Testi" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-muted-foreground">Açıklama (opsiyonel)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Analizini açıkla..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-muted-foreground">Sembol</label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                maxLength={20}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-muted-foreground">Zaman Dilimi</label>
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as (typeof COMMUNITY_TIMEFRAMES)[number])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNITY_TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-muted-foreground">Yön</label>
            <div className="flex gap-2">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDirection(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    direction === opt.value ? opt.activeClass : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-muted-foreground">ICT Etiketleri (opsiyonel)</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNITY_ICT_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-2.5 py-1 text-tag transition-colors ${
                    ictTags.includes(tag)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 text-help text-muted-foreground">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
            />
            {COMMUNITY_POST_DISCLAIMER}
          </label>
        </div>

        <SheetFooter>
          <Button onClick={submit} disabled={createPost.isPending || limitReached} className="w-full">
            {createPost.isPending ? "Gönderiliyor..." : "Paylaş"}
          </Button>
          {limitReached && (
            <p className="text-center text-body-xs text-warning">
              Bugünkü paylaşım hakkınızı kullandınız, yarın tekrar deneyebilirsiniz.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
