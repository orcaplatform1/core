"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  Lock,
  Download,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Copy,
  Gift,
  UserX,
  KeyRound,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormValues,
  type ChangePasswordFormValues,
} from "@/lib/schemas/auth";
import {
  useUpdateProfile,
  useExportMyData,
  useRequestAccountDeletion,
  useMyBlockedList,
  useUnblockUser,
  useChangePassword,
} from "@/lib/hooks/use-profile";
import { useReferralStats } from "@/lib/hooks/use-referral";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const educationLabels: Record<string, string> = {
  ILKOGRETIM: "İlköğretim",
  LISE: "Lise",
  ONLISANS: "Önlisans",
  LISANS: "Lisans",
  DOKTORA: "Doktora",
};

const occupationLabels: Record<string, string> = {
  OGRENCI: "Öğrenci",
  ISSIZ: "Çalışmıyor",
  SERBEST_MESLEK: "Serbest Meslek",
  OZEL_SEKTOR: "Özel Sektör Çalışanı",
  KAMU: "Kamu Çalışanı",
  YONETICI: "Yönetici",
};

function VerifyBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-badge text-success">
      <ShieldCheck className="size-3" /> Doğrulanmış
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-badge text-danger">
      <ShieldX className="size-3" /> Doğrulanmamış
    </span>
  );
}

function BlockedUsersSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyBlockedList(page);
  const unblock = useUnblockUser();

  async function handleUnblock(userId: string, name: string) {
    try {
      await unblock.mutateAsync(userId);
      toast.success(`${name} için engel kaldırıldı`);
    } catch (err: any) {
      toast.error(err?.message ?? "Engel kaldırılamadı");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-card-title-sm text-foreground">
        <UserX className="size-4" /> Engellenenler
      </h3>
      <p className="mt-1 text-body-xs text-muted-foreground">Engellediğiniz kullanıcılar sizinle mesajlaşamaz, yorumlarınızı göremez.</p>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">Yükleniyor...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Henüz kimseyi engellemediniz.</p>
        ) : (
          data.data.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card-inner p-3"
            >
              <Link href={`/profile/${row.blocked.id}`} className="text-body-sm text-foreground hover:underline">
                {row.blocked.fullName}
                {row.blocked.username && (
                  <span className="ml-1 text-body-xs text-muted-foreground">@{row.blocked.username}</span>
                )}
              </Link>
              <Button
                size="sm"
                variant="outline"
                disabled={unblock.isPending}
                onClick={() => handleUnblock(row.blocked.id, row.blocked.fullName)}
              >
                Engeli Kaldır
              </Button>
            </div>
          ))
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`size-8 rounded-lg text-body-xs transition-colors duration-200 ${
                p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const { mutate: exportData, isPending: exporting } = useExportMyData();
  const { mutate: requestDeletion, isPending: deleting } = useRequestAccountDeletion();
  const { mutate: changePassword, isPending: changingPassword } = useChangePassword();
  const { data: referralStats } = useReferralStats();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const { register, handleSubmit, setValue, watch } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      dateOfBirth: (user?.dateOfBirth as string)?.slice(0, 10) ?? "",
      education: user?.education as ProfileFormValues["education"],
      occupation: user?.occupation as ProfileFormValues["occupation"],
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    const payload = { ...values, dateOfBirth: values.dateOfBirth || undefined };
    updateProfile(payload, {
      onSuccess: () => {
        toast.success("Profil güncellendi");
        refreshUser();
      },
      onError: () => toast.error("Güncelleme başarısız, tekrar dene."),
    });
  };

  const onChangePassword = (values: ChangePasswordFormValues) => {
    changePassword(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success("Şifren güncellendi");
          resetPasswordForm();
        },
        onError: (err: any) => toast.error(err?.message ?? "Şifre değiştirilemedi."),
      }
    );
  };

  const handleExport = () => {
    exportData(undefined, {
      onSuccess: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "orca-verilerim.json";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Verilerin indirildi");
      },
      onError: () => toast.error("Veri dışa aktarılamadı."),
    });
  };

  const copyReferralCode = () => {
    const code = referralStats?.code ?? user?.username;
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Referans kodun kopyalandı");
  };

  const handleDeletion = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    requestDeletion(undefined, {
      onSuccess: () => {
        toast.success("Hesap silme talebin alındı");
        logout();
      },
      onError: () => toast.error("Talep gönderilemedi, tekrar dene."),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h1 text-foreground">Profil</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Hesap bilgilerini görüntüle, düzenlenebilir alanları güncelle.
        </p>
      </div>

      {/* Kimlik — kalıcı kilitli */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="size-28 ring-2 ring-primary/25">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.fullName} />
            <AvatarFallback className="text-2xl">
              {user?.fullName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-body-sm text-muted-foreground">@{user?.username}</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3.5" /> Ad Soyad
            </Label>
            <Input value={user?.fullName ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3.5" /> Kullanıcı Adı
            </Label>
            <Input value={user?.username ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3.5" /> Cinsiyet
            </Label>
            <Input
              value={user?.gender === "ERKEK" ? "Erkek" : user?.gender === "KADIN" ? "Kadın" : "—"}
              disabled
            />
          </div>
        </div>
        <p className="mt-4 text-body-xs text-muted-foreground">
          Yukarıdaki alanlar yalnızca yöneticiye talepte bulunmanız halinde değiştirilebilir.
        </p>
      </div>

      {/* Referans Programı */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-6">
        <div className="flex items-center gap-2">
          <Gift className="size-4 text-primary" />
          <h3 className="text-card-title-sm text-foreground">Sadakat Programı</h3>
        </div>
        <p className="mt-1 text-body-xs text-muted-foreground">
          Referans kodun kullanıcı adın — arkadaşların kayıt olurken bu kodu girerse %15 indirim
          kazanır, ödemesini tamamladığında sana 50 Mentor Kredisi hediye edilir.
        </p>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
            <span className="text-body-xs text-muted-foreground">Referans kodun:</span>
            <span className="text-financial text-primary">
              {referralStats?.code ?? user?.username}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={copyReferralCode}
              aria-label="Referans kodunu kopyala"
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-num-md text-foreground">{referralStats?.invitedCount ?? 0}</p>
              <p className="text-body-xs text-muted-foreground">davet edilen</p>
            </div>
            <div className="text-center">
              <p className="text-num-md text-success">{referralStats?.creditsEarned ?? 0}</p>
              <p className="text-body-xs text-muted-foreground">kredi kazanıldı</p>
            </div>
          </div>
        </div>
      </div>

      {/* İletişim — kalıcı kilitli, değişiklik destek merkezi üzerinden */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-card-title-sm text-foreground">İletişim Bilgileri</h3>

        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="size-3.5" /> Email
              </Label>
              {user?.email && <VerifyBadge verified={!!user?.emailVerified} />}
            </div>
            <Input value={user?.email ?? "—"} disabled />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="size-3.5" /> Telefon
              </Label>
              {user?.phone && <VerifyBadge verified={!!user?.phoneVerified} />}
            </div>
            <Input value={user?.phone ?? "—"} disabled />
          </div>
        </div>

        <p className="mt-4 text-body-xs text-muted-foreground">
          Email veya telefonunu değiştirmek için Destek Merkezi&apos;ne talep oluştur.
        </p>
        <Link href="/support?category=EMAIL_PHONE_CHANGE" className="mt-3 inline-block">
          <Button variant="outline" className="h-10">
            <LifeBuoy className="size-4" /> Destek Merkezi&apos;ne Git
          </Button>
        </Link>
      </div>

      {/* Şifre Değiştir */}
      <form
        onSubmit={handlePasswordSubmit(onChangePassword)}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="flex items-center gap-2 text-card-title-sm text-foreground">
          <KeyRound className="size-4" /> Şifre Değiştir
        </h3>
        <p className="mt-1 text-body-xs text-muted-foreground">
          Hesap güvenliğin için şifreni düzenli olarak güncelle.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="currentPassword">Mevcut Şifre</Label>
            <Input id="currentPassword" type="password" {...registerPassword("currentPassword")} />
            {passwordErrors.currentPassword && (
              <span className="text-body-xs text-danger">{passwordErrors.currentPassword.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">Yeni Şifre</Label>
            <Input id="newPassword" type="password" {...registerPassword("newPassword")} />
            {passwordErrors.newPassword && (
              <span className="text-body-xs text-danger">{passwordErrors.newPassword.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="newPasswordConfirm">Yeni Şifre (Tekrar)</Label>
            <Input id="newPasswordConfirm" type="password" {...registerPassword("newPasswordConfirm")} />
            {passwordErrors.newPasswordConfirm && (
              <span className="text-body-xs text-danger">{passwordErrors.newPasswordConfirm.message}</span>
            )}
          </div>
        </div>

        <Button type="submit" disabled={changingPassword} className="mt-6 h-11">
          {changingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </Button>
      </form>

      {/* Kişisel Bilgiler — her zaman düzenlenebilir */}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-card-title-sm text-foreground">Kişisel Bilgiler</h3>
        <p className="mt-1 text-body-xs text-muted-foreground">
          Bu alanlar dilediğin zaman güncellenebilir.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dateOfBirth">Doğum Tarihi</Label>
            <Input id="dateOfBirth" type="date" min="1966-01-01" max="2010-12-31" {...register("dateOfBirth")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Eğitim Durumu</Label>
            <Select
              value={watch("education")}
              onValueChange={(v) => setValue("education", v as ProfileFormValues["education"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(educationLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Meslek</Label>
            <Select
              value={watch("occupation")}
              onValueChange={(v) => setValue("occupation", v as ProfileFormValues["occupation"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(occupationLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="mt-6 h-11">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-card-title-sm text-foreground">Veri ve Gizlilik (KVKK)</h3>
        <p className="mt-1 text-body-xs text-muted-foreground">
          Kişisel verilerinle ilgili haklarını buradan kullanabilirsin.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="h-11" disabled={exporting} onClick={handleExport}>
            <Download className="size-4" /> {exporting ? "Hazırlanıyor..." : "Verilerimi İndir"}
          </Button>
          <Button variant="destructive" className="h-11" disabled={deleting} onClick={handleDeletion}>
            <Trash2 className="size-4" />
            {confirmDelete ? "Emin misin? Tekrar tıkla" : "Hesap Silme Talebi Oluştur"}
          </Button>
        </div>
        {confirmDelete && (
          <p className="mt-3 flex items-center gap-1.5 text-body-xs text-danger">
            <ShieldAlert className="size-3.5" /> Bu işlem geri alınamaz, emin olduğunda tekrar tıkla.
          </p>
        )}
      </div>

      <BlockedUsersSection />
    </div>
  );
}
