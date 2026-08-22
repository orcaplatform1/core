"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Rocket, Gift, TrendingUp, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useSponsorshipPricing,
  useCreateSponsorship,
  useCreateSponsorshipPayment,
  type SponsorshipType,
} from "@/lib/hooks/use-sponsorships";

type Duration = 7 | 15 | 30;
type CryptoProvider = "BINANCE" | "BYBIT" | "OKX";
type CryptoAsset = "BTC" | "ETH" | "BNB" | "USDT";

function inputClass() {
  return "w-full rounded-xl border border-border bg-card-inner px-3 py-2 text-body-sm text-foreground/90 outline-none focus:border-primary";
}

function labelClass() {
  return "mb-1 block text-body-xs font-medium text-muted-foreground";
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass()}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}

const ICO_EMPTY = {
  name: "",
  tokenSymbol: "",
  blockchain: "",
  category: "",
  saleType: "",
  launchpad: "",
  launchpadUrl: "",
  websiteUrl: "",
  logo: "",
  description: "",
  tokenPrice: "",
  hardCapUsd: "",
  valuationUsd: "",
  allocationDetails: "",
  requiresKYC: false,
  requiresWhitelist: false,
  twitter: "",
  telegram: "",
  discord: "",
  startDate: "",
  endDate: "",
};

const AIRDROP_EMPTY = {
  title: "",
  projectName: "",
  blockchain: "",
  category: "",
  rewardType: "",
  logo: "",
  banner: "",
  website: "",
  description: "",
  estimatedReward: "",
  estimatedValueUSD: "",
  difficulty: "MEDIUM",
  completionTime: "",
  requiresKYC: false,
  requiresWallet: true,
  requiresDiscord: false,
  requiresTwitter: false,
  requiresTelegram: false,
  twitter: "",
  discord: "",
  telegram: "",
  documentation: "",
  startDate: "",
  endDate: "",
};

function buildFormData(type: SponsorshipType, ico: typeof ICO_EMPTY, airdrop: typeof AIRDROP_EMPTY) {
  if (type === "ICO") {
    const out: Record<string, unknown> = { ...ico };
    for (const key of ["tokenPrice", "hardCapUsd", "valuationUsd"]) {
      const v = ico[key as keyof typeof ico];
      out[key] = v === "" ? undefined : Number(v);
    }
    return out;
  }
  const out: Record<string, unknown> = { ...airdrop };
  out.estimatedValueUSD = airdrop.estimatedValueUSD === "" ? undefined : Number(airdrop.estimatedValueUSD);
  return out;
}

export default function SponsorPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: pricing } = useSponsorshipPricing();
  const createSponsorship = useCreateSponsorship();
  const createPayment = useCreateSponsorshipPayment();

  const [type, setType] = useState<SponsorshipType>("ICO");
  const [duration, setDuration] = useState<Duration>(7);
  const [contactName, setContactName] = useState(user?.fullName ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactTelegram, setContactTelegram] = useState("");
  const [icoForm, setIcoForm] = useState(ICO_EMPTY);
  const [airdropForm, setAirdropForm] = useState(AIRDROP_EMPTY);
  const [provider, setProvider] = useState<CryptoProvider>("BINANCE");
  const [asset, setAsset] = useState<CryptoAsset>("USDT");
  const [submitting, setSubmitting] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{ walletAddress: string; network: string; note: string } | null>(null);

  function updateIco<K extends keyof typeof ICO_EMPTY>(key: K, value: (typeof ICO_EMPTY)[K]) {
    setIcoForm((f) => ({ ...f, [key]: value }));
  }
  function updateAirdrop<K extends keyof typeof AIRDROP_EMPTY>(key: K, value: (typeof AIRDROP_EMPTY)[K]) {
    setAirdropForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePay() {
    if (!contactName.trim() || !contactEmail.trim()) {
      toast.error("İletişim adı ve e-posta zorunlu.");
      return;
    }
    if (type === "ICO" && !icoForm.name.trim()) {
      toast.error("Proje adı zorunlu.");
      return;
    }
    if (type === "AIRDROP" && (!airdropForm.title.trim() || !airdropForm.projectName.trim() || !airdropForm.blockchain.trim() || !airdropForm.category.trim() || !airdropForm.rewardType.trim())) {
      toast.error("Başlık, proje adı, zincir, kategori ve ödül türü zorunlu.");
      return;
    }

    setSubmitting(true);
    try {
      const sponsorship = await createSponsorship.mutateAsync({
        type,
        durationDays: duration,
        contactName,
        contactEmail,
        contactTelegram: contactTelegram || undefined,
        formData: buildFormData(type, icoForm, airdropForm),
      });

      const payment = await createPayment.mutateAsync({
        sponsorshipId: sponsorship.id,
        cryptoProvider: provider,
        cryptoAsset: asset,
      });

      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      if (payment.walletInfo) {
        setWalletInfo(payment.walletInfo);
        toast.success("Başvurun oluşturuldu, ödeme talimatları aşağıda.");
        return;
      }
      toast.success("Başvurun ve ödeme kaydın oluşturuldu, admin onayı bekleniyor.");
      router.push("/tools/crypto/" + (type === "ICO" ? "ico" : "airdrops"));
    } catch (err: any) {
      toast.error(err?.message ?? "Bir şeyler ters gitti, tekrar dene.");
    } finally {
      setSubmitting(false);
    }
  }

  const price = pricing?.[duration];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-success/12 text-success">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h1 className="text-h1 text-foreground">Sponsor Ol</h1>
            <p className="text-body-sm text-muted-foreground">ICO/IDO veya Airdrop projeni öne çıkar.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-xl bg-card-inner p-3">
            <TrendingUp className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-body-xs text-foreground/80">
              Projen, seçtiğin süre boyunca ICO/Airdrop listesinin <span className="font-semibold text-foreground">en üstünde</span>{" "}
              #Ads etiketiyle sabitlenir.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card-inner p-3">
            <Bell className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-body-xs text-foreground/80">
              Onaylandığında <span className="font-semibold text-foreground">platformdaki tüm kullanıcılara</span> anlık bildirim gider.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card-inner p-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-body-xs text-foreground/80">Ödeme onaylanır onaylanmaz başvurun admin incelemesine düşer, kısa sürede yayına alınır.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([7, 15, 30] as Duration[]).map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                duration === d ? "border-success bg-success/10" : "border-border bg-card-inner hover:border-success/50"
              }`}
            >
              <p className="text-card-title-sm text-foreground">{d} Gün</p>
              <p className="mt-1 text-financial text-success">{pricing ? `$${pricing[d]}` : "..."}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex rounded-xl border border-border overflow-hidden w-fit">
          <button
            onClick={() => setType("ICO")}
            className={`flex items-center gap-1.5 px-4 py-2 text-body-sm ${type === "ICO" ? "bg-success text-white" : "bg-card-inner text-muted-foreground"}`}
          >
            <Rocket className="size-4" /> ICO / IDO
          </button>
          <button
            onClick={() => setType("AIRDROP")}
            className={`flex items-center gap-1.5 px-4 py-2 text-body-sm ${type === "AIRDROP" ? "bg-success text-white" : "bg-card-inner text-muted-foreground"}`}
          >
            <Gift className="size-4" /> Airdrop
          </button>
        </div>

        <div>
          <h2 className="text-h2 text-foreground">İletişim Bilgilerin</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Ad Soyad" required>
              <input className={inputClass()} value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </Field>
            <Field label="E-posta" required>
              <input type="email" className={inputClass()} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </Field>
            <Field label="Telegram (opsiyonel)">
              <input className={inputClass()} placeholder="@kullaniciadi" value={contactTelegram} onChange={(e) => setContactTelegram(e.target.value)} />
            </Field>
          </div>
        </div>

        {type === "ICO" ? (
          <div>
            <h2 className="text-h2 text-foreground">Proje Bilgileri (ICO/IDO)</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Proje Adı" required>
                <input className={inputClass()} value={icoForm.name} onChange={(e) => updateIco("name", e.target.value)} />
              </Field>
              <Field label="Token Sembolü">
                <input className={inputClass()} value={icoForm.tokenSymbol} onChange={(e) => updateIco("tokenSymbol", e.target.value)} />
              </Field>
              <Field label="Blockchain">
                <input className={inputClass()} placeholder="Solana, Ethereum..." value={icoForm.blockchain} onChange={(e) => updateIco("blockchain", e.target.value)} />
              </Field>
              <Field label="Kategori">
                <input className={inputClass()} placeholder="DeFi, GameFi..." value={icoForm.category} onChange={(e) => updateIco("category", e.target.value)} />
              </Field>
              <Field label="Satış Tipi">
                <input className={inputClass()} placeholder="IDO, IEO, Public Sale..." value={icoForm.saleType} onChange={(e) => updateIco("saleType", e.target.value)} />
              </Field>
              <Field label="Launchpad">
                <input className={inputClass()} value={icoForm.launchpad} onChange={(e) => updateIco("launchpad", e.target.value)} />
              </Field>
              <Field label="Launchpad / Katılım Linki">
                <input className={inputClass()} value={icoForm.launchpadUrl} onChange={(e) => updateIco("launchpadUrl", e.target.value)} />
              </Field>
              <Field label="Website">
                <input className={inputClass()} value={icoForm.websiteUrl} onChange={(e) => updateIco("websiteUrl", e.target.value)} />
              </Field>
              <Field label="Logo URL">
                <input className={inputClass()} value={icoForm.logo} onChange={(e) => updateIco("logo", e.target.value)} />
              </Field>
              <Field label="Token Fiyatı ($)">
                <input type="number" className={inputClass()} value={icoForm.tokenPrice} onChange={(e) => updateIco("tokenPrice", e.target.value)} />
              </Field>
              <Field label="Hard Cap ($)">
                <input type="number" className={inputClass()} value={icoForm.hardCapUsd} onChange={(e) => updateIco("hardCapUsd", e.target.value)} />
              </Field>
              <Field label="Değerleme ($)">
                <input type="number" className={inputClass()} value={icoForm.valuationUsd} onChange={(e) => updateIco("valuationUsd", e.target.value)} />
              </Field>
              <Field label="Başlangıç Tarihi">
                <input type="date" className={inputClass()} value={icoForm.startDate} onChange={(e) => updateIco("startDate", e.target.value)} />
              </Field>
              <Field label="Bitiş Tarihi">
                <input type="date" className={inputClass()} value={icoForm.endDate} onChange={(e) => updateIco("endDate", e.target.value)} />
              </Field>
              <Field label="Twitter">
                <input className={inputClass()} value={icoForm.twitter} onChange={(e) => updateIco("twitter", e.target.value)} />
              </Field>
              <Field label="Telegram">
                <input className={inputClass()} value={icoForm.telegram} onChange={(e) => updateIco("telegram", e.target.value)} />
              </Field>
              <Field label="Discord">
                <input className={inputClass()} value={icoForm.discord} onChange={(e) => updateIco("discord", e.target.value)} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Açıklama">
                <textarea className={`${inputClass()} min-h-24`} value={icoForm.description} onChange={(e) => updateIco("description", e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={icoForm.requiresKYC} onChange={(e) => updateIco("requiresKYC", e.target.checked)} />
                KYC gerekli
              </label>
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={icoForm.requiresWhitelist} onChange={(e) => updateIco("requiresWhitelist", e.target.checked)} />
                Whitelist gerekli
              </label>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-h2 text-foreground">Proje Bilgileri (Airdrop)</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Başlık" required>
                <input className={inputClass()} value={airdropForm.title} onChange={(e) => updateAirdrop("title", e.target.value)} />
              </Field>
              <Field label="Proje Adı" required>
                <input className={inputClass()} value={airdropForm.projectName} onChange={(e) => updateAirdrop("projectName", e.target.value)} />
              </Field>
              <Field label="Blockchain" required>
                <input className={inputClass()} value={airdropForm.blockchain} onChange={(e) => updateAirdrop("blockchain", e.target.value)} />
              </Field>
              <Field label="Kategori" required>
                <input className={inputClass()} value={airdropForm.category} onChange={(e) => updateAirdrop("category", e.target.value)} />
              </Field>
              <Field label="Ödül Türü" required>
                <input className={inputClass()} placeholder="Token, NFT..." value={airdropForm.rewardType} onChange={(e) => updateAirdrop("rewardType", e.target.value)} />
              </Field>
              <Field label="Tahmini Ödül">
                <input className={inputClass()} value={airdropForm.estimatedReward} onChange={(e) => updateAirdrop("estimatedReward", e.target.value)} />
              </Field>
              <Field label="Tahmini Değer ($)">
                <input type="number" className={inputClass()} value={airdropForm.estimatedValueUSD} onChange={(e) => updateAirdrop("estimatedValueUSD", e.target.value)} />
              </Field>
              <Field label="Zorluk">
                <select className={inputClass()} value={airdropForm.difficulty} onChange={(e) => updateAirdrop("difficulty", e.target.value)}>
                  <option value="EASY">Kolay</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HARD">Zor</option>
                </select>
              </Field>
              <Field label="Tahmini Süre">
                <input className={inputClass()} placeholder="15 dakika..." value={airdropForm.completionTime} onChange={(e) => updateAirdrop("completionTime", e.target.value)} />
              </Field>
              <Field label="Website">
                <input className={inputClass()} value={airdropForm.website} onChange={(e) => updateAirdrop("website", e.target.value)} />
              </Field>
              <Field label="Logo URL">
                <input className={inputClass()} value={airdropForm.logo} onChange={(e) => updateAirdrop("logo", e.target.value)} />
              </Field>
              <Field label="Banner URL">
                <input className={inputClass()} value={airdropForm.banner} onChange={(e) => updateAirdrop("banner", e.target.value)} />
              </Field>
              <Field label="Dokümantasyon">
                <input className={inputClass()} value={airdropForm.documentation} onChange={(e) => updateAirdrop("documentation", e.target.value)} />
              </Field>
              <Field label="Başlangıç Tarihi">
                <input type="date" className={inputClass()} value={airdropForm.startDate} onChange={(e) => updateAirdrop("startDate", e.target.value)} />
              </Field>
              <Field label="Bitiş Tarihi">
                <input type="date" className={inputClass()} value={airdropForm.endDate} onChange={(e) => updateAirdrop("endDate", e.target.value)} />
              </Field>
              <Field label="Twitter">
                <input className={inputClass()} value={airdropForm.twitter} onChange={(e) => updateAirdrop("twitter", e.target.value)} />
              </Field>
              <Field label="Discord">
                <input className={inputClass()} value={airdropForm.discord} onChange={(e) => updateAirdrop("discord", e.target.value)} />
              </Field>
              <Field label="Telegram">
                <input className={inputClass()} value={airdropForm.telegram} onChange={(e) => updateAirdrop("telegram", e.target.value)} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Açıklama">
                <textarea className={`${inputClass()} min-h-24`} value={airdropForm.description} onChange={(e) => updateAirdrop("description", e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={airdropForm.requiresKYC} onChange={(e) => updateAirdrop("requiresKYC", e.target.checked)} />
                KYC gerekli
              </label>
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={airdropForm.requiresWallet} onChange={(e) => updateAirdrop("requiresWallet", e.target.checked)} />
                Cüzdan gerekli
              </label>
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={airdropForm.requiresDiscord} onChange={(e) => updateAirdrop("requiresDiscord", e.target.checked)} />
                Discord gerekli
              </label>
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={airdropForm.requiresTwitter} onChange={(e) => updateAirdrop("requiresTwitter", e.target.checked)} />
                Twitter gerekli
              </label>
              <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                <input type="checkbox" checked={airdropForm.requiresTelegram} onChange={(e) => updateAirdrop("requiresTelegram", e.target.checked)} />
                Telegram gerekli
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-h2 text-foreground">Ödeme</h2>
        <p className="text-body-sm text-muted-foreground">Ödeme yalnızca kripto ile alınır.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ödeme Sağlayıcı">
            <select className={inputClass()} value={provider} onChange={(e) => setProvider(e.target.value as CryptoProvider)}>
              <option value="BINANCE">Binance Pay</option>
              <option value="BYBIT">Bybit Pay</option>
              <option value="OKX">Cüzdan Adresi (OKX)</option>
            </select>
          </Field>
          <Field label="Kripto Varlık">
            <select className={inputClass()} value={asset} onChange={(e) => setAsset(e.target.value as CryptoAsset)}>
              <option value="USDT">USDT</option>
              <option value="BTC">XBT</option>
              <option value="ETH">ETH</option>
              <option value="BNB">BNB</option>
            </select>
          </Field>
        </div>

        {walletInfo ? (
          <div className="rounded-xl border border-success/40 bg-success/10 p-4 space-y-1">
            <p className="text-body-sm font-semibold text-foreground">Ödeme Talimatları</p>
            <p className="text-body-xs text-foreground/80">Ağ: {walletInfo.network}</p>
            <p className="break-all text-body-xs font-mono text-foreground/80">Adres: {walletInfo.walletAddress}</p>
            <p className="text-body-xs text-muted-foreground">{walletInfo.note}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-card-inner p-4">
            <div>
              <p className="text-body-xs text-muted-foreground">{duration} günlük sponsorluk</p>
              <p className="text-financial text-success">{price ? `$${price}` : "..."}</p>
            </div>
            <Button disabled={submitting} onClick={handlePay}>
              {submitting ? "İşleniyor..." : "Ödeme Yap"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
