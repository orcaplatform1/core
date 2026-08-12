import { getPrograms } from "@/lib/marketing/get-programs";
import { ProgramCard } from "@/components/programs/program-card";

// Server component: programlar SSR sirasinda fetch edilir (SEO + hizli ilk
// render icin) - onceden client-side react-query hook'uyla cekiliyordu, bu da
// ilk HTML'de sadece yukleniyor iskeleti gorunmesine, arama motorlarinin
// kart icerigini hic gormemesine sebep oluyordu.
export async function ProgramsContent() {
  const programs = await getPrograms();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <p className="mb-10 text-body-sm text-muted-foreground">
        Finans ve trading dünyasında ustalaşmak için tasarlanmış eğitim programları.
      </p>

      {programs.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Henüz yayınlanmış bir program yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}
