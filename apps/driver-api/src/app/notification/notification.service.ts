import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity, DriverSessionEntity } from '@ridy/database';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(DriverEntity)
    private readonly driverRepository: Repository<DriverEntity>,
    @InjectRepository(DriverSessionEntity)
    private readonly driverSessionRepository: Repository<DriverSessionEntity>,
  ) {}

  async updateFcmToken(input: {
    customerId: number;
    sessionId?: number;
    fcmToken: string;
  }) {
    const { customerId, sessionId, fcmToken } = input;
    if (sessionId == null) {
      await this.driverRepository.update(customerId, {
        notificationPlayerId: fcmToken,
      });
    } else {
      await this.driverSessionRepository.update(sessionId, {
        sessionInfo: {
          fcmToken: fcmToken,
        },
      });
    }
  }
}
