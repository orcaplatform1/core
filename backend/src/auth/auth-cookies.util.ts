import type { Response } from 'express';

// Access+refresh token'lar artik XSS'e karsi tarayicidan hic okunamayan httpOnly
// cookie olarak taniniyor (eskiden JSON response body'sinde donup frontend
// localStorage'ina duz yaziliyordu - calinirsa kalici, yenilenebilir oturum
// ele geciriyordu). Ayni origin uzerinden servis edildigi (traders.tr/core/backend)
// icin SameSite=Lax + bilinen origin CORS listesi CSRF'e karsi yeterli savunma.
export const ACCESS_COOKIE = 'orca_access_token';
export const REFRESH_COOKIE = 'orca_refresh_token';

const isProd = process.env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
}
