import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { readFile, rm } from 'fs/promises';
import { credential, projectManagement } from 'firebase-admin';

import { RestJwtAuthGuard } from './auth/rest-jwt-auth.guard';
import { initializeApp } from 'firebase-admin/app';
import { existsSync } from 'fs';
import { Repository } from 'typeorm';
import { MediaEntity, UploadImageInterceptor } from '@ridy/database';
import { InjectRepository } from '@nestjs/typeorm';
import urlJoin from 'proper-url-join';
import { version } from '../../../../package.json';

@Controller()
export class AppController {
  constructor(
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
  ) {}

  @Get()
  async defaultPath(@Res() res: Response) {
    res.send(`✅ Admin API microservice running.\nVersion: ${version}`);
  }

  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }

  @Post('upload')
  @UseGuards(RestJwtAuthGuard)
  @UploadImageInterceptor('file')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let id = '0';
    if (file) {
      const fileUrl =
        file.path && file.path.startsWith('http')
          ? file.path
          : urlJoin(process.env.CDN_URL, file.filename);
      const insert = await this.mediaRepository.insert({
        address: fileUrl,
      });
      id = insert.raw.insertId.toString();
      const response = {
        __typename: 'Media',
        id: id,
        address: fileUrl,
      };
      res.send(response);
    } else {
      res.status(400).send('No file uploaded');
    }
  }

  @Get('reconfig')
  async reconfig(@Req() req: Request, @Res() res: Response) {
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    await rm(configAddress);
    res.send('✅ Config file deleted. Restarting...');
    process.exit(1);
  }

  @Get('apps')
  async apps(@Res() res: Response) {
    const configAddress = `${process.cwd()}/config/config.${
      process.env.NODE_ENV ?? 'production'
    }.json`;
    if (existsSync(configAddress)) {
      const file = await readFile(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file as string);
      initializeApp({
        credential: credential.cert(
          `${process.cwd()}/config/${config.firebaseProjectPrivateKey}`,
        ),
      });
      const apps = await projectManagement().listAppMetadata();
      const finalListOfApps = [];
      for (const app of apps) {
        if (app.platform === 'ANDROID') {
          const config = JSON.parse(
            await projectManagement().androidApp(app.appId).getConfig(),
          );
          finalListOfApps.push({
            packageName: config.client
              .filter((c: any) => c.client_info.mobilesdk_app_id == app.appId)
              .map(
                (c: any) => c.client_info.android_client_info.package_name,
              )[0],
          });
        }
      }
      res.send(finalListOfApps);
      return finalListOfApps;
    }
    res.status(404).send('Config file not found');
    return 'Config file not found';
  }
}
