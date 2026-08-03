import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Standart JwtAuthGuard'in aksine token yoksa/gecersizse istegi reddetmez -
// req.user varsa doldurulur, yoksa undefined kalir. Herkese acik ama giris
// yapmis kullaniciya ozel ek veri (begeni durumu, enrollment vb.) donduren
// uclarda kullanilir (bkz. community.controller.ts akis ucu).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}
