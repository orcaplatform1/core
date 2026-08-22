import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Sembol/ticker gösterim adı: USDT paritesini kırpar, BTC yerine XBT gösterir
 * (kullanıcı tercihi — "Bitcoin" kelimesi ayrı, bu sadece kısaltma). */
export function displayTicker(symbol: string): string {
  const short = symbol.replace(/USDT$/, "");
  return short === "BTC" ? "XBT" : short;
}
