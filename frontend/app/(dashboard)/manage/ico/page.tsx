"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Plus, Trash2, Pencil, Rocket, X, Check, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useIcoProjects,
  useAdminCreateIco,
  useAdminUpdateIco,
  useAdminDeleteIco,
  type IcoProject,
  type IcoStatus,
} from "@/lib/hooks/use-ico-tracker";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-body-sm text-[#A8A6A0] outline-none focus:border-primary w-full";
}

type FormState = {
  name: string;
  tokenSymbol: string;
  status: IcoStatus;
  raisedAmountUsd: string;
  ratingScore: string;
  startDate: string;
  endDate: string;
  websiteUrl: string;
  description: string;
  logo: string;
  blockchain: string;
  category: string;
  saleType: string;
  launchpad: string;
  launchpadUrl: string;
  tokenPrice: string;
  hardCapUsd: string;
  valuationUsd: string;
  allocationDetails: string;
  requiresKYC: boolean;
  requiresWhitelist: boolean;
  twitter: string;
  telegram: string;
  discord: string;
  isAd: boolean;
  adExpiresAt: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  tokenSymbol: "",
  status: "UPCOMING",
  raisedAmountUsd: "",
  ratingScore: "",
  startDate: "",
  endDate: "",
  websiteUrl: "",
  description: "",
  logo: "",
  blockchain: "",
  category: "",
  saleType: "",
  launchpad: "",
  launchpadUrl: "",
  tokenPrice: "",
  hardCapUsd: "",
  valuationUsd: "",
  allocationDetails: "",
  requiresKYC: false,
  requiresWhitelist: false,
  twitter: "",
  telegram: "",
  discord: "",
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

export default function AdminIcoPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: projects, isLoading } = useIcoProjects();

  const createIco = useAdminCreateIco();
  const updateIco = useAdminUpdateIco();
  const deleteIco = useAdminDeleteIco();

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

  function startEdit(p: IcoProject) {
    setEditingId(p.id);
    setShowNew(false);
    setForm({
      name: p.name,
      tokenSymbol: p.tokenSymbol ?? "",
      status: p.status,
      raisedAmountUsd: p.raisedAmountUsd != null ? String(p.raisedAmountUsd) : "",
      ratingScore: p.ratingScore != null ? String(p.ratingScore) : "",
      startDate: toDatetimeLocal(p.startDate),
      endDate: toDatetimeLocal(p.endDate),
      websiteUrl: p.websiteUrl ?? "",
      description: p.description ?? "",
      logo: p.logo ?? "",
      blockchain: p.blockchain ?? "",
      category: p.category ?? "",
      saleType: p.saleType ?? "",
      launchpad: p.launchpad ?? "",
      launchpadUrl: p.launchpadUrl ?? "",
      tokenPrice: p.tokenPrice != null ? String(p.tokenPrice) : "",
      hardCapUsd: p.hardCapUsd != null ? String(p.hardCapUsd) : "",
      valuationUsd: p.valuationUsd != null ? String(p.valuationUsd) : "",
      allocationDetails: p.allocationDetails ?? "",
      requiresKYC: p.requiresKYC,
      requiresWhitelist: p.requiresWhitelist,
      twitter: p.twitter ?? "",
      telegram: p.telegram ?? "",
      discord: p.discord ?? "",
      isAd: p.isAd,
      adExpiresAt: toDatetimeLocal(p.adExpiresAt),
    });
  }

  function cancelForm() {
    setShowNew(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submitForm() {
    if (!form.name.trim()) {
      toast.error("Proje adı zorunlu");
      return;
    }
    const payload = {
      name: form.name.trim(),
      tokenSymbol: form.tokenSymbol.trim() || undefined,
      status: form.status,
      raisedAmountUsd: form.raisedAmountUsd ? Number(form.raisedAmountUsd) : undefined,
      ratingScore: form.ratingScore ? Number(form.ratingScore) : undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      logo: form.logo.trim() || undefined,
      blockchain: form.blockchain.trim() || undefined,
      category: form.category.trim() || undefined,
      saleType: form.saleType.trim() || undefined,
      launchpad: form.launchpad.trim() || undefined,
      launchpadUrl: form.launchpadUrl.trim() || undefined,
      tokenPrice: form.tokenPrice ? Number(form.tokenPrice) : undefined,
      hardCapUsd: form.hardCapUsd ? Number(form.hardCapUsd) : undefined,
      valuationUsd: form.valuationUsd ? Number(form.valuationUsd) : undefined,
      allocationDetails: form.allocationDetails.trim() || undefined,
      requiresKYC: form.requiresKYC,
      requiresWhitelist: form.requiresWhitelist,
      twitter: form.twitter.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      discord: form.discord.trim() || undefined,
      isAd: form.isAd,
      adExpiresAt: form.isAd && form.adExpiresAt ? new Date(form.adExpiresAt).toISOString() : undefined,
    };
    try {
      if (editingId) {
        await updateIco.mutateAsync({ id: editingId, ...payload });
        toast.success("ICO/IDO güncellendi");
      } else {
        await createIco.mutateAsync(payload);
        toast.success("ICO/IDO oluşturuldu");
      }
      cancelForm();
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ICO/IDO projesini silmek istediğine emin misin?")) return;
    try {
      await deleteIco.mutateAsync(id);
      toast.success("Silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  function renderForm() {
    return (
      <div className="rounded-xl border border-border bg-card-inner p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={inputClass()} placeholder="Proje Adı *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputClass()} placeholder="Token Sembolü" value={form.tokenSymbol} onChange={(e) => setForm((f) => ({ ...f, tokenSymbol: e.target.value }))} />
          <input className={inputClass()} placeholder="Blockchain" value={form.blockchain} onChange={(e) => setForm((f) => ({ ...f, blockchain: e.target.value }))} />
          <input className={inputClass()} placeholder="Kategori (DeFi, GameFi...)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </div>

        <textarea className={inputClass()} placeholder="Açıklama" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inputClass()} placeholder="Logo URL" value={form.logo} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} />
          <input className={inputClass()} placeholder="Website URL" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} />
          <select className={inputClass()} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as IcoStatus }))}>
            <option value="UPCOMING">Yaklaşan</option>
            <option value="ACTIVE">Aktif</option>
            <option value="ENDED">Sona Erdi</option>
          </select>
        </div>

        <p className="text-body-xs font-medium text-[#A8A6A0]">Lansman bilgisi (icodrops.com tarzı)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inputClass()} placeholder="Satış Tipi (IDO, IEO, Private...)" value={form.saleType} onChange={(e) => setForm((f) => ({ ...f, saleType: e.target.value }))} />
          <input className={inputClass()} placeholder="Launchpad Adı" value={form.launchpad} onChange={(e) => setForm((f) => ({ ...f, launchpad: e.target.value }))} />
          <input className={inputClass()} placeholder="Lansmanı Al Linki (launchpad URL)" value={form.launchpadUrl} onChange={(e) => setForm((f) => ({ ...f, launchpadUrl: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input className={inputClass()} placeholder="Token Fiyatı ($)" type="number" value={form.tokenPrice} onChange={(e) => setForm((f) => ({ ...f, tokenPrice: e.target.value }))} />
          <input className={inputClass()} placeholder="Toplanan ($)" type="number" value={form.raisedAmountUsd} onChange={(e) => setForm((f) => ({ ...f, raisedAmountUsd: e.target.value }))} />
          <input className={inputClass()} placeholder="Hard Cap ($)" type="number" value={form.hardCapUsd} onChange={(e) => setForm((f) => ({ ...f, hardCapUsd: e.target.value }))} />
          <input className={inputClass()} placeholder="Değerleme/FDV ($)" type="number" value={form.valuationUsd} onChange={(e) => setForm((f) => ({ ...f, valuationUsd: e.target.value }))} />
          <input className={inputClass()} placeholder="Puan (0-5)" type="number" step="0.1" value={form.ratingScore} onChange={(e) => setForm((f) => ({ ...f, ratingScore: e.target.value }))} />
        </div>

        <textarea className={inputClass()} placeholder="Tahsisat detayları (vesting, allocation vb.)" rows={2} value={form.allocationDetails} onChange={(e) => setForm((f) => ({ ...f, allocationDetails: e.target.value }))} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="text-body-xs text-[#A8A6A0]">Başlangıç</label>
            <input className={inputClass()} type="datetime-local" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-body-xs text-[#A8A6A0]">Bitiş</label>
            <input className={inputClass()} type="datetime-local" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inputClass()} placeholder="Twitter URL" value={form.twitter} onChange={(e) => setForm((f) => ({ ...f, twitter: e.target.value }))} />
          <input className={inputClass()} placeholder="Telegram URL" value={form.telegram} onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))} />
          <input className={inputClass()} placeholder="Discord URL" value={form.discord} onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))} />
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-body-xs text-[#A8A6A0]">
            <input type="checkbox" checked={form.requiresKYC} onChange={(e) => setForm((f) => ({ ...f, requiresKYC: e.target.checked }))} />
            KYC gerekli
          </label>
          <label className="flex items-center gap-1.5 text-body-xs text-[#A8A6A0]">
            <input type="checkbox" checked={form.requiresWhitelist} onChange={(e) => setForm((f) => ({ ...f, requiresWhitelist: e.target.checked }))} />
            Whitelist gerekli
          </label>
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
          <Button size="sm" onClick={submitForm} disabled={createIco.isPending || updateIco.isPending}>
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
          <h1 className="text-h1 text-[#F5F1EA]">ICO / IDO</h1>
          <p className="text-body-sm text-[#A8A6A0]">Lansmanları manuel ekle, düzenle, #Ads ile pinle.</p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {!showNew && !editingId && (
        <Button onClick={() => { setShowNew(true); setForm(EMPTY_FORM); }}>
          <Plus size={16} className="mr-1" /> Yeni ICO/IDO
        </Button>
      )}

      {showNew && renderForm()}

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !projects || projects.length === 0 ? (
          <p className="text-body-sm text-[#A8A6A0]">Henüz ICO/IDO yok.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo} alt={p.name} className="size-9 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                      <Rocket size={18} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-card-title-sm text-[#F5F1EA]">
                      {p.name} {p.isAd && <Megaphone size={12} className="inline text-warning" />}
                    </p>
                    <p className="text-body-xs text-[#A8A6A0]">{p.tokenSymbol ?? "—"} · {p.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                    <Trash2 size={14} className="text-danger" />
                  </Button>
                </div>
              </div>
              {editingId === p.id && renderForm()}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
