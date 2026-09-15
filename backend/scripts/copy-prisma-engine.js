// Prisma'nın schema.prisma'daki `output = "../generated/prisma"` ayarı yüzünden
// query engine binary'si (libquery_engine-*.so.node) backend/generated/prisma
// altına iniyor — ama `nest build` (tsc) sadece .ts dosyalarını derleyip
// dist/generated/prisma'ya kopyalıyor, binary dosyayı GÖRMEZDEN GELİYOR.
// Bu yüzden Prisma Client çalışma anında engine'i dist altında bulamıyor
// (özellikle klasör taşındığında/yeniden deploy edildiğinde fark ediliyor —
// bkz. 2026-09-15 traders.tr/core -> traders.tr/orca taşıma bugu).
// Bu script build'in bir parçası olarak binary'yi dist'e kopyalar ki bu hata
// bir daha sessizce geri gelmesin.
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "generated", "prisma");
const DEST_DIR = path.join(__dirname, "..", "dist", "generated", "prisma");

if (!fs.existsSync(SRC_DIR)) {
  console.warn(`[copy-prisma-engine] Kaynak klasör yok: ${SRC_DIR} — atlanıyor.`);
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });

const engineFiles = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".so.node") || f.endsWith(".dll.node"));

if (engineFiles.length === 0) {
  console.warn(`[copy-prisma-engine] ${SRC_DIR} içinde engine binary bulunamadı.`);
  process.exit(0);
}

for (const file of engineFiles) {
  fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  console.log(`[copy-prisma-engine] ${file} -> dist/generated/prisma/`);
}
