"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Landmark, Bitcoin, Smartphone, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMentorQuota } from "@/lib/hooks/use-mentor";
import { useCreatePayment } from "@/lib/hooks/use-payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const packages: { amount: 100 | 250 | 500; price: number; badge?: string }[] = [
  { amount: 100, price: 149 },
  { amount: 250, price: 299, badge: "En Popüler" },
  { amount: 500, price: 499, badge: "En Avantajlı" },
];

const operators = [
  { value: "TURKCELL", label: "Turkcell" },
  { value: "VODAFONE", label: "Vodafone" },
  { value: "TURK_TELEKOM", label: "Türk Telekom" },
];

type Method = "CARD" | "BANK_TRANSFER" | "MOBILE";
type Operator = "TURKCELL" | "VODAFONE" | "TURK_TELEKOM";

export default function MentorCreditsPage() {
  const { user } = useAuth();
  const { data: quota } = useMentorQuota();
  const { mutate: createPayment, isPending } = useCreatePayment();
  const [method, setMethod] = useState<Method>("CARD");
  const [cryptoNoticeOpen, setCryptoNoticeOpen] = useState(false);
  const [operator, setOperator] = useState<Operator>("TURKCELL");
  const [mobilePhone, setMobilePhone] = useState(user?.phone ?? "");

  const buy = (amount: 100 | 250 | 500) => {
    if (method === "MOBILE" && !mobilePhone) {
      toast.error("Telefon numaranı gir.");
      return;
    }
    createPayment(
      {
        currency: "TRY",
        method,
        purpose: "MENTOR_CREDITS",
        creditAmount: amount,
        ...(method === "MOBILE" ? { mobileOperator: operator, mobilePhone } : {}),
      },
      {
        onSuccess: () =>
          toast.success("Kredi talebin oluşturuldu", {
            description:
              method === "MOBILE"
                ? "Tutar operatör faturana yansıtılacak, onaylandığında kredilerin tanımlanacak."
                : "Ödeme Geçmişi sayfasından takip edebilirsin.",
          }),
        onError: () => toast.error("Talep oluşturulamadı, tekrar dene."),
      }
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Sparkles className="size-6 text-purple" /> Mentor Kredi Satın Al
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Günlük ücretsiz hakkın bittiğinde AI Mentor'a devam etmek için kredi al.
          {quota ? ` Mevcut kredin: ${quota.mentorCredits}.` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMethod("CARD")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
            method === "CARD" ? "bg-primary text-primary-foreground" : "card-inner text-foreground"
          }`}
        >
          <CreditCard className="size-4" /> Kart
        </button>
        <button
          onClick={() => setMethod("BANK_TRANSFER")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
            method === "BANK_TRANSFER" ? "bg-primary text-primary-foreground" : "card-inner text-foreground"
          }`}
        >
          <Landmark className="size-4" /> Havale/EFT
        </button>
        <button
          onClick={() => setMethod("MOBILE")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
            method === "MOBILE" ? "bg-primary text-primary-foreground" : "card-inner text-foreground"
          }`}
        >
          <Smartphone className="size-4" /> Mobil Ödeme
        </button>
        <button
          onClick={() => setCryptoNoticeOpen(true)}
          className="card-inner flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground"
        >
          <Bitcoin className="size-4 text-warning" /> Kripto
        </button>
      </div>

      {method === "BANK_TRANSFER" && (
        <p className="text-xs text-muted-foreground">
          Havale seçersen talep oluştuktan sonra Ödeme Geçmişi&apos;nden dekont yükleme adımını
          takip edebilirsin.
        </p>
      )}
      {method === "CARD" && (
        <p className="text-xs text-muted-foreground">
          Kart bilgin şu an alınmıyor — talep oluşturulduktan sonra ekibimiz seninle iletişime
          geçip ödemeni tamamlayacak (gerçek kart altyapısı yakında otomatikleşecek).
        </p>
      )}
      {method === "MOBILE" && (
        <div className="card-inner flex flex-col gap-4 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">
            Tutar, seçtiğin operatörün faturana veya kontör bakiyene yansıtılır (altyapı
            entegrasyonu tamamlandığında otomatik işleyecek).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Operatör</Label>
              <Select value={operator} onValueChange={(v) => setOperator(v as Operator)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mobilePhone">Telefon Numarası</Label>
              <Input
                id="mobilePhone"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.amount}
            className="relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center"
          >
            {pkg.badge && (
              <span className="absolute -top-3 rounded-full bg-purple px-3 py-1 text-xs font-semibold text-white">
                {pkg.badge}
              </span>
            )}
            <p className="text-3xl font-bold text-foreground">{pkg.amount}</p>
            <p className="text-xs text-muted-foreground">kredi</p>
            <p className="text-xl font-semibold text-primary">{pkg.price} ₺</p>
            <Button
              className="mt-2 h-10 w-full"
              disabled={isPending}
              onClick={() => buy(pkg.amount)}
            >
              Satın Al
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={cryptoNoticeOpen} onOpenChange={setCryptoNoticeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kripto Ödeme Şu An Aktif Değil</AlertDialogTitle>
            <AlertDialogDescription>
              Altyapımız BTC/ETH/BNB ile ödeme almaya uygun şekilde dizayn edilmiştir. Fakat, henüz
              ülkemizdeki regülasyonlar kripto para ile ödeme almanın önüne yasal engel
              oluşturmaktadır. Bu nedenle şimdilik Kart veya EFT/Havale yolu ile satın alım
              gerçekleştirebilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCryptoNoticeOpen(false)}>Tamam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
