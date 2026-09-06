/** JSON-LD içeriği admin tarafından düzenlenebilen alanlar (program/legend
 * başlığı, açıklama vb.) içerebilir. JSON.stringify `<` karakterini kaçırmaz;
 * içerik "</script>" barındırırsa script tag'inden kaçıp XSS'e yol açar. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
