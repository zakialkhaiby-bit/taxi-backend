import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AnnouncementEntity,
  DriverEntity,
  CustomerEntity,
  AnnouncementUserType,
  SMSService,
} from '@ridy/database';
import { Repository, Not, IsNull } from 'typeorm';
import { CreateAnnouncementInput } from './inputs/create-announcement.input';
import { AnnouncementDTO } from './dto/announcement.dto';
import { messaging } from 'firebase-admin';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly announcementRepository: Repository<AnnouncementEntity>,
    @InjectRepository(DriverEntity)
    private readonly driverRepository: Repository<DriverEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly smsService: SMSService,
  ) {}

  async createAnnouncement(input: {
    announcement: CreateAnnouncementInput;
    operatorId?: number;
  }): Promise<AnnouncementDTO> {
    const announcement = this.announcementRepository.create(input.announcement);
    if (
      input.announcement.pushNotification !== true &&
      input.announcement.smsNotification !== true
    ) {
      await this.announcementRepository.save(announcement);
      return announcement;
    }
    // gather fcm tokens and mobile numbers
    const fcmTokens: string[] = [];
    const mobileNumbers: string[] = [];
    if (input.announcement.userType.includes(AnnouncementUserType.Driver)) {
      const drivers = await this.driverRepository.find({
        where: { notificationPlayerId: Not(IsNull()) },
        select: ['notificationPlayerId', 'mobileNumber'],
      });
      if (input.announcement.smsNotification === true) {
        mobileNumbers.push(...drivers.map((d) => d.mobileNumber));
      }
      if (input.announcement.pushNotification === true) {
        fcmTokens.push(...drivers.map((d) => d.notificationPlayerId));
      }
    }
    if (input.announcement.userType.includes(AnnouncementUserType.Rider)) {
      const customers = await this.customerRepository.find({
        where: { notificationPlayerId: Not(IsNull()) },
        select: ['notificationPlayerId', 'mobileNumber'],
      });
      if (input.announcement.smsNotification === true) {
        mobileNumbers.push(...customers.map((c) => c.mobileNumber));
      }
      if (input.announcement.pushNotification === true) {
        fcmTokens.push(...customers.map((c) => c.notificationPlayerId));
      }
    }
    if (fcmTokens.length > 0 && input.announcement.pushNotification === true) {
      await messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title:
            input.announcement.pushNotificationTitle ||
            input.announcement.title,
          body:
            input.announcement.pushNotificationBody ||
            input.announcement.description ||
            '',
        },
        data: input.announcement.url
          ? { url: input.announcement.url }
          : undefined,
      });
    }
    if (
      mobileNumbers.length > 0 &&
      input.announcement.smsNotification === true
    ) {
      for (const mobileNumber of mobileNumbers) {
        await this.smsService.sendSMS(
          mobileNumber,
          input.announcement.smsNotificationBody ||
            input.announcement.description,
        );
      }
    }

    await this.announcementRepository.save(announcement);
    return announcement;
  }
}
