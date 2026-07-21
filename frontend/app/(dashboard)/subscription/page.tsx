"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Landmark,
  Bitcoin,
  Check,
  Clock,
  Upload,
  Copy,
  Lock,
} from "lucide-react";
import { useMyEnrollments } from "@/lib/hooks/use-curriculum";
import { useProgramPrice, useMyPayments, useCreatePayment } from "@/lib/hooks/use-payments";
import { uploadReceipt } from "@/lib/hooks/use-storage";
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

const features = [
  "5 eğitim programı, tüm modüller — sınırsız ömür boyu erişim",
  "AI Mentor (günlük 10 ücretsiz soru)",
  "Simülasyon ve Backtest araçları",
  "Quiz sistemi ve ilerleme takibi",
  "Tamamlayınca mezuniyet sertifikası",
];

const BANK_DETAILS = {
  bankName: "———— Bankası",
  accountHolder: "ORCA TRADERS EĞİTİM A.Ş.",
  iban: "TR00 0000 0000 0000 0000 0000 00",
};

type View = "package" | "card" | "bank-transfer";

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function SubscriptionPage() {
  const { data: enrollments } = useMyEnrollments();
  const { data: priceData, isLoading: loadingPrice } = useProgramPrice();
  const { data: payments, isLoading: loadingPayments } = useMyPayments();
  const { mutate: createPayment, isPending } = useCreatePayment();

  const [cryptoNoticeOpen, setCryptoNoticeOpen] = useState(false);
  const [view, setView] = useState<View>("package");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const owned = !!enrollments && enrollments.length > 0;
  const cardFormValid =
    cardName.trim().length > 2 &&
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardExpiry.length === 5 &&
    cardCvv.length >= 3;

  const copyIban = () => {
    navigator.clipboard.writeText(BANK_DETAILS.iban.replace(/\s/g, ""));
    toast.success("IBAN kopyalandı");
  };

  const submitCard = () => {
    // Kart bilgileri (numara/CVV) backend'e ASLA gönderilmiyor — gerçek ödeme
    // sağlayıcısı (örn. iyzico) bağlanınca bu alanlar doğrudan sağlayıcının
    // kendi güvenli arayüzüne/SDK'sına gidecek, bize hiç uğramayacak.
    // Şimdilik sadece yöntem bilgisiyle bekleyen bir ödeme kaydı oluşturuluyor.
    createPayment(
      { currency: "TRY", method: "CARD" },
      {
        onSuccess: () => {
          toast.success("Ödeme talebin oluşturuldu", {
            description: "Kart altyapımız tamamlandığında işlemin otomatik tamamlanacak.",
          });
          setView("package");
          setCardName("");
          setCardNumber("");
          setCardExpiry("");
          setCardCvv("");
        },
        onError: () => toast.error("Ödeme talebi oluşturulamadı, tekrar dene."),
      }
    );
  };

  const submitBankTransfer = async () => {
    if (!receiptFile) {
      toast.error("Lütfen dekont dosyasını yükle.");
      return;
    }
    setUploading(true);
    try {
      const key = await uploadReceipt(receiptFile);
      createPayment(
        { currency: "TRY", method: "BANK_TRANSFER", receiptUrl: key },
        {
          onSuccess: () => {
            toast.success("Ödeme talebin oluşturuldu", {
              description: "Dekontun incelenip onaylandığında erişimin otomatik açılacak.",
            });
            setView("package");
            setReceiptFile(null);
          },
          onError: () => toast.error("Ödeme talebi oluşturulamadı, tekrar dene."),
        }
      );
    } catch {
      toast.error("Dekont yüklenemedi, tekrar dene.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Abonelik</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ORCA TRADERS eğitim paketine tek seferlik, ömür boyu erişim.
        </p>
      </div>

      {owned ? (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
          <Check className="mx-auto size-10 text-success" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            Zaten tüm eğitim paketine sahipsin
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Eğitimlerim sayfasından derslerine devam edebilirsin.
          </p>
        </div>
      ) : view === "package" ? (
        <div className="rounded-2xl border border-primary/20 bg-card p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-foreground">ORCA TRADERS Eğitim Paketi</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tek seferlik ödeme, ömür boyu erişim</p>
            </div>
            <div className="text-right">
              {loadingPrice ? (
                <div className="h-9 w-28 animate-pulse rounded-lg bg-secondary" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  {priceData?.programPriceTRY.toLocaleString("tr-TR")} ₺
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 border-t border-border pt-6">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {f}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-6 sm:grid-cols-3">
            <button
              onClick={() => setView("card")}
              className="card-inner flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors duration-200 hover:bg-[var(--card-hover)]"
            >
              <CreditCard className="size-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Kredi/Banka Kartı</span>
            </button>
            <button
              onClick={() => setCryptoNoticeOpen(true)}
              className="card-inner flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors duration-200 hover:bg-[var(--card-hover)]"
            >
              <Bitcoin className="size-6 text-warning" />
              <span className="text-sm font-medium text-foreground">Kripto</span>
              <div className="flex gap-1">
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                  BTC
                </span>
                <span className="rounded-full bg-purple/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple">
                  ETH
                </span>
                <span className="rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange">
                  BNB
                </span>
              </div>
            </button>
            <button
              onClick={() => setView("bank-transfer")}
              className="card-inner flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors duration-200 hover:bg-[var(--card-hover)]"
            >
              <Landmark className="size-6 text-success" />
              <span className="text-sm font-medium text-foreground">Banka Havalesi / EFT</span>
            </button>
          </div>
        </div>
      ) : view === "card" ? (
        <div className="rounded-2xl border border-primary/20 bg-card p-8">
          <button
            onClick={() => setView("package")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Geri
          </button>

          <h2 className="mt-3 text-lg font-semibold text-foreground">Kredi/Banka Kartı</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Kart bilgilerin sunucularımızda saklanmaz.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cardName">Kart Üzerindeki İsim</Label>
              <Input id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cardNumber">Kart Numarası</Label>
              <Input
                id="cardNumber"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cardExpiry">Son Kullanma (AA/YY)</Label>
                <Input
                  id="cardExpiry"
                  inputMode="numeric"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="AA/YY"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cardCvv">CVV</Label>
                <Input
                  id="cardCvv"
                  inputMode="numeric"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="000"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
            <span className="text-sm text-muted-foreground">Ödenecek Tutar</span>
            <span className="text-xl font-bold text-foreground">
              {priceData?.programPriceTRY.toLocaleString("tr-TR")} ₺
            </span>
          </div>

          <Button className="mt-4 h-11 w-full" disabled={!cardFormValid || isPending} onClick={submitCard}>
            {isPending ? "Gönderiliyor..." : "Ödemeyi Tamamla"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-card p-8">
          <button
            onClick={() => setView("package")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Geri
          </button>

          <h2 className="mt-3 text-lg font-semibold text-foreground">Banka Havalesi / EFT</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aşağıdaki hesaba{" "}
            <strong className="text-foreground">
              {priceData?.programPriceTRY.toLocaleString("tr-TR")} ₺
            </strong>{" "}
            gönderip dekontunu yükle — onaylandığında erişimin otomatik açılır.
          </p>

          <div className="card-inner mt-5 flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Banka</span>
              <span className="text-sm font-medium text-foreground">{BANK_DETAILS.bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Hesap Sahibi</span>
              <span className="text-sm font-medium text-foreground">{BANK_DETAILS.accountHolder}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">IBAN</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{BANK_DETAILS.iban}</span>
                <button onClick={copyIban} aria-label="IBAN'ı kopyala">
                  <Copy className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Dekont (PDF veya görsel)</label>
            <label className="card-inner flex cursor-pointer flex-col items-center gap-2 rounded-xl p-6 text-center transition-colors duration-200 hover:bg-[var(--card-hover)]">
              <Upload className="size-5 text-primary" />
              <span className="text-xs text-muted-foreground">
                {receiptFile ? receiptFile.name : "Dosya seçmek için tıkla"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <Button
            className="mt-6 h-11 w-full"
            disabled={uploading || isPending || !receiptFile}
            onClick={submitBankTransfer}
          >
            {uploading || isPending ? "Gönderiliyor..." : "Dekontu Gönder"}
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Ödeme Geçmişi</h3>
        <div className="mt-4 flex flex-col gap-2">
          {loadingPayments ? (
            <div className="h-16 animate-pulse rounded-xl bg-secondary" />
          ) : !payments || payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz bir ödeme kaydın yok.</p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {p.amount.toLocaleString("tr-TR")} {p.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                    {p.method === "CARD" ? "Kart" : p.method === "CRYPTO" ? "Kripto" : "Havale/EFT"}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.status === "APPROVED"
                      ? "bg-success/15 text-success"
                      : p.status === "REJECTED"
                        ? "bg-danger/15 text-danger"
                        : "bg-warning/15 text-warning"
                  }`}
                >
                  {p.status === "PENDING" && <Clock className="size-3" />}
                  {p.status === "APPROVED" ? "Onaylandı" : p.status === "REJECTED" ? "Reddedildi" : "Bekliyor"}
                </span>
              </div>
            ))
          )}
        </div>
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
