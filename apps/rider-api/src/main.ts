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
  const express = await import('express');
  const fs = await import('fs');
  const uploadsDir = `${process.cwd()}/uploads`;
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
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
        Logger.warn('Firebase init skipped: ' + (e as any)?.message, 'Rider API');
      }
    }
  }

  await app.listen(port, '0.0.0.0', () => {
    Logger.log('Listening at http://0.0.0.0:' + port, 'Rider API');
  });
}

bootstrap();
