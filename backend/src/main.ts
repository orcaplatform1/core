import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Redis/Postgres'in kisa sureli otomatik guncelleme restart'lari (bkz. unattended-upgrades,
// her birkac gunde bir sabah ~06:00-07:00) sirasinda olusan beklenmedik hatalar (ornegin
// undici'nin dusuk seviyeli socket assert'i) daha once process'i sessizce cokertip pm2'yi
// cok sayida restart'a zorluyordu. Artik loglanip (uncaughtException icin) surec temiz
// sekilde kapatiliyor - pm2 zaten otomatik olarak yeniden baslatiyor.
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException] - process temiz sekilde yeniden baslatiliyor:', err);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableShutdownHooks();
  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 ORCA Backend running on http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('[Bootstrap] baslatma basarisiz:', err);
  process.exit(1);
});
