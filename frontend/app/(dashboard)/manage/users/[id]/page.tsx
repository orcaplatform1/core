"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useUserDetail,
  useAdminUpdateIdentity,
  useAdminUpdateProfile,
  useAdjustMentorCredits,
  useBanUser,
  useResetBanCount,
  useUnbanUser,
  useRevokeEnrollment,
  useAdminDeleteUser,
} from "@/lib/hooks/use-admin-users";
const EDUCATION = ["ILKOGRETIM", "LISE", "ONLISANS", "LISANS", "DOKTORA"];
const OCCUPATION = ["OGRENCI", "ISSIZ", "SERBEST_MESLEK", "OZEL_SEKTOR", "KAMU", "YONETICI"];
const GENDER = ["ERKEK", "KADIN"];
export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user: me, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch } = useUserDetail(id);
  const updateIdentity = useAdminUpdateIdentity(id);
  const updateProfile = useAdminUpdateProfile(id);
  const adjustCredits = useAdjustMentorCredits(id);
  const banUser = useBanUser(id);
  const resetBanCount = useResetBanCount(id);
  const unban = useUnbanUser();
  const revokeEnrollment = useRevokeEnrollment(id);
  const deleteUser = useAdminDeleteUser();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [education, setEducation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [banDays, setBanDays] = useState("3");
  const [creditDelta, setCreditDelta] = useState("100");
  const [formInit, setFormInit] = useState(false);
  const u = data?.user;
  if (u && !formInit) {
    setFullName(u.fullName ?? "");
    setUsername(u.username ?? "");
    setEmail(u.email ?? "");
    setPhone(u.phone ?? "");
    setDateOfBirth(u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : "");
    setEducation(u.education ?? "");
    setOccupation(u.occupation ?? "");
    setGender(u.gender ?? "");
    setFormInit(true);
  }
  if (authLoading || isLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }
  if (!u) {
    return <p className="text-sm text-[#A8A6A0]">Kullanıcı bulunamadı.</p>;
  }
  async function saveIdentity() {
    try {
      await updateIdentity.mutateAsync({ fullName, username });
      toast.success("Kimlik bilgileri güncellendi");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }
  async function saveProfile() {
    try {
      await updateProfile.mutateAsync({
        email: email || undefined,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        education: education || undefined,
        occupation: occupation || undefined,
        gender: gender || undefined,
      });
      toast.success("Profil güncellendi");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }
  async function handleAdjustCredits(sign: 1 | -1) {
    const delta = parseInt(creditDelta) * sign;
    if (!delta) return;
    try {
      await adjustCredits.mutateAsync(delta);
      toast.success("Mentor kredisi güncellendi");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }
  async function handleBan() {
    const days = parseInt(banDays);
    if (!days || days < 1) return;
    try {
      await banUser.mutateAsync(days);
      toast.success(`${days} gün banlandı`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Banlanamadı");
    }
  }
  async function handleUnban() {
    try {
      await unban.mutateAsync(id);
      toast.success("Ban kaldırıldı");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Kaldırılamadı");
    }
  }
  async function handleResetBanCount() {
    try {
      await resetBanCount.mutateAsync();
      toast.success("Ban sayacı sıfırlandı");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Sıfırlanamadı");
    }
  }
  async function handleRevokeEnrollment(programId: string) {
    try {
      await revokeEnrollment.mutateAsync(programId);
      toast.success("Erişim iptal edildi");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "İptal edilemedi");
    }
  }
  async function handleDelete() {
    if (!window.confirm("Bu kullanıcıyı silmek (anonimleştirmek) istediğine emin misin? Bu işlem geri alınamaz.")) return;
    try {
      await deleteUser.mutateAsync(id);
      toast.success("Kullanıcı silindi");
      router.push("/manage/users");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }
  const isBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/manage/users")}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">{u.fullName}</h1>
          <p className="text-sm text-[#A8A6A0]">@{u.username} · {u.role}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Kimlik Bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Ad Soyad</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kullanıcı Adı</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <Button size="sm" disabled={updateIdentity.isPending} onClick={saveIdentity}>Kaydet</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">İletişim &amp; Profil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Doğum Tarihi</Label>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cinsiyet</Label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-8 w-full rounded-lg border border-border bg-card-inner px-2.5 text-sm text-[#A8A6A0] outline-none">
              <option value="">Seç</option>
              {GENDER.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Eğitim</Label>
            <select value={education} onChange={(e) => setEducation(e.target.value)} className="h-8 w-full rounded-lg border border-border bg-card-inner px-2.5 text-sm text-[#A8A6A0] outline-none">
              <option value="">Seç</option>
              {EDUCATION.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Meslek</Label>
            <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="h-8 w-full rounded-lg border border-border bg-card-inner px-2.5 text-sm text-[#A8A6A0] outline-none">
              <option value="">Seç</option>
              {OCCUPATION.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-[#A8A6A0]">Not: email/telefon burada değiştirilirse doğrulanmış sayılır (verification bypass).</p>
        <Button size="sm" disabled={updateProfile.isPending} onClick={saveProfile}>Kaydet</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Mentor Kredisi</h2>
        <p className="text-sm text-[#A8A6A0]">Bakiye: <span className="font-semibold">{u.mentorCredits}</span></p>
        <div className="flex items-center gap-2">
          <Input type="number" value={creditDelta} onChange={(e) => setCreditDelta(e.target.value)} className="w-24" />
          <Button size="sm" variant="outline" disabled={adjustCredits.isPending} onClick={() => handleAdjustCredits(1)}>Ekle</Button>
          <Button size="sm" variant="outline" disabled={adjustCredits.isPending} onClick={() => handleAdjustCredits(-1)}>Çıkar</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Ban Durumu</h2>
        <p className="text-sm text-[#A8A6A0]">
          Durum: {isBanned ? <span className="text-[#EF4444]">Banlı ({new Date(u.bannedUntil).toLocaleDateString("tr-TR")}'e kadar)</span> : <span className="text-[#22C55E]">Banlı değil</span>}
          {" · "}Toplam ban sayısı: {u.banCount}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" value={banDays} onChange={(e) => setBanDays(e.target.value)} className="w-20" />
          <Button size="sm" variant="outline" disabled={banUser.isPending} onClick={handleBan}>Banla (gün)</Button>
          {isBanned && <Button size="sm" variant="outline" disabled={unban.isPending} onClick={handleUnban}>Ban Kaldır</Button>}
          <Button size="sm" variant="outline" disabled={resetBanCount.isPending} onClick={handleResetBanCount}>Ban Sayacını Sıfırla</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Program Erişimleri</h2>
        {data?.enrollments?.length ? (
          <div className="space-y-2">
            {data.enrollments.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-[#A8A6A0]">{e.programId}</span>
                <Button size="sm" variant="outline" onClick={() => handleRevokeEnrollment(e.programId)}>İptal Et</Button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A6A0]">Erişim yok.</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Ödeme Geçmişi</h2>
        {data?.payments?.length ? (
          <div className="space-y-2">
            {data.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm text-[#A8A6A0]">
                <span>{p.amount} {p.currency} · {p.method}</span>
                <span className="text-xs text-[#A8A6A0]">{p.status}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A6A0]">Ödeme kaydı yok.</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Quiz Sonuçları</h2>
        {data?.quizAttempts?.length ? (
          <div className="space-y-2">
            {data.quizAttempts.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between text-sm text-[#A8A6A0]">
                <span>%{q.percentage} · {q.grade ?? "-"}</span>
                <span className="text-xs text-[#A8A6A0]">{q.passed ? "Geçti" : "Kaldı"}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A6A0]">Quiz kaydı yok.</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Sertifikalar</h2>
        {data?.certificates?.length ? (
          <div className="space-y-2">
            {data.certificates.map((c: any) => (
              <div key={c.id} className="text-sm text-[#A8A6A0]">#{c.number} · {c.code}</div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A6A0]">Sertifika yok.</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Giriş Logları</h2>
        {data?.loginLogs?.length ? (
          <div className="space-y-2">
            {data.loginLogs.map((l: any) => (
              <div key={l.id} className="text-xs text-[#A8A6A0]">
                {new Date(l.loggedInAt).toLocaleString("tr-TR")} · {l.userAgent ?? "bilinmiyor"}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A6A0]">Giriş kaydı yok.</p>}
      </div>

      <div className="rounded-2xl border border-[#EF4444]/40 bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#EF4444]">Tehlikeli Bölge</h2>
        <Button size="sm" variant="outline" className="border-[#EF4444] text-[#EF4444]" disabled={deleteUser.isPending} onClick={handleDelete}>
          Kullanıcıyı Sil (Anonimleştir)
        </Button>
      </div>
    </div>
  );
}
