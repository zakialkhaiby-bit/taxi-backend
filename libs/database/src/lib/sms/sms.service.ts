import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import { SharedConfigurationService } from '../config/shared-configuration.service';
import { SMSProviderService } from './sms-provider.service';
import { SMSProviderType } from '../entities/enums/sms-provider-type.enum';
import { BroadnetService } from './providers/broadnet.service';
import { TwilioService } from './providers/twilio.service';
import { PlivoService } from './providers/plivo.service';
import { VonageService } from './providers/vonage.service';
import { ForbiddenError } from '@nestjs/apollo';
import { PahappaService } from './providers/pahappa.service';
import { VentisService } from './providers/ventis.service';
import { ClickSMSService } from './providers/clicksms.service';
import { EvolutionService } from './providers/evolution.service';

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);

  constructor(
    private smsProviderService: SMSProviderService,
    private sharedConfigService: SharedConfigurationService,
    private twilioService: TwilioService,
    private broadnetService: BroadnetService,
    private plivoService: PlivoService,
    private vonageService: VonageService,
    private pahappaService: PahappaService,
    private ventisService: VentisService,
    private clickSMSService: ClickSMSService,
    private evolutionService: EvolutionService,
  ) {}

  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      await this.evolutionService.sendOTP({
        phoneNumber,
        message,
      });
      return;
    } catch (evolutionError: any) {
      this.logger.warn(
        `Evolution API delivery failed: ${evolutionError?.message}. Attempting DB SMS provider fallback...`,
      );
      try {
        const provider = await this.smsProviderService.getDefaultProvider();

        switch (provider?.type) {
          case SMSProviderType.Twilio:
            await this.twilioService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.BroadNet:
            await this.broadnetService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.Vonage:
            await this.vonageService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.Plivo:
            await this.plivoService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.Pahappa:
            await this.pahappaService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.VentisSMS:
            await this.ventisService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.ClickSMSNet:
            await this.clickSMSService.sendOTP({
              providerEntity: provider,
              phoneNumber,
              message,
            });
            break;

          case SMSProviderType.Firebase:
            // Firebase doesn't actually send SMS, just return
            break;

          default:
            throw new ForbiddenError('The SMS provider is not supported');
        }
      } catch (fallbackError: any) {
        this.logger.error(
          `Fallback SMS provider also failed or not configured: ${fallbackError?.message}`,
        );
        throw evolutionError;
      }
    }
  }

  async sendVerificationCodeSms(phoneNumber: string): Promise<string> {
    const random6Digit = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `رمز التحقق الخاص بك لتطبيق تاكسي هو: *${random6Digit}*\nYour verification code is: *${random6Digit}*`;

    try {
      await this.evolutionService.sendOTP({
        phoneNumber,
        message,
      });
      return random6Digit;
    } catch (evolutionError: any) {
      this.logger.warn(
        `Evolution API OTP failed: ${evolutionError?.message}. Checking DB SMS fallback...`,
      );
      try {
        const defaultProvider = await this.smsProviderService.getDefaultProvider();
        if (defaultProvider) {
          const fallbackMsg =
            defaultProvider.verificationTemplate?.replace(
              '{code}',
              random6Digit,
            ) ?? `OTP is ${random6Digit}`;

          if (defaultProvider?.type === SMSProviderType.Firebase) {
            return random6Digit;
          }

          await this.sendSMS(phoneNumber, fallbackMsg);
          return random6Digit;
        }
      } catch (fallbackError) {
        this.logger.error('No SMS fallback provider available');
      }
      throw evolutionError;
    }
  }

  async sendAnnouncement(phoneNumber: string, message: string): Promise<void> {
    await this.sendSMS(phoneNumber, message);
  }

  async sendVerificationCodeWhatsapp(phoneNumber: string): Promise<string> {
    const random6Digit = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `رمز التحقق الخاص بك لتطبيق تاكسي هو: *${random6Digit}*\nYour verification code is: *${random6Digit}*`;
    await this.evolutionService.sendOTP({
      phoneNumber,
      message,
    });
    return random6Digit;
  }
}
