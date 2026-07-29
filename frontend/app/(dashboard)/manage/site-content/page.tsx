"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { useSiteContent, useUpdateSiteContent } from "@/lib/hooks/use-site-content";
import { useFooterSettings, useUpdateFooterSettings } from "@/lib/hooks/use-footer-settings";
import { usePrograms } from "@/lib/hooks/use-curriculum";
import { MARKETING_ICON_KEYS, resolveIcon } from "@/lib/marketing/icon-registry";
import { PARTNER_BRANDS, type PartnerBrandKey } from "@/lib/marketing/partner-brands";
import { DEFAULT_SITE_CONTENT, DEFAULT_FOOTER_SETTINGS } from "@/lib/marketing/default-site-content";
import { LevelBadge } from "@/components/programs/level-badge";
import type {
  CommunityStatItemData,
  FooterSettingsData,
  NavLinkItem,
  PartnerItemData,
  SiteContentSettings,
  ToolItemData,
  ToolPreviewKey,
} from "@/lib/marketing/site-content-types";

const TOOL_PREVIEW_KEYS: ToolPreviewKey[] = ["scanner", "backtest", "simulation", "calendar", "live"];
const PARTNER_BRAND_KEYS = Object.keys(PARTNER_BRANDS) as PartnerBrandKey[];
const SOCIAL_KEYS = ["X", "YouTube", "Instagram", "Discord"];
const MIN_FEATURED_PROGRAMS = 6;

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#A8A6A0] outline-none focus:border-primary w-full";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[#A8A6A0]">{label}</span>
      {children}
    </label>
  );
}

function IconSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const Icon = resolveIcon(value);
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
        <Icon className="size-4" />
      </span>
      <select className={inputClass()} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {MARKETING_ICON_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </div>
  );
}

function ImagePreviewInput({
  placeholder,
  value,
  onChange,
  hint,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="önizleme" className="size-10 shrink-0 rounded-lg border border-border object-cover" />
        )}
        <input className={inputClass()} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {hint && <p className="text-xs text-[#A8A6A0]">{hint}</p>}
    </div>
  );
}

function RowCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card-inner p-3">
      <div className="flex-1 space-y-2">{children}</div>
      <Button size="sm" variant="ghost" onClick={onRemove}>
        <Trash2 size={14} className="text-danger" />
      </Button>
    </div>
  );
}

export default function SiteContentPage() {
  const { user: me, isLoading: authLoading } = useAuth();

  const { data: siteContentData, isLoading: loadingSiteContent } = useSiteContent();
  const updateSiteContent = useUpdateSiteContent();
  const { data: footerData, isLoading: loadingFooter } = useFooterSettings();
  const updateFooter = useUpdateFooterSettings();
  const { data: allPrograms, isLoading: loadingPrograms } = usePrograms();

  const [form, setForm] = useState<SiteContentSettings>(DEFAULT_SITE_CONTENT);
  const [footerForm, setFooterForm] = useState<FooterSettingsData>(DEFAULT_FOOTER_SETTINGS);

  useEffect(() => {
    if (siteContentData) setForm(siteContentData);
  }, [siteContentData]);

  useEffect(() => {
    if (footerData) setFooterForm(footerData);
  }, [footerData]);

  if (authLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  function set<K extends keyof SiteContentSettings>(key: K, value: SiteContentSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveSiteContent() {
    try {
      const { id: _id, updatedAt: _updatedAt, ...payload } = form as SiteContentSettings & { updatedAt?: string };
      await updateSiteContent.mutateAsync(payload);
      toast.success("Site içeriği kaydedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Kaydedilemedi");
    }
  }

  async function saveFooter() {
    try {
      const { id: _id, updatedAt: _updatedAt, ...payload } = footerForm as FooterSettingsData & { updatedAt?: string };
      await updateFooter.mutateAsync(payload);
      toast.success("Footer kaydedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Kaydedilemedi");
    }
  }

  const loading = loadingSiteContent || loadingFooter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">Site İçeriği</h1>
          <p className="text-sm text-[#A8A6A0]">Landing page header, hero, bölümler, footer, logo ve favicon yönetimi.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <Tabs defaultValue="header">
          <TabsList variant="line" className="flex-wrap">
            <TabsTrigger value="header">Header</TabsTrigger>
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="partners">Partnerler</TabsTrigger>
            <TabsTrigger value="showcase">Platform Vitrini</TabsTrigger>
            <TabsTrigger value="programs">Programlar</TabsTrigger>
            <TabsTrigger value="tools">Araçlar</TabsTrigger>
            <TabsTrigger value="community">Topluluk</TabsTrigger>
            <TabsTrigger value="cta">CTA</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
            <TabsTrigger value="favicon">Favicon</TabsTrigger>
          </TabsList>

          <TabsContent value="header" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Logo yazısı">
                <input className={inputClass()} value={form.headerLogoText} onChange={(e) => set("headerLogoText", e.target.value)} />
              </Field>
              <Field label="Logo görseli (opsiyonel, doluysa yazının yerine kullanılır)">
                <ImagePreviewInput
                  placeholder="Logo görsel URL"
                  value={form.headerLogoImageUrl ?? ""}
                  onChange={(v) => set("headerLogoImageUrl", v || null)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="AI Mentor rozet etiketi (header sağı)">
                  <input className={inputClass()} value={form.aiMentorLabel} onChange={(e) => set("aiMentorLabel", e.target.value)} />
                </Field>
                <Field label="AI Mentor rozet linki">
                  <input className={inputClass()} value={form.aiMentorHref} onChange={(e) => set("aiMentorHref", e.target.value)} />
                </Field>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#A8A6A0]">Navigasyon linkleri</p>
                {form.navLinks.map((link, i) => (
                  <RowCard
                    key={i}
                    onRemove={() =>
                      set(
                        "navLinks",
                        form.navLinks.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={inputClass()}
                        placeholder="Etiket"
                        value={link.label}
                        onChange={(e) => {
                          const next: NavLinkItem[] = [...form.navLinks];
                          next[i] = { ...next[i], label: e.target.value };
                          set("navLinks", next);
                        }}
                      />
                      <input
                        className={inputClass()}
                        placeholder="Link"
                        value={link.href}
                        onChange={(e) => {
                          const next: NavLinkItem[] = [...form.navLinks];
                          next[i] = { ...next[i], href: e.target.value };
                          set("navLinks", next);
                        }}
                      />
                    </div>
                  </RowCard>
                ))}
                <Button size="sm" variant="outline" onClick={() => set("navLinks", [...form.navLinks, { label: "", href: "" }])}>
                  <Plus size={14} className="mr-1" /> Link ekle
                </Button>
              </div>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="hero" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Rozet (başlık üstü etiket)">
                <input className={inputClass()} value={form.heroBadge ?? ""} onChange={(e) => set("heroBadge", e.target.value || null)} />
              </Field>
              <Field label="Başlık">
                <textarea className={inputClass()} rows={2} value={form.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
              </Field>
              <Field label="Açıklama">
                <textarea
                  className={inputClass()}
                  rows={3}
                  value={form.heroDescription}
                  onChange={(e) => set("heroDescription", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Birincil buton yazısı">
                  <input
                    className={inputClass()}
                    value={form.heroPrimaryCtaLabel}
                    onChange={(e) => set("heroPrimaryCtaLabel", e.target.value)}
                  />
                </Field>
                <Field label="Birincil buton linki">
                  <input
                    className={inputClass()}
                    value={form.heroPrimaryCtaHref}
                    onChange={(e) => set("heroPrimaryCtaHref", e.target.value)}
                  />
                </Field>
                <Field label="İkincil buton yazısı (opsiyonel)">
                  <input
                    className={inputClass()}
                    value={form.heroSecondaryCtaLabel ?? ""}
                    onChange={(e) => set("heroSecondaryCtaLabel", e.target.value || null)}
                  />
                </Field>
                <Field label="İkincil buton linki (opsiyonel)">
                  <input
                    className={inputClass()}
                    value={form.heroSecondaryCtaHref ?? ""}
                    onChange={(e) => set("heroSecondaryCtaHref", e.target.value || null)}
                  />
                </Field>
              </div>
              <Field label="Hero görseli">
                <ImagePreviewInput
                  placeholder="Görsel URL"
                  value={form.heroImageUrl ?? ""}
                  onChange={(v) => set("heroImageUrl", v || null)}
                  hint='Site "/core" alt yolunda yayınlanıyor; /public altına koyduğun bir görsel için yolu "/core/..." ile başlat.'
                />
              </Field>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="partners" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Bölüm başlığı">
                <input
                  className={inputClass()}
                  value={form.partnersTitle}
                  onChange={(e) => set("partnersTitle", e.target.value)}
                />
              </Field>

              {form.partnersItems.map((partner, i) => (
                <RowCard
                  key={i}
                  onRemove={() =>
                    set(
                      "partnersItems",
                      form.partnersItems.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  <IconSelect
                    value={partner.icon}
                    onChange={(v) => {
                      const next: PartnerItemData[] = [...form.partnersItems];
                      next[i] = { ...next[i], icon: v };
                      set("partnersItems", next);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputClass()}
                      placeholder="Partner adı"
                      value={partner.name}
                      onChange={(e) => {
                        const next: PartnerItemData[] = [...form.partnersItems];
                        next[i] = { ...next[i], name: e.target.value };
                        set("partnersItems", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Link (opsiyonel)"
                      value={partner.href ?? ""}
                      onChange={(e) => {
                        const next: PartnerItemData[] = [...form.partnersItems];
                        next[i] = { ...next[i], href: e.target.value || undefined };
                        set("partnersItems", next);
                      }}
                    />
                  </div>
                  <Field label="Marka logosu (gerçek, renkli logo)">
                    <select
                      className={inputClass()}
                      value={partner.brandKey ?? ""}
                      onChange={(e) => {
                        const next: PartnerItemData[] = [...form.partnersItems];
                        next[i] = { ...next[i], brandKey: e.target.value || undefined };
                        set("partnersItems", next);
                      }}
                    >
                      <option value="">Otomatik (isme göre tespit et)</option>
                      {PARTNER_BRAND_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {PARTNER_BRANDS[k].label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </RowCard>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => set("partnersItems", [...form.partnersItems, { icon: "line-chart", name: "" }])}
              >
                <Plus size={14} className="mr-1" /> Partner ekle
              </Button>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="showcase" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-xs text-[#A8A6A0]">
                Partnerler ile Uzmanlık Programları arasındaki, laptop görselli &quot;Gerçek Platform Deneyimi&quot;
                bölümü. Soldaki metinler ve laptop ekranındaki dashboard içeriği buradan düzenlenir.
              </p>

              <Field label="Üst etiket (eyebrow)">
                <input
                  className={inputClass()}
                  value={form.platformShowcase.eyebrow}
                  onChange={(e) => set("platformShowcase", { ...form.platformShowcase, eyebrow: e.target.value })}
                />
              </Field>
              <Field label="Başlık">
                <textarea
                  className={inputClass()}
                  rows={2}
                  value={form.platformShowcase.title}
                  onChange={(e) => set("platformShowcase", { ...form.platformShowcase, title: e.target.value })}
                />
              </Field>
              <Field label="Açıklama">
                <textarea
                  className={inputClass()}
                  rows={2}
                  value={form.platformShowcase.description}
                  onChange={(e) =>
                    set("platformShowcase", { ...form.platformShowcase, description: e.target.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Buton yazısı">
                  <input
                    className={inputClass()}
                    value={form.platformShowcase.ctaLabel}
                    onChange={(e) =>
                      set("platformShowcase", { ...form.platformShowcase, ctaLabel: e.target.value })
                    }
                  />
                </Field>
                <Field label="Buton linki">
                  <input
                    className={inputClass()}
                    value={form.platformShowcase.ctaHref}
                    onChange={(e) => set("platformShowcase", { ...form.platformShowcase, ctaHref: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Laptop ekranındaki dashboard görseli (PNG/JPG URL)">
                <ImagePreviewInput
                  placeholder="https://.../dashboard-preview.png"
                  value={form.platformShowcase.imageUrl ?? ""}
                  onChange={(v) => set("platformShowcase", { ...form.platformShowcase, imageUrl: v || null })}
                  hint="Laptop ekranına tam kaplayacak şekilde yerleşir (16:10.2 oranında bir görsel önerilir)."
                />
              </Field>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="programs" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-[#F5F1EA]">Uzmanlık Programlarımız (landing page)</p>
                <p className="text-xs text-[#A8A6A0]">
                  Landing page&apos;de öne çıkarılacak programları seç. En az {MIN_FEATURED_PROGRAMS} program
                  seçilmesi önerilir; sıralama seçim sırana göre landing page&apos;e yansır.
                </p>
              </div>

              <p
                className={
                  form.featuredProgramIds.length < MIN_FEATURED_PROGRAMS
                    ? "text-xs font-medium text-danger"
                    : "text-xs font-medium text-success"
                }
              >
                {form.featuredProgramIds.length} program seçili
                {form.featuredProgramIds.length < MIN_FEATURED_PROGRAMS &&
                  ` (en az ${MIN_FEATURED_PROGRAMS} önerilir)`}
              </p>

              {loadingPrograms ? (
                <p className="text-sm text-[#A8A6A0]">Programlar yükleniyor...</p>
              ) : (
                <div className="space-y-2">
                  {(allPrograms ?? []).map((program) => {
                    const selected = form.featuredProgramIds.includes(program.id);
                    return (
                      <button
                        key={program.id}
                        type="button"
                        onClick={() =>
                          set(
                            "featuredProgramIds",
                            selected
                              ? form.featuredProgramIds.filter((id) => id !== program.id)
                              : [...form.featuredProgramIds, program.id]
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          selected ? "border-primary bg-primary/10" : "border-border bg-card-inner"
                        }`}
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                            selected ? "border-primary bg-primary text-white" : "border-border"
                          }`}
                        >
                          {selected && <Check size={12} />}
                        </span>
                        <span className="flex-1 text-sm text-[#F5F1EA]">{program.title}</span>
                        <LevelBadge level={program.level} />
                      </button>
                    );
                  })}
                  {allPrograms?.length === 0 && (
                    <p className="text-sm text-[#A8A6A0]">Henüz hiç program oluşturulmamış.</p>
                  )}
                </div>
              )}

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bölüm başlığı">
                  <input className={inputClass()} value={form.toolsTitle} onChange={(e) => set("toolsTitle", e.target.value)} />
                </Field>
                <Field label="Bölüm alt yazısı">
                  <input className={inputClass()} value={form.toolsSubtitle} onChange={(e) => set("toolsSubtitle", e.target.value)} />
                </Field>
              </div>

              {form.toolsItems.map((tool, i) => (
                <RowCard
                  key={i}
                  onRemove={() =>
                    set(
                      "toolsItems",
                      form.toolsItems.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  <IconSelect
                    value={tool.icon}
                    onChange={(v) => {
                      const next: ToolItemData[] = [...form.toolsItems];
                      next[i] = { ...next[i], icon: v };
                      set("toolsItems", next);
                    }}
                  />
                  <input
                    className={inputClass()}
                    placeholder="Başlık"
                    value={tool.title}
                    onChange={(e) => {
                      const next: ToolItemData[] = [...form.toolsItems];
                      next[i] = { ...next[i], title: e.target.value };
                      set("toolsItems", next);
                    }}
                  />
                  <textarea
                    className={inputClass()}
                    rows={2}
                    placeholder="Açıklama"
                    value={tool.description}
                    onChange={(e) => {
                      const next: ToolItemData[] = [...form.toolsItems];
                      next[i] = { ...next[i], description: e.target.value };
                      set("toolsItems", next);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputClass()}
                      placeholder="Link"
                      value={tool.href}
                      onChange={(e) => {
                        const next: ToolItemData[] = [...form.toolsItems];
                        next[i] = { ...next[i], href: e.target.value };
                        set("toolsItems", next);
                      }}
                    />
                    <select
                      className={inputClass()}
                      value={tool.previewKey}
                      onChange={(e) => {
                        const next: ToolItemData[] = [...form.toolsItems];
                        next[i] = { ...next[i], previewKey: e.target.value as ToolPreviewKey };
                        set("toolsItems", next);
                      }}
                    >
                      {TOOL_PREVIEW_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k} önizleme grafiği
                        </option>
                      ))}
                    </select>
                  </div>
                </RowCard>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  set("toolsItems", [
                    ...form.toolsItems,
                    { icon: "radar", title: "", description: "", href: "", previewKey: "scanner" },
                  ])
                }
              >
                <Plus size={14} className="mr-1" /> Araç ekle
              </Button>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="community" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.communityEnabled}
                  onChange={(e) => set("communityEnabled", e.target.checked)}
                  className="size-4 rounded border-border accent-primary"
                />
                Bu bölüm sitede gösterilsin (pasifse landing page&apos;de hiç görünmez)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bölüm başlığı">
                  <input
                    className={inputClass()}
                    value={form.communityTitle}
                    onChange={(e) => set("communityTitle", e.target.value)}
                  />
                </Field>
                <Field label="Ekstra üye sayısı (avatar yığınının yanındaki +N)">
                  <input
                    type="number"
                    className={inputClass()}
                    value={form.communityExtraCount ?? ""}
                    onChange={(e) => set("communityExtraCount", e.target.value ? Number(e.target.value) : null)}
                  />
                </Field>
              </div>

              {form.communityStats.map((stat, i) => (
                <RowCard
                  key={i}
                  onRemove={() =>
                    set(
                      "communityStats",
                      form.communityStats.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  <IconSelect
                    value={stat.icon}
                    onChange={(v) => {
                      const next: CommunityStatItemData[] = [...form.communityStats];
                      next[i] = { ...next[i], icon: v };
                      set("communityStats", next);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputClass()}
                      placeholder="Değer"
                      value={stat.auto ? "(otomatik hesaplanıyor)" : stat.value}
                      disabled={!!stat.auto}
                      onChange={(e) => {
                        const next: CommunityStatItemData[] = [...form.communityStats];
                        next[i] = { ...next[i], value: e.target.value };
                        set("communityStats", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Etiket"
                      value={stat.label}
                      onChange={(e) => {
                        const next: CommunityStatItemData[] = [...form.communityStats];
                        next[i] = { ...next[i], label: e.target.value };
                        set("communityStats", next);
                      }}
                    />
                  </div>
                  <Field label="Veri kaynağı">
                    <select
                      className={inputClass()}
                      value={stat.auto ?? ""}
                      onChange={(e) => {
                        const next: CommunityStatItemData[] = [...form.communityStats];
                        const auto = (e.target.value || undefined) as CommunityStatItemData["auto"];
                        next[i] = { ...next[i], auto };
                        set("communityStats", next);
                      }}
                    >
                      <option value="">Elle gir</option>
                      <option value="totalUsers">Toplam Üye Sayısı (otomatik)</option>
                      <option value="dailyActive">Günlük Aktif Kullanıcı (otomatik)</option>
                    </select>
                  </Field>
                </RowCard>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => set("communityStats", [...form.communityStats, { icon: "users", value: "", label: "" }])}
              >
                <Plus size={14} className="mr-1" /> İstatistik ekle
              </Button>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="cta" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Başlık">
                <textarea className={inputClass()} rows={2} value={form.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)} />
              </Field>
              <Field label="Açıklama (opsiyonel)">
                <textarea
                  className={inputClass()}
                  rows={2}
                  value={form.ctaDescription ?? ""}
                  onChange={(e) => set("ctaDescription", e.target.value || null)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Buton yazısı">
                  <input className={inputClass()} value={form.ctaButtonLabel} onChange={(e) => set("ctaButtonLabel", e.target.value)} />
                </Field>
                <Field label="Buton linki">
                  <input className={inputClass()} value={form.ctaButtonHref} onChange={(e) => set("ctaButtonHref", e.target.value)} />
                </Field>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#A8A6A0]">Kontrol listesi (opsiyonel)</p>
                {form.ctaChecklist.map((item, i) => (
                  <RowCard
                    key={i}
                    onRemove={() =>
                      set(
                        "ctaChecklist",
                        form.ctaChecklist.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <input
                      className={inputClass()}
                      value={item}
                      onChange={(e) => {
                        const next = [...form.ctaChecklist];
                        next[i] = e.target.value;
                        set("ctaChecklist", next);
                      }}
                    />
                  </RowCard>
                ))}
                <Button size="sm" variant="outline" onClick={() => set("ctaChecklist", [...form.ctaChecklist, ""])}>
                  <Plus size={14} className="mr-1" /> Madde ekle
                </Button>
              </div>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="footer" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Şirket adı (footer logosu)">
                <input
                  className={inputClass()}
                  value={footerForm.companyName}
                  onChange={(e) => setFooterForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </Field>
              <Field label="Açıklama">
                <textarea
                  className={inputClass()}
                  rows={2}
                  value={footerForm.description ?? ""}
                  onChange={(e) => setFooterForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="İletişim e-postası (opsiyonel)">
                  <input
                    className={inputClass()}
                    value={footerForm.contactEmail ?? ""}
                    onChange={(e) => setFooterForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </Field>
                <Field label="İletişim telefonu (opsiyonel)">
                  <input
                    className={inputClass()}
                    value={footerForm.contactPhone ?? ""}
                    onChange={(e) => setFooterForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Telif hakkı yazısı">
                <input
                  className={inputClass()}
                  value={footerForm.copyrightText ?? ""}
                  onChange={(e) => setFooterForm((f) => ({ ...f, copyrightText: e.target.value }))}
                />
              </Field>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#A8A6A0]">Platform linkleri (footer)</p>
                {(footerForm.platformLinks ?? []).map((link, i) => (
                  <RowCard
                    key={i}
                    onRemove={() =>
                      setFooterForm((f) => ({
                        ...f,
                        platformLinks: (f.platformLinks ?? []).filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={inputClass()}
                        placeholder="Etiket"
                        value={link.label}
                        onChange={(e) =>
                          setFooterForm((f) => {
                            const next = [...(f.platformLinks ?? [])];
                            next[i] = { ...next[i], label: e.target.value };
                            return { ...f, platformLinks: next };
                          })
                        }
                      />
                      <input
                        className={inputClass()}
                        placeholder="Link"
                        value={link.href}
                        onChange={(e) =>
                          setFooterForm((f) => {
                            const next = [...(f.platformLinks ?? [])];
                            next[i] = { ...next[i], href: e.target.value };
                            return { ...f, platformLinks: next };
                          })
                        }
                      />
                    </div>
                  </RowCard>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFooterForm((f) => ({ ...f, platformLinks: [...(f.platformLinks ?? []), { label: "", href: "" }] }))
                  }
                >
                  <Plus size={14} className="mr-1" /> Platform linki ekle
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#A8A6A0]">Destek linkleri (footer)</p>
                {(footerForm.supportLinks ?? []).map((link, i) => (
                  <RowCard
                    key={i}
                    onRemove={() =>
                      setFooterForm((f) => ({
                        ...f,
                        supportLinks: (f.supportLinks ?? []).filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={inputClass()}
                        placeholder="Etiket"
                        value={link.label}
                        onChange={(e) =>
                          setFooterForm((f) => {
                            const next = [...(f.supportLinks ?? [])];
                            next[i] = { ...next[i], label: e.target.value };
                            return { ...f, supportLinks: next };
                          })
                        }
                      />
                      <input
                        className={inputClass()}
                        placeholder="Link"
                        value={link.href}
                        onChange={(e) =>
                          setFooterForm((f) => {
                            const next = [...(f.supportLinks ?? [])];
                            next[i] = { ...next[i], href: e.target.value };
                            return { ...f, supportLinks: next };
                          })
                        }
                      />
                    </div>
                  </RowCard>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFooterForm((f) => ({ ...f, supportLinks: [...(f.supportLinks ?? []), { label: "", href: "" }] }))
                  }
                >
                  <Plus size={14} className="mr-1" /> Destek linki ekle
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#A8A6A0]">Sosyal medya linkleri</p>
                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_KEYS.map((key) => (
                    <input
                      key={key}
                      className={inputClass()}
                      placeholder={key}
                      value={footerForm.socialLinks?.[key] ?? ""}
                      onChange={(e) =>
                        setFooterForm((f) => ({
                          ...f,
                          socialLinks: { ...f.socialLinks, [key]: e.target.value },
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <Button onClick={saveFooter} disabled={updateFooter.isPending}>
                Footer&apos;ı Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="favicon" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Favicon görseli">
                <ImagePreviewInput
                  placeholder="Favicon URL (.ico/.png)"
                  value={form.faviconUrl ?? ""}
                  onChange={(v) => set("faviconUrl", v || null)}
                  hint="Boş bırakılırsa varsayılan favicon.ico kullanılır."
                />
              </Field>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
