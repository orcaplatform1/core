import type { Program, CourseModule, LessonSummary } from "@/lib/types/curriculum";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function getPrograms(): Promise<Program[]> {
  try {
    const res = await fetch(`${BASE_URL}/programs`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// slug veya (geriye dönük uyumluluk icin) eski cuid id kabul eder - bkz.
// backend ProgramsService.findBySlugOrId.
export async function getProgramBySlugOrId(slugOrId: string): Promise<Program | null> {
  try {
    const res = await fetch(`${BASE_URL}/programs/${slugOrId}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getAllModules(): Promise<CourseModule[]> {
  try {
    const res = await fetch(`${BASE_URL}/modules`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getAllLessons(): Promise<LessonSummary[]> {
  try {
    const res = await fetch(`${BASE_URL}/lessons`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
