import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const WHALE_ADDRESSES = [
  { address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', label: 'Binance Soğuk Cüzdanı #1', category: 'EXCHANGE' as const },
  { address: '3M219KR5vEneNb47ewrPfWyb5jQ2DjxRP6', label: 'Binance Soğuk Cüzdanı #2', category: 'EXCHANGE' as const },
  { address: 'bc1ql49ydapnjafl5t2cp9zqpjwe6pdgmxy98859v2', label: 'Robinhood Soğuk Cüzdanı', category: 'EXCHANGE' as const },
  { address: 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97', label: 'Bitfinex Soğuk Cüzdanı', category: 'EXCHANGE' as const },
  { address: 'bc1qazcm763858nkj2dj986etajv6wquslv8uxwczt', label: 'ABD Hükümeti (Bitfinex Hack Kurtarma)', category: 'INSTITUTION' as const },
  { address: '1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF', label: 'Mt. Gox Hack Cüzdanı (2011, hareketsiz)', category: 'WHALE' as const },
];

const LEGACY_BASE58_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BECH32_RE = /^bc1[a-z0-9]{25,90}$/i;

// Yapısal sağlık kontrolü — tam checksum doğrulaması değil (harici kripto
// kütüphanesi gerektirmez), sadece formatın legacy Base58 ya da bech32
// adres kalıbına uyup uymadığını kontrol eder. Gelecekte elle eklenecek
// hatalı/bozuk adresleri erkenden yakalamak içindir.
function validateAddressFormat(address: string): void {
  if (!LEGACY_BASE58_RE.test(address) && !BECH32_RE.test(address)) {
    throw new Error(
      `Geçersiz Bitcoin adres formatı: "${address}" ne legacy Base58 ne de bech32 kalıbına uyuyor.`,
    );
  }
}

async function main() {
  for (const whale of WHALE_ADDRESSES) {
    validateAddressFormat(whale.address);

    await prisma.whaleAddress.upsert({
      where: { address: whale.address },
      update: { label: whale.label, category: whale.category },
      create: { address: whale.address, label: whale.label, category: whale.category },
    });
    console.log(`${whale.address} (${whale.label}) eklendi/güncellendi.`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
