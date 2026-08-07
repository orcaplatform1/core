"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Plus, Trash2, Pencil, Gift, X, Check, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useAirdrops,
  useAdminCreateAirdrop,
  useAdminUpdateAirdrop,
  useAdminDeleteAirdrop,
  type Airdrop,
  type AirdropStatus,
  type AirdropDifficulty,
} from "@/lib/hooks/use-airdrops";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-body-sm text-[#A8A6A0] outline-none focus:border-primary w-full";
}

type FormState = {
  title: string;
  slug: string;
  projectName: string;
  blockchain: string;
  category: string;
  logo: string;
  banner: string;
  description: string;
  website: string;
  twitter: string;
  discord: string;
  telegram: string;
  documentation: string;
  status: AirdropStatus;
  rewardType: string;
  estimatedReward: string;
  estimatedValueUSD: string;
  difficulty: AirdropDifficulty;
  completionTime: string;
  requiresKYC: boolean;
  requiresWallet: boolean;
  requiresDiscord: boolean;
  requiresTwitter: boolean;
  requiresTelegram: boolean;
  startDate: string;
  endDate: string;
  snapshotDate: string;
  claimDate: string;
  aiScore: string;
  riskScore: string;
  featured: boolean;
  isAd: boolean;
  adExpiresAt: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  projectName: "",
  blockchain: "",
  category: "",
  logo: "",
  banner: "",
  description: "",
  website: "",
  twitter: "",
  discord: "",
  telegram: "",
  documentation: "",
  status: "UPCOMING",
  rewardType: "",
  estimatedReward: "",
  estimatedValueUSD: "",
  difficulty: "MEDIUM",
  completionTime: "",
  requiresKYC: false,
  requiresWallet: false,
  requiresDiscord: false,
  requiresTwitter: false,
  requiresTelegram: false,
  startDate: "",
  endDate: "",
  snapshotDate: "",
  claimDate: "",
  aiScore: "50",
  riskScore: "50",
  featured: false,
  isAd: false,
  adExpiresAt: "",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAirdropsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data, isLoading } = useAirdrops({ limit: 100 });
  const airdrops = data?.data ?? [];

  const createAirdrop = useAdminCreateAirdrop();
  const updateAirdrop = useAdminUpdateAirdrop();
  const deleteAirdrop = useAdminDeleteAirdrop();

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  if (authLoading) {
    return <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  function startEdit(a: Airdrop) {
    setEditingId(a.id);
    setShowNew(false);
    setForm({
      title: a.title,
      slug: a.slug,
      projectName: a.projectName,
      blockchain: a.blockchain,
      category: a.category,
      logo: a.logo ?? "",
      banner: a.banner ?? "",
      description: a.description ?? "",
      website: a.website ?? "",
      twitter: a.twitter ?? "",
      discord: a.discord ?? "",
      telegram: a.telegram ?? "",
      documentation: a.documentation ?? "",
      status: a.status,
      rewardType: a.rewardType,
      estimatedReward: a.estimatedReward ?? "",
      estimatedValueUSD: a.estimatedValueUSD != null ? String(a.estimatedValueUSD) : "",
      difficulty: a.difficulty,
      completionTime: a.completionTime ?? "",
      requiresKYC: a.requiresKYC,
      requiresWallet: a.requiresWallet,
      requiresDiscord: a.requiresDiscord,
      requiresTwitter: a.requiresTwitter,
      requiresTelegram: a.requiresTelegram,
      startDate: toDatetimeLocal(a.startDate),
      endDate: toDatetimeLocal(a.endDate),
      snapshotDate: toDatetimeLocal(a.snapshotDate),
      claimDate: toDatetimeLocal(a.claimDate),
      aiScore: String(a.aiScore),
      riskScore: String(a.riskScore),
      featured: a.featured,
      isAd: a.isAd,
      adExpiresAt: toDatetimeLocal(a.adExpiresAt),
    });
  }

  function cancelForm() {
    setShowNew(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submitForm() {
    if (!form.title.trim() || !form.projectName.trim() || !form.blockchain.trim() || !form.category.trim() || !form.rewardType.trim()) {
      toast.error("Başlık, proje adı, blockchain, kategori ve ödül tipi zorunlu");
      return;
    }
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      projectName: form.projectName.trim(),
      blockchain: form.blockchain.trim(),
      category: form.category.trim(),
      logo: form.logo.trim() || undefined,
      banner: form.banner.trim() || undefined,
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      twitter: form.twitter.trim() || undefined,
      discord: form.discord.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      documentation: form.documentation.trim() || undefined,
      status: form.status,
      rewardType: form.rewardType.trim(),
      estimatedReward: form.estimatedReward.trim() || undefined,
      estimatedValueUSD: form.estimatedValueUSD ? Number(form.estimatedValueUSD) : undefined,
      difficulty: form.difficulty,
      completionTime: form.completionTime.trim() || undefined,
      requiresKYC: form.requiresKYC,
      requiresWallet: form.requiresWallet,
      requiresDiscord: form.requiresDiscord,
      requiresTwitter: form.requiresTwitter,
      requiresTelegram: form.requiresTelegram,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      snapshotDate: form.snapshotDate ? new Date(form.snapshotDate).toISOString() : undefined,
      claimDate: form.claimDate ? new Date(form.claimDate).toISOString() : undefined,
      aiScore: Number(form.aiScore) || 50,
      riskScore: Number(form.riskScore) || 50,
      featured: form.featured,
      isAd: form.isAd,
      adExpiresAt: form.isAd && form.adExpiresAt ? new Date(form.adExpiresAt).toISOString() : undefined,
    };
    try {
      if (editingId) {
        await updateAirdrop.mutateAsync({ id: editingId, ...payload });
        toast.success("Airdrop güncellendi");
      } else {
        await createAirdrop.mutateAsync(payload);
        toast.success("Airdrop oluşturuldu");
      }
      cancelForm();
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu airdropu silmek istediğine emin misin?")) return;
    try {
      await deleteAirdrop.mutateAsync(id);
      toast.success("Airdrop silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  function renderForm() {
    return (
      <div className="rounded-xl border border-border bg-card-inner p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={inputClass()} placeholder="Başlık *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className={inputClass()} placeholder="Slug (boş bırakılırsa otomatik)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <input className={inputClass()} placeholder="Proje Adı *" value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} />
          <input className={inputClass()} placeholder="Blockchain *" value={form.blockchain} onChange={(e) => setForm((f) => ({ ...f, blockchain: e.target.value }))} />
          <input className={inputClass()} placeholder="Kategori *" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <input className={inputClass()} placeholder="Ödül Tipi * (Token, NFT, Puan...)" value={form.rewardType} onChange={(e) => setForm((f) => ({ ...f, rewardType: e.target.value }))} />
        </div>

        <textarea className={inputClass()} placeholder="Açıklama" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={inputClass()} placeholder="Logo URL" value={form.logo} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} />
          <input className={inputClass()} placeholder="Banner URL" value={form.banner} onChange={(e) => setForm((f) => ({ ...f, banner: e.target.value }))} />
          <input className={inputClass()} placeholder="Website URL" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
          <input className={inputClass()} placeholder="Dokümantasyon URL" value={form.documentation} onChange={(e) => setForm((f) => ({ ...f, documentation: e.target.value }))} />
          <input className={inputClass()} placeholder="Twitter URL" value={form.twitter} onChange={(e) => setForm((f) => ({ ...f, twitter: e.target.value }))} />
          <input className={inputClass()} placeholder="Discord URL" value={form.discord} onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))} />
          <input className={inputClass()} placeholder="Telegram URL" value={form.telegram} onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select className={inputClass()} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AirdropStatus }))}>
            <option value="UPCOMING">Yakında</option>
            <option value="ACTIVE">Aktif</option>
            <option value="ENDED">Sona Erdi</option>
          </select>
          <select className={inputClass()} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as AirdropDifficulty }))}>
            <option value="EASY">Kolay</option>
            <option value="MEDIUM">Orta</option>
            <option value="HARD">Zor</option>
          </select>
          <input className={inputClass()} placeholder="AI Skor (0-100)" type="number" min={0} max={100} value={form.aiScore} onChange={(e) => setForm((f) => ({ ...f, aiScore: e.target.value }))} />
          <input className={inputClass()} placeholder="Risk Skoru (0-100)" type="number" min={0} max={100} value={form.riskScore} onChange={(e) => setForm((f) => ({ ...f, riskScore: e.target.value }))} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inputClass()} placeholder="Tahmini Ödül (ör. 500-2000 USDC)" value={form.estimatedReward} onChange={(e) => setForm((f) => ({ ...f, estimatedReward: e.target.value }))} />
          <input className={inputClass()} placeholder="Tahmini Değer (USD)" type="number" value={form.estimatedValueUSD} onChange={(e) => setForm((f) => ({ ...f, estimatedValueUSD: e.target.value }))} />
          <input className={inputClass()} placeholder="Tahmini Süre (ör. 15 dakika)" value={form.completionTime} onChange={(e) => setForm((f) => ({ ...f, completionTime: e.target.value }))} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div>
            <label className="text-body-xs text-[#A8A6A0]">Başlangıç</label>
            <input className={inputClass()} type="datetime-local" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-body-xs text-[#A8A6A0]">Bitiş</label>
            <input className={inputClass()} type="datetime-local" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-body-xs text-[#A8A6A0]">Snapshot</label>
            <input className={inputClass()} type="datetime-local" value={form.snapshotDate} onChange={(e) => setForm((f) => ({ ...f, snapshotDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-body-xs text-[#A8A6A0]">Claim</label>
            <input className={inputClass()} type="datetime-local" value={form.claimDate} onChange={(e) => setForm((f) => ({ ...f, claimDate: e.target.value }))} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {([
            ["requiresKYC", "KYC gerekli"],
            ["requiresWallet", "Cüzdan gerekli"],
            ["requiresDiscord", "Discord gerekli"],
            ["requiresTwitter", "Twitter gerekli"],
            ["requiresTelegram", "Telegram gerekli"],
            ["featured", "Öne çıkan"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-body-xs text-[#A8A6A0]">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-2">
          <label className="flex items-center gap-1.5 text-body-sm font-medium text-warning">
            <input type="checkbox" checked={form.isAd} onChange={(e) => setForm((f) => ({ ...f, isAd: e.target.checked }))} />
            <Megaphone size={14} /> #Ads (reklamlı) - tarih/eklenmeden bağımsız her zaman en üstte gösterilir
          </label>
          {form.isAd && (
            <div>
              <label className="text-body-xs text-[#A8A6A0]">Reklam bitiş zamanı (geri sayım)</label>
              <input className={inputClass()} type="datetime-local" value={form.adExpiresAt} onChange={(e) => setForm((f) => ({ ...f, adExpiresAt: e.target.value }))} />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={submitForm} disabled={createAirdrop.isPending || updateAirdrop.isPending}>
            <Check size={14} className="mr-1" /> Kaydet
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelForm}>
            <X size={14} className="mr-1" /> İptal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Airdrop Center</h1>
          <p className="text-body-sm text-[#A8A6A0]">Airdropları manuel ekle, düzenle, #Ads ile pinle.</p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {!showNew && !editingId && (
        <Button onClick={() => { setShowNew(true); setForm(EMPTY_FORM); }}>
          <Plus size={16} className="mr-1" /> Yeni Airdrop
        </Button>
      )}

      {showNew && renderForm()}

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : airdrops.length === 0 ? (
          <p className="text-body-sm text-[#A8A6A0]">Henüz airdrop yok.</p>
        ) : (
          airdrops.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {a.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.logo} alt={a.title} className="size-9 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                      <Gift size={18} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-card-title-sm text-[#F5F1EA]">
                      {a.title} {a.isAd && <Megaphone size={12} className="inline text-warning" />}
                    </p>
                    <p className="text-body-xs text-[#A8A6A0]">{a.projectName} · {a.blockchain} · {a.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(a)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                    <Trash2 size={14} className="text-danger" />
                  </Button>
                </div>
              </div>
              {editingId === a.id && renderForm()}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
