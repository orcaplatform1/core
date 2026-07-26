// Saf geometri yardımcıları — piksel (media/CSS) koordinatlarında çalışır.
// lightweight-charts primitive'lerinin hitTest(x, y) metodu tarafından kullanılır.

export type XY = { x: number; y: number };

export const HANDLE_RADIUS = 8;
export const LINE_TOLERANCE = 6;

export function distance(a: XY, b: XY): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj: XY = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}

// Sonsuza uzayan bir ray için mesafe: segment yerine, a'dan b yönünde ileri
// doğru (t >= 0) sınırsız bir ışın üzerindeki en yakın noktaya mesafe.
export function distanceToRay(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, t);
  const proj: XY = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}

export function isInsideRect(p: XY, a: XY, b: XY): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

export function isInsideEllipse(p: XY, a: XY, b: XY): boolean {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = Math.abs(b.x - a.x) / 2 || 1;
  const ry = Math.abs(b.y - a.y) / 2 || 1;
  const nx = (p.x - cx) / rx;
  const ny = (p.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

// Kanal aracı: a→b ana çizgisine paralel, c noktasından geçen ikinci çizgi.
// Piksel uzayında dik (perpendicular) ofseti hesaplayıp a/b'ye ekler — bu
// sayede zoom/pan sırasında da gerçekten paralel görünür (veri uzayında değil,
// ekran pikseli uzayında paralellik korunur).
export function channelSecondLine(a: XY, b: XY, c: XY): { a2: XY; b2: XY } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = -dy / len;
  const uy = dx / len;
  const vx = c.x - a.x;
  const vy = c.y - a.y;
  const dist = vx * ux + vy * uy;
  const ox = ux * dist;
  const oy = uy * dist;
  return { a2: { x: a.x + ox, y: a.y + oy }, b2: { x: b.x + ox, y: b.y + oy } };
}
