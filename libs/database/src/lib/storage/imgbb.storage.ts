import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from './storage.port';
import { Readable } from 'stream';
import axios from 'axios';
import FormData from 'form-data';
import * as https from 'https';
import * as path from 'path';

@Injectable()
export class ImgbbStorage implements StoragePort {
  private readonly logger = new Logger(ImgbbStorage.name);
  private readonly apiKey: string;
  private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });
  private readonly urlMap = new Map<string, string>();

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ??
      process.env.IMGBB_API_KEY ??
      'eec05bc15ee24454e22cdd276fec9d0c';
    if (!this.apiKey) {
      this.logger.warn('IMGBB_API_KEY is not configured');
    }
  }

  async putObject({
    key,
    body,
  }: {
    key: string;
    body: Buffer | Readable;
    contentType?: string;
    cacheControl?: string;
  }): Promise<string> {
    try {
      let buffer: Buffer;
      if (Buffer.isBuffer(body)) {
        buffer = body;
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      }

      // 1. Primary: FreeImage.host (Cloudflare-backed CDN, fast & permanent)
      try {
        const formFree = new FormData();
        formFree.append('key', '6d207e02198a847aa98d0a2a901485a5');
        formFree.append('action', 'upload');
        formFree.append('source', buffer.toString('base64'));
        formFree.append('format', 'json');

        const resFree = await axios.post(
          'https://freeimage.host/api/1/upload',
          formFree,
          {
            headers: formFree.getHeaders(),
            httpsAgent: this.httpsAgent,
            timeout: 30000,
          },
        );

        if (resFree.data?.image?.url) {
          const directUrl: string = resFree.data.image.url;
          this.urlMap.set(key, directUrl);
          this.logger.log(`Uploaded image to CDN successfully: ${directUrl}`);
          return directUrl;
        }
      } catch (err: any) {
        this.logger.warn(
          `FreeImage CDN upload failed (${err.message}), trying secondary...`,
        );
      }

      // 2. Secondary: ImgBB
      if (this.apiKey && this.apiKey !== 'eec05bc15ee24454e22cdd276fec9d0c') {
        try {
          const form = new FormData();
          form.append('image', buffer.toString('base64'));
          const filename = path.basename(key, path.extname(key));
          form.append('name', filename);

          const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${encodeURIComponent(this.apiKey)}`,
            form,
            {
              headers: form.getHeaders(),
              httpsAgent: this.httpsAgent,
              timeout: 30000,
            },
          );

          if (response.data?.success && response.data?.data?.url) {
            const directUrl: string = response.data.data.url;
            this.urlMap.set(key, directUrl);
            this.logger.log(`Uploaded image to ImgBB successfully: ${directUrl}`);
            return directUrl;
          }
        } catch (err: any) {
          this.logger.warn(`ImgBB upload failed: ${err.message}`);
        }
      }

      // 3. Fallback: Save to local uploads directory and serve via static endpoint
      const fs = await import('fs/promises');
      const full = path.join(process.cwd(), key);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, buffer);

      const hostUrl =
        process.env.BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        'https://taxi-driver-api.onrender.com';
      const cleanKey = key.replace(/^uploads\//, '');
      const directUrl = `${hostUrl.replace(/\/+$/, '')}/uploads/${cleanKey}`;
      this.urlMap.set(key, directUrl);
      this.logger.log(
        `Saved image locally as resilient fallback: ${directUrl}`,
      );
      return directUrl;
    } catch (error: any) {
      this.logger.error(
        `Failed all image upload attempts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  publicPathFor(key: string): string {
    return this.urlMap.get(key) ?? key;
  }
}
