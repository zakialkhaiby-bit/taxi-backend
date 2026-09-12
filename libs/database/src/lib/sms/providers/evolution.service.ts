import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export const EVOLUTION_DEFAULT_LINK =
  'https://expensive-michelle-huwiyyaa-4d991118.koyeb.app';
export const EVOLUTION_DEFAULT_INSTANCE = 'HuwiyyaProQR';
export const EVOLUTION_DEFAULT_TOKEN =
  '57BC19F5-CE0D-4E04-81B9-492BCE0D16A0';

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);

  constructor(private httpService: HttpService) {}

  async sendOTP(input: {
    phoneNumber: string;
    message: string;
    link?: string;
    instance?: string;
    token?: string;
  }): Promise<void> {
    const rawLink =
      input.link ||
      process.env.EVOLUTION_API_URL ||
      EVOLUTION_DEFAULT_LINK;
    const link = rawLink.replace(/\/+$/, '');
    const instance =
      input.instance ||
      process.env.EVOLUTION_INSTANCE ||
      EVOLUTION_DEFAULT_INSTANCE;
    const token =
      input.token ||
      process.env.EVOLUTION_API_TOKEN ||
      EVOLUTION_DEFAULT_TOKEN;

    let cleanNumber = input.phoneNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('00')) {
      cleanNumber = cleanNumber.substring(2);
    }
    if (cleanNumber.startsWith('05') && cleanNumber.length === 10) {
      cleanNumber = `966${cleanNumber.substring(1)}`;
    }

    const url = `${link}/message/sendText/${encodeURIComponent(instance)}`;

    this.logger.log(
      `[WhatsApp OTP] Sending message to ${cleanNumber} via Evolution API (${instance})`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            number: cleanNumber,
            text: input.message,
          },
          {
            headers: {
              apikey: token,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          },
        ),
      );

      this.logger.log(
        `[WhatsApp OTP] Message dispatched successfully: ${JSON.stringify(
          response.data,
        )}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[WhatsApp OTP] Failed to send message via Evolution API: ${
          error?.response?.data
            ? JSON.stringify(error.response.data)
            : error?.message
        }`,
      );
      throw error;
    }
  }
}
