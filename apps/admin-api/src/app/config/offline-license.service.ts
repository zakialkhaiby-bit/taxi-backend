import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import {
  AppType,
  LicenseRemoteResponse,
  LicenseType,
  PlatformAddOn,
} from 'license-verify';

export const LICENSE_SECRET = 'HUWIYYA-TAXI-LICENSE-SECRET-2026';

export const MASTER_CODES = [
  'HUW-MASTER-2026-TAXI-VIP0',
  'HUWIYYA-DEVELOPER-MASTER-KEY',
];

/**
 * Checks if a given purchase code is valid according to Huwiyya offline signature
 */
export function validateLicenseCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const cleanCode = code.trim().toUpperCase();

  if (MASTER_CODES.includes(cleanCode)) {
    return true;
  }

  // Format: HUW-XXXX-XXXX-XXXX-XXXX
  const parts = cleanCode.split('-');
  if (parts.length !== 5 || parts[0] !== 'HUW') {
    return false;
  }

  const payload = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`;
  const expectedChecksum = createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();

  return parts[4] === expectedChecksum;
}

/**
 * Generates a valid purchase code using the Huwiyya HMAC algorithm
 */
export function generateLicenseCode(): string {
  const p1 = randomBytes(2).toString('hex').toUpperCase();
  const p2 = randomBytes(2).toString('hex').toUpperCase();
  const p3 = randomBytes(2).toString('hex').toUpperCase();
  const payload = `HUW-${p1}-${p2}-${p3}`;
  const checksum = createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
  return `${payload}-${checksum}`;
}

@Injectable()
export class OfflineLicenseVerifyService {
  licenseInformation?: LicenseRemoteResponse;

  async verifyLicense(input?: {
    purchaseCode?: string;
    email?: string;
  }): Promise<LicenseRemoteResponse> {
    let code = input?.purchaseCode;

    if (!code) {
      try {
        const configPath = `${process.cwd()}/config/config.${
          process.env.NODE_ENV ?? 'production'
        }.json`;
        if (existsSync(configPath)) {
          const content = JSON.parse(readFileSync(configPath, 'utf-8'));
          code = content.purchaseCode;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!code) {
      return {
        status: 'FAILED',
        message: 'رمز الشراء غير متوفر (Purchase code not found)',
      };
    }

    const isValid = validateLicenseCode(code);
    if (!isValid) {
      Logger.warn(
        `License verification failed for code: ${code}`,
        'OfflineLicenseVerifyService',
      );
      return {
        status: 'FAILED',
        message:
          'رمز الشراء غير صحيح أو غير صالح! تأكد من إدخال كود الترخيص الصحيح التابع لمنظومة هوية.',
      };
    }

    const buyer = input?.email
      ? input.email.split('@')[0]
      : 'عميل معتمد (Authorized Client)';

    const response: LicenseRemoteResponse = {
      status: 'OK',
      data: {
        token: `HUW-TOKEN-${Buffer.from(code).toString('base64').substring(0, 16)}`,
        buyerName: buyer,
        licenseType: LicenseType.Extended,
        purchasedAt: new Date().toISOString(),
        supportExpiry: new Date(
          Date.now() + 50 * 365 * 86400 * 1000,
        ).toISOString(),
        connectedApps: [AppType.Taxi, AppType.Shop, AppType.Parking],
        platformAddOns: [PlatformAddOn.FleetAddOn],
        benefits: [
          'ترخيص ممتد كامل (Extended Lifetime License)',
          'تفعيل كافة التطبيقات (Taxi, Shop, Parking)',
          'تفعيل نظام إدارة الأسطول (Fleet Management)',
        ],
        drawbacks: [],
        availableUpgrades: [],
      },
    };

    this.licenseInformation = response;
    return response;
  }

  async deactivteClient(input: {
    purchaseCode: string;
    ip: string;
  }): Promise<'OK' | 'FAILED'> {
    return 'OK';
  }
}
