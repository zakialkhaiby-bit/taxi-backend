import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { DriverAPIModule } from './app/driver-api.module';
import { initializeApp } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

import './instrument';
import { getConfig } from 'license-verify';

async function bootstrap() {
  const app = await NestFactory.create(DriverAPIModule.register());

  const port = parseInt(
    process.env.PORT || process.env.DRIVER_API_PORT || '3000',
    10,
  );
  app.enableShutdownHooks();
  app.enableCors();
  const config = await getConfig(process.env.NODE_ENV ?? 'production');
  if (config != null) {
    const fs = await import('fs');
    const fbPath = `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`;
    if (fs.existsSync(fbPath)) {
      try {
        initializeApp({
          credential: credential.cert(fbPath),
        });
      } catch (e) {
        Logger.warn('Firebase init skipped: ' + (e as any)?.message, 'Driver API');
      }
    }
  }
  await app.listen(port, '0.0.0.0', () => {
    Logger.log('Listening at http://0.0.0.0:' + port, 'Driver API');
  });
}

bootstrap();
