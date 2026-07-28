import type { Program } from "@/lib/types/curriculum";

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
