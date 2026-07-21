"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Lock, Download, Trash2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { profileSchema, type ProfileFormValues } from "@/lib/schemas/auth";
import {
  useUpdateProfile,
  useExportMyData,
  useRequestAccountDeletion,
} from "@/lib/hooks/use-profile";
import {
  useRequestPhoneVerification,
  useConfirmPhoneVerification,
} from "@/lib/hooks/use-verification";
import { countryCodes } from "@/lib/data/country-codes";
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
  ISSIZ: "İşsiz",
  SERBEST_MESLEK: "Serbest Meslek",
  OZEL_SEKTOR: "Özel Sektör Çalışanı",
  KAMU: "Kamu Çalışanı",
  YONETICI: "Yönetici",
};

function VerifyBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
      <ShieldCheck className="size-3" /> Doğrulanmış
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
      <ShieldX className="size-3" /> Doğrulanmamış
    </span>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const { mutate: exportData, isPending: exporting } = useExportMyData();
  const { mutate: requestDeletion, isPending: deleting } = useRequestAccountDeletion();
  const { mutate: requestPhoneCode, isPending: sendingCode } = useRequestPhoneVerification();
  const { mutate: confirmPhoneCode, isPending: confirmingCode } = useConfirmPhoneVerification();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const initialPhone = user?.phone ?? "";
  const initialDialCode = countryCodes.find((c) => initialPhone.startsWith(c.dialCode))?.dialCode ?? "+90";
  const initialLocalNumber = initialPhone.startsWith(initialDialCode)
    ? initialPhone.slice(initialDialCode.length)
    : "";
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialDialCode);
  const [phoneNumberDraft, setPhoneNumberDraft] = useState(initialLocalNumber);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");

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

  const savePhone = () => {
    updateProfile(
      { phone: `${phoneCountryCode}${phoneNumberDraft}` },
      {
        onSuccess: () => {
          toast.success("Telefon kaydedildi", { description: "Şimdi doğrulayabilirsin." });
          refreshUser();
        },
        onError: () => toast.error("Telefon kaydedilemedi."),
      }
    );
  };

  const sendCode = () => {
    requestPhoneCode(undefined, {
      onSuccess: (data: any) => {
        toast.info(data?.message ?? "Kod gönderildi");
        setShowCodeInput(true);
      },
      onError: () => toast.error("Kod gönderilemedi."),
    });
  };

  const confirmCode = () => {
    confirmPhoneCode(phoneCode, {
      onSuccess: () => {
        toast.success("Telefon doğrulandı");
        setShowCodeInput(false);
        refreshUser();
      },
      onError: () => toast.error("Kod hatalı ya da süresi dolmuş."),
    });
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
        <h1 className="text-2xl font-bold text-foreground">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
          <span className="text-sm text-muted-foreground">@{user?.username}</span>
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
        <p className="mt-4 text-xs text-muted-foreground">
          Yukarıdaki alanlar yalnızca yöneticiye talepte bulunmanız halinde değiştirilebilir.
        </p>
      </div>

      {/* İletişim — doğrulama durumuna göre kilitli/editable */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">İletişim Bilgileri</h3>

        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Email</Label>
              {user?.email && <VerifyBadge verified={!!user?.emailVerified} />}
            </div>
            <Input value={user?.email ?? "—"} disabled />
            {user?.email && !user?.emailVerified && (
              <span className="text-xs text-muted-foreground">
                Kayıt sırasında gönderilen doğrulama bağlantısına tıklayarak email'ini doğrula.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Telefon</Label>
              {user?.phone && <VerifyBadge verified={!!user?.phoneVerified} />}
            </div>

            {user?.phoneVerified ? (
              <Input value={user.phone ?? ""} disabled />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={phoneCountryCode} onValueChange={(v) => setPhoneCountryCode(v ?? "+90")}>
                    <SelectTrigger className="w-[92px] shrink-0">
                      <SelectValue>
                        {() => {
                          const selected = countryCodes.find((c) => c.dialCode === phoneCountryCode);
                          return selected ? `${selected.flag} ${selected.dialCode}` : "+90";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((c) => (
                        <SelectItem key={c.code} value={c.dialCode}>
                          {c.flag} {c.dialCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={phoneNumberDraft}
                    onChange={(e) => setPhoneNumberDraft(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    maxLength={10}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    variant="outline"
                    className="h-9 shrink-0"
                    disabled={saving || phoneNumberDraft.length !== 10}
                    onClick={savePhone}
                  >
                    Kaydet
                  </Button>
                </div>

                {user?.phone && !showCodeInput && (
                  <Button
                    variant="outline"
                    className="h-9 w-fit"
                    disabled={sendingCode}
                    onClick={sendCode}
                  >
                    {sendingCode ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                  </Button>
                )}

                {showCodeInput && (
                  <div className="flex gap-2">
                    <Input
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      placeholder="6 haneli kod"
                      maxLength={6}
                    />
                    <Button
                      className="h-9 shrink-0"
                      disabled={confirmingCode || phoneCode.length !== 6}
                      onClick={confirmCode}
                    >
                      {confirmingCode ? "Doğrulanıyor..." : "Doğrula"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kişisel Bilgiler — her zaman düzenlenebilir */}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Kişisel Bilgiler</h3>
        <p className="mt-1 text-xs text-muted-foreground">
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
        <h3 className="text-sm font-semibold text-foreground">Veri ve Gizlilik (KVKK)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
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
          <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
            <ShieldAlert className="size-3.5" /> Bu işlem geri alınamaz, emin olduğunda tekrar tıkla.
          </p>
        )}
      </div>
    </div>
  );
}
