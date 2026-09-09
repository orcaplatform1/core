import { Injectable, Logger, BadGatewayException } from '@nestjs/common';

// Etherscan V2 API — v1 (api.etherscan.io/api) artik deprecated, v2'de tum
// zincirler tek endpoint + chainid parametresiyle sorgulanıyor.
const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 1; // Ethereum mainnet (Solana v2'de yok, ayri bir is)

const CALL_DELAY_MS = 220; // Etherscan free tier ~5 req/sn — güvenli aralık
// Fonlama kaynağının kendi giden işlem sayısı bu eşiği aşarsa (ör. bir borsa
// hot wallet'ı binlerce kullanıcıya para gönderir) "bağlı cüzdan" aramasını
// anlamsız/gürültülü kabul edip atlıyoruz — rastgele borsa müşterilerini
// birbirine "bağlantılı" göstermemek için.
const EXCHANGE_LIKE_OUTGOING_THRESHOLD = 100;
const MAX_CANDIDATE_WALLETS = 15;
const RECENT_WINDOW_DAYS = 30;

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
}

export interface ConnectedWallet {
  address: string;
  sameDayActivityCount: number;
  recentSameDayDates: string[];
}

export interface WalletAnalysisResult {
  address: string;
  fundingSource: string | null;
  fundingSourceLooksLikeExchange: boolean;
  connectedWallets: ConnectedWallet[];
  summary: string;
  disclaimer: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toUtcDateString(unixTimestampSeconds: string): string {
  return new Date(Number(unixTimestampSeconds) * 1000).toISOString().slice(0, 10);
}

@Injectable()
export class WalletAnalysisService {
  private readonly logger = new Logger(WalletAnalysisService.name);

  private async etherscanCall(params: Record<string, string>): Promise<any> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new BadGatewayException('Cüzdan analizi şu anda kullanılamıyor (API anahtarı tanımlı değil).');
    }
    const url = new URL(ETHERSCAN_BASE);
    url.searchParams.set('chainid', String(CHAIN_ID));
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set('apikey', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new BadGatewayException('Etherscan API şu anda yanıt vermiyor, lütfen daha sonra tekrar deneyin.');
    }
    const data = (await res.json()) as { status: string; message: string; result: unknown };
    return data;
  }

  private async getTxList(address: string, sort: 'asc' | 'desc', offset: number): Promise<EtherscanTx[]> {
    const data = await this.etherscanCall({
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(offset),
      sort,
    });
    // Etherscan "kayıt yok" durumunda status "0" + message "No transactions found" döner —
    // bu bir hata değil, boş sonuç. Gerçek hatalarda result string bir mesaj olur.
    if (!Array.isArray(data.result)) return [];
    return data.result as EtherscanTx[];
  }

  private recentActivityDates(txs: EtherscanTx[], sinceDays: number): Set<string> {
    const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
    const dates = new Set<string>();
    for (const tx of txs) {
      const ts = Number(tx.timeStamp) * 1000;
      if (ts >= cutoff) dates.add(toUtcDateString(tx.timeStamp));
    }
    return dates;
  }

  async analyzeWallet(rawAddress: string): Promise<WalletAnalysisResult> {
    const address = rawAddress.toLowerCase();
    const disclaimer = 'Bu analiz olasılık temellidir, kesin kimlik/sahiplik iddiası değildir.';

    // 1) Fonlama kaynağını bul — cüzdana gelen ilk (value > 0) işlemin gönderen adresi.
    const earliestTxs = await this.getTxList(address, 'asc', 50);
    const firstIncoming = earliestTxs.find(
      (tx) => tx.to?.toLowerCase() === address && tx.value !== '0',
    );

    if (!firstIncoming) {
      return {
        address,
        fundingSource: null,
        fundingSourceLooksLikeExchange: false,
        connectedWallets: [],
        summary:
          earliestTxs.length === 0
            ? 'Bu adreste herhangi bir işlem geçmişi bulunamadı.'
            : 'Bu cüzdanın gelen (fonlama) işlemi tespit edilemedi — ilk işlemleri arasında bir para girişi bulunamadı.',
        disclaimer,
      };
    }

    const fundingSource = firstIncoming.from.toLowerCase();
    await sleep(CALL_DELAY_MS);

    // 2) Fonlama kaynağının kendi giden işlemlerine bak — aynı kaynaktan
    // fonlanan başka cüzdanlar var mı? Örneklem 100 işlemle sınırlı; bu
    // sınıra dayanıyorsa muhtemelen borsa/servis hesabıdır, anlamlı bir
    // kişisel bağlantı aramak yerine bunu açıkça belirtiyoruz.
    const fundingSourceTxs = await this.getTxList(fundingSource, 'asc', EXCHANGE_LIKE_OUTGOING_THRESHOLD);
    const fundingSourceOutgoing = fundingSourceTxs.filter(
      (tx) => tx.from?.toLowerCase() === fundingSource && tx.value !== '0',
    );
    const looksLikeExchange = fundingSourceOutgoing.length >= EXCHANGE_LIKE_OUTGOING_THRESHOLD;

    if (looksLikeExchange) {
      return {
        address,
        fundingSource,
        fundingSourceLooksLikeExchange: true,
        connectedWallets: [],
        summary: `Bu cüzdan ${fundingSource} adresinden fonlanmış. Bu adres çok sayıda giden işlem içerdiği için muhtemelen bir borsa veya servis cüzdanı — bu kaynaktan fonlanan diğer cüzdanlar arasında anlamlı bir kişisel bağlantı aranmadı.`,
        disclaimer,
      };
    }

    const candidateAddresses = Array.from(
      new Set(
        fundingSourceOutgoing
          .map((tx) => tx.to?.toLowerCase())
          .filter((addr): addr is string => Boolean(addr) && addr !== address && addr !== fundingSource),
      ),
    ).slice(0, MAX_CANDIDATE_WALLETS);

    // 3) Orijinal cüzdanın son N gündeki aktivite günlerini çıkar.
    await sleep(CALL_DELAY_MS);
    const originalRecentTxs = await this.getTxList(address, 'desc', 50);
    const originalRecentDates = this.recentActivityDates(originalRecentTxs, RECENT_WINDOW_DAYS);

    // 4) Her aday cüzdan için zaman-korelasyonu kontrol et.
    const connectedWallets: ConnectedWallet[] = [];
    for (const candidate of candidateAddresses) {
      await sleep(CALL_DELAY_MS);
      const candidateTxs = await this.getTxList(candidate, 'desc', 50);
      const candidateDates = this.recentActivityDates(candidateTxs, RECENT_WINDOW_DAYS);
      const overlap = [...candidateDates].filter((d) => originalRecentDates.has(d)).sort();
      if (overlap.length > 0) {
        connectedWallets.push({
          address: candidate,
          sameDayActivityCount: overlap.length,
          recentSameDayDates: overlap.slice(-5),
        });
      }
    }

    const correlatedCount = connectedWallets.length;
    const totalCandidates = candidateAddresses.length;
    let summary = `Bu cüzdan ${fundingSource} adresinden fonlanmış.`;
    if (totalCandidates === 0) {
      summary += ' Aynı kaynaktan fonlanmış başka bir cüzdan bulunamadı.';
    } else {
      summary += ` Aynı kaynaktan fonlanmış ${totalCandidates} cüzdan daha bulundu.`;
      if (correlatedCount > 0) {
        summary += ` Bunlardan ${correlatedCount}'i son ${RECENT_WINDOW_DAYS} günde bu cüzdanla aynı günlerde işlem yapmış.`;
      } else {
        summary += ` Bunlardan hiçbiri son ${RECENT_WINDOW_DAYS} günde bu cüzdanla aynı zamanlarda işlem yapmamış.`;
      }
    }

    return {
      address,
      fundingSource,
      fundingSourceLooksLikeExchange: false,
      connectedWallets,
      summary,
      disclaimer,
    };
  }
}
