"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { useSiteContent, useUpdateSiteContent } from "@/lib/hooks/use-site-content";
import { useFooterSettings, useUpdateFooterSettings } from "@/lib/hooks/use-footer-settings";
import { MARKETING_ICON_KEYS, resolveIcon } from "@/lib/marketing/icon-registry";
import { DEFAULT_SITE_CONTENT, DEFAULT_FOOTER_SETTINGS } from "@/lib/marketing/default-site-content";
import type {
  CommunityStatItemData,
  FeatureItemData,
  FooterSettingsData,
  NavLinkItem,
  ProgramsTableRowData,
  SiteContentSettings,
  StatItemData,
  ToolItemData,
  ToolPreviewKey,
} from "@/lib/marketing/site-content-types";

const TOOL_PREVIEW_KEYS: ToolPreviewKey[] = ["scanner", "backtest", "simulation", "calendar", "live"];
const SOCIAL_KEYS = ["X", "YouTube", "Instagram", "Discord"];
const LEVEL_PRESETS = ["🟢 Başlangıç", "🔵 Orta", "🟣 İleri", "🟠 İleri", "⭐ Uzman"];

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#A69B8A] outline-none focus:border-primary w-full";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[#A69B8A]">{label}</span>
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
      {hint && <p className="text-xs text-[#A69B8A]">{hint}</p>}
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

  const [form, setForm] = useState<SiteContentSettings>(DEFAULT_SITE_CONTENT);
  const [footerForm, setFooterForm] = useState<FooterSettingsData>(DEFAULT_FOOTER_SETTINGS);

  useEffect(() => {
    if (siteContentData) setForm(siteContentData);
  }, [siteContentData]);

  useEffect(() => {
    if (footerData) setFooterForm(footerData);
  }, [footerData]);

  if (authLoading) {
    return <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A69B8A]">Bu sayfaya erişim yetkin yok.</p>
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
          <p className="text-sm text-[#A69B8A]">Landing page header, hero, bölümler, footer, logo ve favicon yönetimi.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>
      ) : (
        <Tabs defaultValue="header">
          <TabsList variant="line" className="flex-wrap">
            <TabsTrigger value="header">Header</TabsTrigger>
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="stats">İstatistikler</TabsTrigger>
            <TabsTrigger value="programs">Programlar</TabsTrigger>
            <TabsTrigger value="tools">Araçlar</TabsTrigger>
            <TabsTrigger value="features">Özellikler</TabsTrigger>
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
                <p className="text-xs font-medium text-[#A69B8A]">Navigasyon linkleri</p>
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
                <Field label="Sosyal kanıt sayısı (örn. 10.000+)">
                  <input
                    className={inputClass()}
                    value={form.heroSocialProofCount ?? ""}
                    onChange={(e) => set("heroSocialProofCount", e.target.value || null)}
                  />
                </Field>
                <Field label="Sosyal kanıt yazısı">
                  <input
                    className={inputClass()}
                    value={form.heroSocialProofLabel ?? ""}
                    onChange={(e) => set("heroSocialProofLabel", e.target.value || null)}
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

          <TabsContent value="stats" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              {form.statsItems.map((stat, i) => (
                <RowCard
                  key={i}
                  onRemove={() =>
                    set(
                      "statsItems",
                      form.statsItems.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  <IconSelect
                    value={stat.icon}
                    onChange={(v) => {
                      const next: StatItemData[] = [...form.statsItems];
                      next[i] = { ...next[i], icon: v };
                      set("statsItems", next);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputClass()}
                      placeholder="Değer (örn. 8.950+)"
                      value={stat.value}
                      onChange={(e) => {
                        const next: StatItemData[] = [...form.statsItems];
                        next[i] = { ...next[i], value: e.target.value };
                        set("statsItems", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Trend (örn. +24%, opsiyonel)"
                      value={stat.trend ?? ""}
                      onChange={(e) => {
                        const next: StatItemData[] = [...form.statsItems];
                        next[i] = { ...next[i], trend: e.target.value };
                        set("statsItems", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Etiket"
                      value={stat.label}
                      onChange={(e) => {
                        const next: StatItemData[] = [...form.statsItems];
                        next[i] = { ...next[i], label: e.target.value };
                        set("statsItems", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Alt etiket (opsiyonel)"
                      value={stat.sublabel ?? ""}
                      onChange={(e) => {
                        const next: StatItemData[] = [...form.statsItems];
                        next[i] = { ...next[i], sublabel: e.target.value };
                        set("statsItems", next);
                      }}
                    />
                  </div>
                </RowCard>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  set("statsItems", [...form.statsItems, { icon: "users", value: "", label: "" }])
                }
              >
                <Plus size={14} className="mr-1" /> İstatistik ekle
              </Button>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="programs" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <Field label="Bölüm başlığı">
                <input
                  className={inputClass()}
                  value={form.programsTableTitle}
                  onChange={(e) => set("programsTableTitle", e.target.value)}
                />
              </Field>

              {form.programsTableItems.map((row, i) => (
                <RowCard
                  key={i}
                  onRemove={() =>
                    set(
                      "programsTableItems",
                      form.programsTableItems.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                    <input
                      className={inputClass()}
                      list="level-presets"
                      placeholder="Seviye (örn. 🟢 Başlangıç)"
                      value={row.level}
                      onChange={(e) => {
                        const next: ProgramsTableRowData[] = [...form.programsTableItems];
                        next[i] = { ...next[i], level: e.target.value };
                        set("programsTableItems", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Program adı"
                      value={row.title}
                      onChange={(e) => {
                        const next: ProgramsTableRowData[] = [...form.programsTableItems];
                        next[i] = { ...next[i], title: e.target.value };
                        set("programsTableItems", next);
                      }}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Süre (örn. 10 Saat)"
                      value={row.duration}
                      onChange={(e) => {
                        const next: ProgramsTableRowData[] = [...form.programsTableItems];
                        next[i] = { ...next[i], duration: e.target.value };
                        set("programsTableItems", next);
                      }}
                    />
                  </div>
                </RowCard>
              ))}
              <datalist id="level-presets">
                {LEVEL_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  set("programsTableItems", [
                    ...form.programsTableItems,
                    { level: "🟢 Başlangıç", title: "", duration: "" },
                  ])
                }
              >
                <Plus size={14} className="mr-1" /> Program ekle
              </Button>

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

          <TabsContent value="features" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bölüm başlığı">
                  <input className={inputClass()} value={form.featuresTitle} onChange={(e) => set("featuresTitle", e.target.value)} />
                </Field>
                <Field label="Bölüm alt yazısı">
                  <input
                    className={inputClass()}
                    value={form.featuresSubtitle}
                    onChange={(e) => set("featuresSubtitle", e.target.value)}
                  />
                </Field>
              </div>

              {form.featureItems.map((feature, i) => (
                <RowCard
                  key={i}
                  onRemove={() =>
                    set(
                      "featureItems",
                      form.featureItems.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  <IconSelect
                    value={feature.icon}
                    onChange={(v) => {
                      const next: FeatureItemData[] = [...form.featureItems];
                      next[i] = { ...next[i], icon: v };
                      set("featureItems", next);
                    }}
                  />
                  <input
                    className={inputClass()}
                    placeholder="Başlık"
                    value={feature.title}
                    onChange={(e) => {
                      const next: FeatureItemData[] = [...form.featureItems];
                      next[i] = { ...next[i], title: e.target.value };
                      set("featureItems", next);
                    }}
                  />
                  <textarea
                    className={inputClass()}
                    rows={2}
                    placeholder="Açıklama"
                    value={feature.description}
                    onChange={(e) => {
                      const next: FeatureItemData[] = [...form.featureItems];
                      next[i] = { ...next[i], description: e.target.value };
                      set("featureItems", next);
                    }}
                  />
                  <select
                    className={inputClass()}
                    value={feature.accent ?? "primary"}
                    onChange={(e) => {
                      const next: FeatureItemData[] = [...form.featureItems];
                      next[i] = { ...next[i], accent: e.target.value as "primary" | "purple" };
                      set("featureItems", next);
                    }}
                  >
                    <option value="primary">Mavi vurgu</option>
                    <option value="purple">Mor vurgu</option>
                  </select>
                </RowCard>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  set("featureItems", [
                    ...form.featureItems,
                    { icon: "bot", title: "", description: "", accent: "primary" },
                  ])
                }
              >
                <Plus size={14} className="mr-1" /> Özellik ekle
              </Button>

              <Button onClick={saveSiteContent} disabled={updateSiteContent.isPending}>
                Site İçeriğini Kaydet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="community" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
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
                      value={stat.value}
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
                <p className="text-xs font-medium text-[#A69B8A]">Kontrol listesi (opsiyonel)</p>
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
                <p className="text-xs font-medium text-[#A69B8A]">Sosyal medya linkleri</p>
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
