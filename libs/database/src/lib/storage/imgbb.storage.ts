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
          timeout: 45000,
        },
      );

      const data = response.data;
      if (data?.success && data?.data?.url) {
        const directUrl: string = data.data.url;
        if (this.urlMap.size > 1000) {
          const firstKey = this.urlMap.keys().next().value;
          if (firstKey) this.urlMap.delete(firstKey);
        }
        this.urlMap.set(key, directUrl);
        this.logger.log(`Uploaded image to ImgBB successfully: ${directUrl}`);
        return directUrl;
      } else {
        throw new Error(
          `ImgBB upload failed: ${JSON.stringify(data ?? 'Empty response')}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to upload image to ImgBB: ${error.message}`,
        error.response?.data ? JSON.stringify(error.response.data) : error.stack,
      );
      throw error;
    }
  }

  publicPathFor(key: string): string {
    return this.urlMap.get(key) ?? key;
  }
}
