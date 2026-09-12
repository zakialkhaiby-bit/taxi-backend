import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RiderAPIModule } from './app/rider-api.module';
import { credential } from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';

import './instrument';
import { getConfig } from 'license-verify';

async function bootstrap() {
  const app = await NestFactory.create(RiderAPIModule.register());

  const port = parseInt(
    process.env.PORT || process.env.RIDER_API_PORT || '3000',
    10,
  );
  app.enableShutdownHooks();
  app.enableCors();
  const config = await getConfig(process.env.NODE_ENV ?? 'production');
  if (config) {
    initializeApp({
      credential: credential.cert(
        `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`,
      ),
    });
  }

  await app.listen(port, '0.0.0.0', () => {
    Logger.log('Listening at http://0.0.0.0:' + port, 'Rider API');
  });
}

bootstrap();
