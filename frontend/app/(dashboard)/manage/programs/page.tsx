"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { usePrograms, useAllModules, useAllLessons } from "@/lib/hooks/use-curriculum";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
} from "@/lib/hooks/use-admin-curriculum";
import type { Program, CourseModule, LessonSummary } from "@/lib/types/curriculum";

const LEVELS = ["BASLANGIC", "ORTA", "ILERI"] as const;

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary w-full";
}

export default function AdminProgramsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: programs, isLoading: loadingPrograms } = usePrograms();
  const { data: modules } = useAllModules();
  const { data: lessons } = useAllLessons();
  const { data: categories } = useCategories();

  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [showNewProgram, setShowNewProgram] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    coverImageUrl: "",
    level: "BASLANGIC" as (typeof LEVELS)[number],
    durationHours: "",
  });

  const [newModuleForProgram, setNewModuleForProgram] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleEditTitle, setModuleEditTitle] = useState("");

  const [newLessonForModule, setNewLessonForModule] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", videoUrl: "", pdfUrl: "" });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonEditForm, setLessonEditForm] = useState({ title: "", videoUrl: "", pdfUrl: "" });

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");

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

  function resetProgramForm() {
    setProgramForm({
      title: "",
      description: "",
      categoryId: "",
      coverImageUrl: "",
      level: "BASLANGIC",
      durationHours: "",
    });
  }

  function startEditProgram(p: Program) {
    setEditingProgramId(p.id);
    setShowNewProgram(false);
    setProgramForm({
      title: p.title,
      description: p.description ?? "",
      categoryId: p.categoryId ?? "",
      coverImageUrl: p.coverImageUrl ?? "",
      level: (p.level as (typeof LEVELS)[number]) ?? "BASLANGIC",
      durationHours: p.durationHours ? String(p.durationHours) : "",
    });
  }

  async function submitProgram() {
    if (!programForm.title.trim()) {
      toast.error("Başlık gerekli");
      return;
    }
    const payload = {
      title: programForm.title.trim(),
      description: programForm.description || undefined,
      categoryId: programForm.categoryId || undefined,
      coverImageUrl: programForm.coverImageUrl || undefined,
      level: programForm.level,
      durationHours: programForm.durationHours ? Number(programForm.durationHours) : undefined,
    };
    try {
      if (editingProgramId) {
        await updateProgram.mutateAsync({ id: editingProgramId, ...payload });
        toast.success("Program güncellendi");
        setEditingProgramId(null);
      } else {
        await createProgram.mutateAsync(payload);
        toast.success("Program oluşturuldu");
        setShowNewProgram(false);
      }
      resetProgramForm();
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleDeleteProgram(id: string) {
    if (!confirm("Bu programı silmek istediğine emin misin? Bağlı modüller/dersler etkilenebilir.")) return;
    try {
      await deleteProgram.mutateAsync(id);
      toast.success("Program silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  async function submitNewModule(programId: string) {
    if (!moduleTitle.trim()) {
      toast.error("Modül başlığı gerekli");
      return;
    }
    try {
      await createModule.mutateAsync({ title: moduleTitle.trim(), programId });
      toast.success("Modül eklendi");
      setModuleTitle("");
      setNewModuleForProgram(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Eklenemedi");
    }
  }

  async function submitModuleEdit(id: string) {
    if (!moduleEditTitle.trim()) return;
    try {
      await updateModule.mutateAsync({ id, title: moduleEditTitle.trim() });
      toast.success("Modül güncellendi");
      setEditingModuleId(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }

  async function handleDeleteModule(id: string) {
    if (!confirm("Bu modülü silmek istediğine emin misin? Bağlı dersler etkilenebilir.")) return;
    try {
      await deleteModule.mutateAsync(id);
      toast.success("Modül silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  async function submitNewLesson(moduleId: string) {
    if (!lessonForm.title.trim()) {
      toast.error("Ders başlığı gerekli");
      return;
    }
    try {
      await createLesson.mutateAsync({
        title: lessonForm.title.trim(),
        videoUrl: lessonForm.videoUrl || undefined,
        pdfUrl: lessonForm.pdfUrl || undefined,
        moduleId,
      });
      toast.success("Ders eklendi");
      setLessonForm({ title: "", videoUrl: "", pdfUrl: "" });
      setNewLessonForModule(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Eklenemedi");
    }
  }

  async function submitLessonEdit(id: string) {
    if (!lessonEditForm.title.trim()) return;
    try {
      await updateLesson.mutateAsync({
        id,
        title: lessonEditForm.title.trim(),
        videoUrl: lessonEditForm.videoUrl || undefined,
        pdfUrl: lessonEditForm.pdfUrl || undefined,
      });
      toast.success("Ders güncellendi");
      setEditingLessonId(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Bu dersi silmek istediğine emin misin?")) return;
    try {
      await deleteLesson.mutateAsync(id);
      toast.success("Ders silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  async function submitNewCategory() {
    if (!categoryName.trim()) return;
    try {
      await createCategory.mutateAsync(categoryName.trim());
      toast.success("Kategori eklendi");
      setCategoryName("");
      setShowNewCategory(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Eklenemedi");
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Bu kategoriyi silmek istediğine emin misin?")) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Kategori silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi (kullanılan bir kategori olabilir)");
    }
  }

  function programForm_(p?: Program) {
    return (
      <div className="rounded-xl border border-border bg-card-inner p-4 space-y-3">
        <input
          className={inputClass()}
          placeholder="Başlık"
          value={programForm.title}
          onChange={(e) => setProgramForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className={inputClass()}
          placeholder="Açıklama"
          rows={2}
          value={programForm.description}
          onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className={inputClass()}
            value={programForm.categoryId}
            onChange={(e) => setProgramForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Kategori seç...</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass()}
            value={programForm.level}
            onChange={(e) => setProgramForm((f) => ({ ...f, level: e.target.value as any }))}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass()}
            placeholder="Kapak görsel URL"
            value={programForm.coverImageUrl}
            onChange={(e) => setProgramForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
          />
          <input
            className={inputClass()}
            placeholder="Süre (saat)"
            type="number"
            value={programForm.durationHours}
            onChange={(e) => setProgramForm((f) => ({ ...f, durationHours: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={submitProgram} disabled={createProgram.isPending || updateProgram.isPending}>
            <Check size={14} className="mr-1" /> Kaydet
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNewProgram(false);
              setEditingProgramId(null);
              resetProgramForm();
            }}
          >
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
          <h1 className="text-2xl font-semibold text-[#F5F8FF]">Programlar</h1>
          <p className="text-sm text-[#8D9BB6]">Program / Modül / Ders yönetimi.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {/* Kategoriler */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#F5F8FF]">Kategoriler</h2>
          {!showNewCategory && (
            <Button size="sm" variant="outline" onClick={() => setShowNewCategory(true)}>
              <Plus size={14} className="mr-1" /> Yeni
            </Button>
          )}
        </div>
        {showNewCategory && (
          <div className="flex gap-2">
            <input
              className={inputClass()}
              placeholder="Kategori adı"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
            />
            <Button size="sm" onClick={submitNewCategory} disabled={createCategory.isPending}>
              Ekle
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewCategory(false)}>
              İptal
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {categories?.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-2 rounded-full border border-border bg-card-inner px-3 py-1 text-xs text-[#D7E1F8]"
            >
              {c.name}
              <button onClick={() => handleDeleteCategory(c.id)} aria-label="Sil">
                <X size={12} className="text-[#8D9BB6] hover:text-danger" />
              </button>
            </span>
          ))}
          {(!categories || categories.length === 0) && (
            <span className="text-xs text-[#8D9BB6]">Henüz kategori yok.</span>
          )}
        </div>
      </div>

      {/* Yeni Program */}
      {!showNewProgram && !editingProgramId && (
        <Button onClick={() => setShowNewProgram(true)}>
          <Plus size={16} className="mr-1" /> Yeni Program
        </Button>
      )}
      {showNewProgram && programForm_()}

      {/* Program Listesi */}
      <div className="space-y-3">
        {loadingPrograms ? (
          <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
        ) : !programs || programs.length === 0 ? (
          <p className="text-sm text-[#8D9BB6]">Henüz program yok.</p>
        ) : (
          programs.map((p) => {
            const isExpanded = expandedProgram === p.id;
            const isEditing = editingProgramId === p.id;
            const programModules = (modules ?? []).filter((m) => m.programId === p.id);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3">
                  <button
                    className="flex items-center gap-2 flex-1 text-left"
                    onClick={() => setExpandedProgram(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-[#8D9BB6] shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-[#8D9BB6] shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-[#F5F8FF]">{p.title}</p>
                      <p className="text-xs text-[#8D9BB6]">
                        {p.level ?? "—"} · {p.durationHours ? `${p.durationHours} saat` : "süre yok"} ·{" "}
                        {programModules.length} modül
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => startEditProgram(p)}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteProgram(p.id)}>
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                </div>

                {isEditing && <div className="px-4 pb-4">{programForm_(p)}</div>}

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3 bg-card-inner/30">
                    {programModules.map((m) => {
                      const moduleExpanded = expandedModule === m.id;
                      const moduleLessons = (lessons ?? []).filter((l) => l.moduleId === m.id);
                      const isEditingModule = editingModuleId === m.id;
                      return (
                        <div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden">
                          <div className="p-3 flex items-center justify-between gap-3">
                            <button
                              className="flex items-center gap-2 flex-1 text-left"
                              onClick={() => setExpandedModule(moduleExpanded ? null : m.id)}
                            >
                              {moduleExpanded ? (
                                <ChevronDown size={14} className="text-[#8D9BB6] shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="text-[#8D9BB6] shrink-0" />
                              )}
                              <span className="text-sm text-[#F5F8FF]">{m.title}</span>
                              <span className="text-xs text-[#8D9BB6]">({moduleLessons.length} ders)</span>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingModuleId(m.id);
                                  setModuleEditTitle(m.title);
                                }}
                              >
                                <Pencil size={12} />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteModule(m.id)}>
                                <Trash2 size={12} className="text-danger" />
                              </Button>
                            </div>
                          </div>

                          {isEditingModule && (
                            <div className="px-3 pb-3 flex gap-2">
                              <input
                                className={inputClass()}
                                value={moduleEditTitle}
                                onChange={(e) => setModuleEditTitle(e.target.value)}
                                autoFocus
                              />
                              <Button size="sm" onClick={() => submitModuleEdit(m.id)}>
                                <Check size={14} />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingModuleId(null)}>
                                <X size={14} />
                              </Button>
                            </div>
                          )}

                          {moduleExpanded && (
                            <div className="border-t border-border p-3 space-y-2 bg-background/40">
                              {moduleLessons.map((l) => {
                                const isEditingLesson = editingLessonId === l.id;
                                return (
                                  <div key={l.id} className="rounded-lg border border-border bg-card-inner p-2.5">
                                    {isEditingLesson ? (
                                      <div className="space-y-2">
                                        <input
                                          className={inputClass()}
                                          placeholder="Başlık"
                                          value={lessonEditForm.title}
                                          onChange={(e) =>
                                            setLessonEditForm((f) => ({ ...f, title: e.target.value }))
                                          }
                                        />
                                        <input
                                          className={inputClass()}
                                          placeholder="Video URL"
                                          value={lessonEditForm.videoUrl}
                                          onChange={(e) =>
                                            setLessonEditForm((f) => ({ ...f, videoUrl: e.target.value }))
                                          }
                                        />
                                        <input
                                          className={inputClass()}
                                          placeholder="PDF URL"
                                          value={lessonEditForm.pdfUrl}
                                          onChange={(e) =>
                                            setLessonEditForm((f) => ({ ...f, pdfUrl: e.target.value }))
                                          }
                                        />
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={() => submitLessonEdit(l.id)}>
                                            Kaydet
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => setEditingLessonId(null)}>
                                            İptal
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-[#D7E1F8]">{l.title}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingLessonId(l.id);
                                              setLessonEditForm({
                                                title: l.title,
                                                videoUrl: "",
                                                pdfUrl: "",
                                              });
                                            }}
                                          >
                                            <Pencil size={12} />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => handleDeleteLesson(l.id)}>
                                            <Trash2 size={12} className="text-danger" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {newLessonForModule === m.id ? (
                                <div className="rounded-lg border border-border bg-card-inner p-2.5 space-y-2">
                                  <input
                                    className={inputClass()}
                                    placeholder="Ders başlığı"
                                    value={lessonForm.title}
                                    onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                                    autoFocus
                                  />
                                  <input
                                    className={inputClass()}
                                    placeholder="Video URL (opsiyonel)"
                                    value={lessonForm.videoUrl}
                                    onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))}
                                  />
                                  <input
                                    className={inputClass()}
                                    placeholder="PDF URL (opsiyonel)"
                                    value={lessonForm.pdfUrl}
                                    onChange={(e) => setLessonForm((f) => ({ ...f, pdfUrl: e.target.value }))}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => submitNewLesson(m.id)}>
                                      Ekle
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setNewLessonForModule(null)}
                                    >
                                      İptal
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => setNewLessonForModule(m.id)}>
                                  <Plus size={12} className="mr-1" /> Ders Ekle
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {newModuleForProgram === p.id ? (
                      <div className="flex gap-2">
                        <input
                          className={inputClass()}
                          placeholder="Modül başlığı"
                          value={moduleTitle}
                          onChange={(e) => setModuleTitle(e.target.value)}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => submitNewModule(p.id)}>
                          Ekle
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setNewModuleForProgram(null)}>
                          İptal
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setNewModuleForProgram(p.id)}>
                        <Plus size={14} className="mr-1" /> Modül Ekle
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
