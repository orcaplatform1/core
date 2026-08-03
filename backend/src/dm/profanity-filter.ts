// DM mesajlarinda Turkce kufur/hakaret tespiti icin basit sozluk-tabanli filtre.
// Mukemmel degil (yapay zeka duzeyinde baglam anlama yok) ama gunluk kullanimda
// karsilasilan en yaygin agir kufur/hakaret ifadelerini normalize ederek yakalar:
// buyuk/kucuk harf, Turkce ozel karakterler (ç/ş/ğ/ı/ö/ü) ve basit leetspeak
// (4->a, 1->i, 3->e, 0->o) farkliliklarini elemine eder.
const BANNED_WORDS = [
  'amk', 'aq', 'amcik', 'yarrak', 'yarak', 'siktir', 'sikeyim', 'sikerim', 'sikik',
  'orospu', 'piç', 'pic', 'göt', 'got', 'gotveren', 'ibne', 'top', 'yavşak', 'yavsak',
  'salak', 'aptal', 'gerizekali', 'geri zekali', 'mal', 'ahmak', 'dangalak',
  'kaltak', 'kahpe', 'sürtük', 'surtuk', 'şerefsiz', 'serefsiz', 'namussuz',
  'bok', 'boktan', 'siktiret', 'oc', 'öc', 'ananı', 'anani', 'avradını', 'avradini',
  'puşt', 'pust', 'dürzü', 'durzu', 'hıyar', 'hiyar', 'dallama', 'dumbik',
];

function normalize(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/4/g, 'a').replace(/1/g, 'i').replace(/3/g, 'e').replace(/0/g, 'o')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  const words = normalized.split(' ');
  return BANNED_WORDS.some((banned) => {
    const normalizedBanned = normalize(banned);
    return words.includes(normalizedBanned) || normalized.includes(normalizedBanned);
  });
}
