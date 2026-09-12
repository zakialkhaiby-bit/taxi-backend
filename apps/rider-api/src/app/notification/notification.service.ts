import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity, CustomerSessionEntity } from '@ridy/database';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(CustomerSessionEntity)
    private readonly customerSessionRepository: Repository<CustomerSessionEntity>,
  ) {}

  async updateFcmToken(input: {
    customerId: number;
    sessionId?: number;
    fcmToken: string;
  }) {
    const { customerId, sessionId, fcmToken } = input;
    if (sessionId == null) {
      await this.customerRepository.update(customerId, {
        notificationPlayerId: fcmToken,
      });
    } else {
      await this.customerSessionRepository.update(sessionId, {
        sessionInfo: {
          fcmToken: fcmToken,
        },
      });
    }
  }
}
