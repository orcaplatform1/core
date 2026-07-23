"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Plus, Trash2, Pencil, Award, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useAdminUsers } from "@/lib/hooks/use-admin-users";
import {
  useAdminBadges,
  useCreateBadge,
  useUpdateBadge,
  useDeleteBadge,
  useGrantBadge,
  type AdminBadge,
} from "@/lib/hooks/use-admin-badges";

const TRIGGER_TYPES: AdminBadge["triggerType"][] = [
  "FIRST_LESSON",
  "QUIZ_PASS_COUNT",
  "STREAK_DAYS",
  "BACKTEST_COUNT",
  "SIMULATION_COUNT",
  "CUSTOM",
];

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary w-full";
}

type FormState = {
  name: string;
  description: string;
  iconUrl: string;
  triggerType: AdminBadge["triggerType"];
  requiredCount: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  iconUrl: "",
  triggerType: "CUSTOM",
  requiredCount: "1",
};

export default function AdminBadgesPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: badges, isLoading: loadingBadges } = useAdminBadges();
  const { data: userList } = useAdminUsers(1, 100);

  const createBadge = useCreateBadge();
  const updateBadge = useUpdateBadge();
  const deleteBadge = useDeleteBadge();
  const grantBadge = useGrantBadge();

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [grantingBadgeId, setGrantingBadgeId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  if (authLoading) {
    return <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#FF5C5C" className="mx-auto" />
        <p className="text-sm text-[#8D9BB6]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  function startEdit(b: AdminBadge) {
    setEditingId(b.id);
    setShowNew(false);
    setForm({
      name: b.name,
      description: b.description,
      iconUrl: b.iconUrl ?? "",
      triggerType: b.triggerType,
      requiredCount: String(b.requiredCount),
    });
  }

  function cancelForm() {
    setShowNew(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submitForm() {
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Ad ve açıklama gerekli");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      iconUrl: form.iconUrl.trim() || undefined,
      triggerType: form.triggerType,
      requiredCount: Number(form.requiredCount) || 1,
    };
    try {
      if (editingId) {
        await updateBadge.mutateAsync({ id: editingId, ...payload });
        toast.success("Rozet güncellendi");
      } else {
        await createBadge.mutateAsync(payload);
        toast.success("Rozet oluşturuldu");
      }
      cancelForm();
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu rozeti silmek istediğine emin misin?")) return;
    try {
      await deleteBadge.mutateAsync(id);
      toast.success("Rozet silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  async function submitGrant(badgeId: string) {
    if (!selectedUserId) {
      toast.error("Bir kullanıcı seç");
      return;
    }
    try {
      await grantBadge.mutateAsync({ badgeId, userId: selectedUserId });
      toast.success("Rozet verildi");
      setGrantingBadgeId(null);
      setSelectedUserId("");
      setUserSearch("");
    } catch (err: any) {
      toast.error(err?.message ?? "Verilemedi");
    }
  }

  const filteredUsers = (userList?.data ?? []).filter((u) => {
    const q = userSearch.toLowerCase();
    if (!q) return true;
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  function renderForm() {
    return (
      <div className="rounded-xl border border-border bg-card-inner p-4 space-y-3">
        <input
          className={inputClass()}
          placeholder="Rozet adı"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <textarea
          className={inputClass()}
          placeholder="Açıklama"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="flex items-center gap-3">
          {form.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.iconUrl}
              alt="ikon önizleme"
              className="size-10 shrink-0 rounded-lg border border-border object-cover"
            />
          )}
          <input
            className={inputClass()}
            placeholder="İkon/PNG URL (opsiyonel)"
            value={form.iconUrl}
            onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className={inputClass()}
            value={form.triggerType}
            onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value as AdminBadge["triggerType"] }))}
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className={inputClass()}
            placeholder="Gerekli sayı"
            type="number"
            min={1}
            value={form.requiredCount}
            onChange={(e) => setForm((f) => ({ ...f, requiredCount: e.target.value }))}
          />
        </div>
        <p className="text-xs text-[#8D9BB6]">
          CUSTOM tipi otomatik tetiklenmez, sadece manuel "Ver" ile atanır. Diğer tipler ilgili sayaç
          gerekli sayıya ulaşınca otomatik verilir.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={submitForm} disabled={createBadge.isPending || updateBadge.isPending}>
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
          <h1 className="text-2xl font-semibold text-[#F5F8FF]">Rozetler</h1>
          <p className="text-sm text-[#8D9BB6]">Rozet tanımları ve manuel rozet verme.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {!showNew && !editingId && (
        <Button
          onClick={() => {
            setShowNew(true);
            setForm(EMPTY_FORM);
          }}
        >
          <Plus size={16} className="mr-1" /> Yeni Rozet
        </Button>
      )}

      {showNew && renderForm()}

      <div className="space-y-3">
        {loadingBadges ? (
          <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
        ) : !badges || badges.length === 0 ? (
          <p className="text-sm text-[#8D9BB6]">Henüz rozet yok.</p>
        ) : (
          badges.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {b.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.iconUrl}
                      alt={b.name}
                      className="size-9 shrink-0 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D9A44122]">
                      <Award size={18} color="#D9A441" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#F5F8FF]">{b.name}</p>
                    <p className="text-xs text-[#8D9BB6]">{b.description}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8D9BB6]">
                      {b.triggerType} · {b.requiredCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(b)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}>
                    <Trash2 size={14} className="text-danger" />
                  </Button>
                </div>
              </div>

              {editingId === b.id && renderForm()}

              {grantingBadgeId === b.id ? (
                <div className="space-y-2 rounded-xl border border-border bg-card-inner p-3">
                  <input
                    className={inputClass()}
                    placeholder="Kullanıcı ara (ad/kullanıcı adı/email)"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select
                    className={inputClass()}
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">Kullanıcı seç...</option>
                    {filteredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} (@{u.username})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submitGrant(b.id)} disabled={grantBadge.isPending}>
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGrantingBadgeId(null);
                        setSelectedUserId("");
                        setUserSearch("");
                      }}
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                editingId !== b.id && (
                  <Button size="sm" variant="outline" onClick={() => setGrantingBadgeId(b.id)}>
                    Kullanıcıya Ver
                  </Button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
