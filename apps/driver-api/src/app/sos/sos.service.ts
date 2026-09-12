import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Point, PubSubService } from '@ridy/database';
import { OperatorEntity } from '@ridy/database';
import { SOSEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { EnabledNotification } from '@ridy/database';

@Injectable()
export class SOSService {
  constructor(
    @InjectRepository(SOSEntity)
    private readonly sosRepository: Repository<SOSEntity>,
    @InjectRepository(OperatorEntity)
    private readonly operatorRepo: Repository<OperatorEntity>,
    private readonly pubsub: PubSubService,
  ) {}

  async submitSOS(input: {
    location: Point;
    requestId: number;
  }): Promise<SOSEntity> {
    const sos = this.sosRepository.create({
      submittedByRider: false,
      location: input.location,
      requestId: input.requestId,
    });
    const dto = await this.sosRepository.save(sos);
    const savedRecord = await this.sosRepository.findOneOrFail({
      where: { id: dto.id },
      relations: {
        request: true,
        activities: true,
      },
    });
    const admins = await this.operatorRepo.find({
      where: { enabledNotifications: EnabledNotification.SOS },
    });
    for (const admin of admins) {
      this.pubsub.publish(
        'admin.sos.created',
        {
          operatorId: admin.id,
        },
        {
          sosId: savedRecord.id,
        },
      );
    }
    return savedRecord;
  }
}
