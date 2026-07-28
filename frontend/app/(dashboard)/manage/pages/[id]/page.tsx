"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Heading,
  Pilcrow,
  List,
  ImageIcon,
  Minus,
  Save,
} from "lucide-react";
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
import { useAuth } from "@/context/auth-context";
import { useAdminPages, useCreatePage, useUpdatePage } from "@/lib/hooks/use-admin-pages";
import {
  BLOCK_TYPE_LABELS,
  HEADING_SIZE_LABELS,
  TEXT_SIZE_LABELS,
  type PageBlock,
  type PageBlockType,
  type HeadingSize,
  type TextSize,
} from "@/lib/marketing/page-blocks-types";

const ROLES = ["GUEST", "STUDENT", "STAFF", "SUPER_ADMIN"] as const;
const ROLE_LABELS: Record<string, string> = {
  GUEST: "Misafir",
  STUDENT: "Öğrenci",
  STAFF: "Personel",
  SUPER_ADMIN: "Süper Admin",
};

const BLOCK_TYPE_ICONS: Record<PageBlockType, React.ReactNode> = {
  heading: <Heading size={14} />,
  paragraph: <Pilcrow size={14} />,
  bulletList: <List size={14} />,
  image: <ImageIcon size={14} />,
  divider: <Minus size={14} />,
};

function defaultBlockFor(type: PageBlockType): PageBlock {
  switch (type) {
    case "heading":
      return { type: "heading", text: "", size: "md" };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "bulletList":
      return { type: "bulletList", items: [""] };
    case "image":
      return { type: "image", url: "", alt: "", caption: "" };
    case "divider":
      return { type: "divider" };
  }
}

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#A69B8A] outline-none focus:border-primary w-full";
}

export default function AdminPageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: pages, isLoading: loadingPages } = useAdminPages();
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();

  const existing = !isNew ? pages?.find((p) => p.id === id) : undefined;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [showInFooter, setShowInFooter] = useState(false);
  const [order, setOrder] = useState("0");
  const [visibility, setVisibility] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (isNew) {
      setHydrated(true);
      return;
    }
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setShowInFooter(existing.showInFooter);
      setOrder(String(existing.order));
      setVisibility(existing.visibility ?? []);
      setBlocks(existing.blocks ?? []);
      setHydrated(true);
    }
  }, [existing, isNew, hydrated]);

  if (authLoading) {
    return <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A69B8A]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }
  if (!isNew && loadingPages) {
    return <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>;
  }
  if (!isNew && !loadingPages && !existing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <p className="text-sm text-[#A69B8A]">Sayfa bulunamadı.</p>
        <Link href="/manage/pages" className="text-sm text-primary hover:underline">
          Sayfalara dön
        </Link>
      </div>
    );
  }

  function toggleRole(role: string) {
    setVisibility((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function updateBlock(index: number, next: PageBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addBlock(type: PageBlockType) {
    setBlocks((prev) => [...prev, defaultBlockFor(type)]);
  }

  async function handleSave() {
    if (!title.trim() || !slug.trim()) {
      toast.error("Başlık ve slug gerekli");
      return;
    }
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      blocks,
      visibility,
      showInFooter,
      order: Number(order) || 0,
    };
    try {
      if (isNew) {
        await createPage.mutateAsync(payload);
        toast.success("Sayfa oluşturuldu");
      } else {
        await updatePage.mutateAsync({ id, ...payload });
        toast.success("Sayfa güncellendi");
      }
      router.push("/manage/pages");
    } catch (err: any) {
      toast.error(err?.message ?? "Kaydedilemedi");
    }
  }

  const isSaving = createPage.isPending || updatePage.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="icon-sm" variant="ghost" render={<Link href="/manage/pages" />} aria-label="Geri">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">{isNew ? "Yeni Sayfa" : "Sayfayı Düzenle"}</h1>
          <p className="text-sm text-[#A69B8A]">Sayfa meta bilgilerini ve içerik bloklarını düzenle.</p>
        </div>
      </div>

      {/* Meta form */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[#A69B8A]">Başlık</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sayfa başlığı" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#A69B8A]">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ornek-sayfa-slug"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[#A69B8A]">Sıra</label>
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          <div className="flex items-end gap-2 pb-1.5">
            <input
              id="showInFooter"
              type="checkbox"
              checked={showInFooter}
              onChange={(e) => setShowInFooter(e.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            <label htmlFor="showInFooter" className="text-sm text-[#A69B8A]">
              Footer&apos;da göster
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#A69B8A]">Görünürlük</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => {
              const active = visibility.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-[#A69B8A] hover:border-primary/40"
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#A69B8A]">
            {visibility.length === 0
              ? "Herkese Açık — hiçbir rol seçilmediğinde sayfa herkes tarafından görüntülenebilir."
              : "Sadece seçili roller görüntüleyebilir."}
          </p>
        </div>
      </div>

      {/* Block editor */}
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#A69B8A]">
                {BLOCK_TYPE_ICONS[block.type]}
                {BLOCK_TYPE_LABELS[block.type]}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => moveBlock(i, -1)}
                  disabled={i === 0}
                  aria-label="Yukarı taşı"
                >
                  <ArrowUp size={12} />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => moveBlock(i, 1)}
                  disabled={i === blocks.length - 1}
                  aria-label="Aşağı taşı"
                >
                  <ArrowDown size={12} />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => removeBlock(i)} aria-label="Sil">
                  <Trash2 size={12} className="text-destructive" />
                </Button>
              </div>
            </div>

            {block.type === "heading" && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  className="sm:flex-1"
                  rows={1}
                  placeholder="Başlık metni"
                  value={block.text}
                  onChange={(e) => updateBlock(i, { ...block, text: e.target.value })}
                />
                <Select
                  value={block.size}
                  onValueChange={(v) => updateBlock(i, { ...block, size: v as HeadingSize })}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HEADING_SIZE_LABELS) as HeadingSize[]).map((size) => (
                      <SelectItem key={size} value={size}>
                        {HEADING_SIZE_LABELS[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {block.type === "paragraph" && (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  placeholder="Paragraf metni (kalın vurgu için **metin** kullanabilirsin)"
                  value={block.text}
                  onChange={(e) => updateBlock(i, { ...block, text: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={block.fontSize ?? "base"}
                    onValueChange={(v) => updateBlock(i, { ...block, fontSize: v as TextSize })}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TEXT_SIZE_LABELS) as TextSize[]).map((size) => (
                        <SelectItem key={size} value={size}>
                          {TEXT_SIZE_LABELS[size]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={block.color ?? "#A69B8A"}
                      onChange={(e) => updateBlock(i, { ...block, color: e.target.value })}
                      className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <Input
                      className="w-28"
                      value={block.color ?? ""}
                      placeholder="varsayılan"
                      onChange={(e) => updateBlock(i, { ...block, color: e.target.value || undefined })}
                    />
                  </div>
                </div>
              </div>
            )}

            {block.type === "bulletList" && (
              <Textarea
                rows={4}
                placeholder={"Her satır bir madde\nİkinci madde"}
                value={block.items.join("\n")}
                onChange={(e) => updateBlock(i, { ...block, items: e.target.value.split("\n") })}
              />
            )}

            {block.type === "image" && (
              <div className="space-y-2">
                <Input
                  placeholder="Görsel URL"
                  value={block.url}
                  onChange={(e) => updateBlock(i, { ...block, url: e.target.value })}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Alt metin (opsiyonel)"
                    value={block.alt ?? ""}
                    onChange={(e) => updateBlock(i, { ...block, alt: e.target.value })}
                  />
                  <Input
                    placeholder="Alt yazı / caption (opsiyonel)"
                    value={block.caption ?? ""}
                    onChange={(e) => updateBlock(i, { ...block, caption: e.target.value })}
                  />
                </div>
                {block.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.url}
                    alt={block.alt ?? ""}
                    className="max-h-40 rounded-lg border border-border object-cover"
                  />
                )}
              </div>
            )}

            {block.type === "divider" && (
              <p className="text-xs text-[#A69B8A]">Bu blok bir ayırıcı çizgi ekler.</p>
            )}
          </div>
        ))}

        {blocks.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-[#A69B8A]">
            Henüz blok yok. Aşağıdan blok ekleyerek başla.
          </p>
        )}

        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
          <span className="w-full text-xs text-[#A69B8A]">+ Blok Ekle</span>
          {(Object.keys(BLOCK_TYPE_LABELS) as PageBlockType[]).map((type) => (
            <Button key={type} size="sm" variant="outline" onClick={() => addBlock(type)}>
              {BLOCK_TYPE_ICONS[type]}
              <span className="ml-1">{BLOCK_TYPE_LABELS[type]}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save size={14} className="mr-1" /> Kaydet
        </Button>
      </div>
    </div>
  );
}
