import './instrument';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminAPIModule } from './app/admin-api.module';
import { getConfig } from 'license-verify';
import { initializeApp } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create(AdminAPIModule.register());

  const port = parseInt(process.env.ADMIN_API_PORT || '3000', 10);
  app.enableShutdownHooks();
  app.enableCors();

  const config = await getConfig(process.env.NODE_ENV ?? 'production');
  if (config != null) {
    initializeApp({
      credential: credential.cert(
        `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`,
      ),
    });
  }
  await app.listen(port, () => {
    Logger.log(`Listening at http://localhost:${port}`, 'Admin API');
  });
}

bootstrap();
