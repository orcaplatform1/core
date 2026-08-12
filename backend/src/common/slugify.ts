const TR_MAP: Record<string, string> = {
  ı: 'i',
  i̇: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
};

export function slugify(input: string): string {
  const lower = input.toLocaleLowerCase('tr-TR');
  const trNormalized = lower.replace(/[ışğüöç]/g, (ch) => TR_MAP[ch] ?? ch);
  return trNormalized
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
