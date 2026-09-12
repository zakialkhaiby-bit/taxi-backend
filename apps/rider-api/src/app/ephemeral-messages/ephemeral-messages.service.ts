import { Injectable } from '@nestjs/common';
import { EphemeralMessageDTO } from './dtos/ephemeral-message.dto';
import { RiderRedisService } from '@ridy/database';

@Injectable()
export class EphemeralMessagesService {
  constructor(private riderRedisService: RiderRedisService) {}

  async getEphemeralMessage(riderId: number): Promise<EphemeralMessageDTO[]> {
    const messages = await this.riderRedisService.getEphemeralMessages(
      riderId.toString(),
      true,
    );
    return Promise.all(
      messages.map(async (message) => {
        const result: EphemeralMessageDTO = {
          orderId: message.orderId,
          type: message.type,
          driverFullName: message?.driverFullName ?? null,
          driverProfileUrl: message?.driverProfileUrl ?? null,
          createdAt: message.createdAt,
          expiresAt: message.expiresAt,
          serviceName: message?.serviceName ?? null,
          serviceImageUrl: message?.serviceImageUrl ?? null,
          vehicleName: message?.vehicleName ?? null,
        };
        return result;
      }),
    );
  }

  markEphemeralMessagesAsRead(id: number, messageId: number) {
    this.riderRedisService.deleteEphemeralMessageForRider(id.toString(), messageId.toString());
  }
}
