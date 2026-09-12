import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EnabledNotification,
  OperatorEntity,
  PubSubService,
  TaxiOrderEntity,
  TaxiSupportRequestEntity,
} from '@ridy/database';
import { Repository } from 'typeorm';
import { ComplaintDTO } from './dtos/complaint.dto';

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(TaxiSupportRequestEntity)
    private complaintRepo: Repository<TaxiSupportRequestEntity>,
    @InjectRepository(TaxiOrderEntity)
    private orderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(OperatorEntity)
    private operatorRepo: Repository<OperatorEntity>,
    private readonly pubsub: PubSubService,
  ) {}

  async getComplaints(riderId: number): Promise<ComplaintDTO[]> {
    const orders = await this.orderRepository.find({
      where: { riderId },
      take: 50,
      order: { id: 'DESC' },
      relations: {
        complaints: true,
      },
    });
    return orders
      .map((order) => {
        const complaint = order.complaints?.filter(
          (c) => !c.requestedByDriver,
        )[0];
        if (!complaint) {
          return null;
        }
        return {
          id: order.id,
          status: complaint.status,
          subject: complaint.subject || '',
          content: complaint.content || '',
          requestedByDriver: complaint.requestedByDriver || false,
        };
      })
      .filter((c) => c !== null);
  }
  async createComplaint(
    id: number,
    arg1: {
      requestId: number;
      subject: string;
      content?: string;
      requestedByDriver?: boolean;
    },
  ): Promise<ComplaintDTO> {
    const complaint = this.complaintRepo.create({
      ...arg1,
      requestedByDriver: false,
      requestId: arg1.requestId,
    });
    await this.complaintRepo.save(complaint);
    await this.complaintRepo.findOneOrFail({
      where: { id: complaint.id },
      relations: {
        request: true,
        activities: true,
      },
    });
    const admins = await this.operatorRepo.find({
      where: { enabledNotifications: EnabledNotification.SupportRequest },
    });
    for (const admin of admins) {
      this.pubsub.publish(
        'admin.complaint.created',
        {
          operatorId: admin.id,
        },
        {
          complaintId: complaint.id,
          description: complaint.content ?? complaint.subject,
        },
      );
    }
    return complaint;
  }
}
