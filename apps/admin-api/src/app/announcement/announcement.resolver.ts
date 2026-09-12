import { Args, CONTEXT, Mutation, Resolver } from '@nestjs/graphql';
import { CreateAnnouncementInput } from './inputs/create-announcement.input';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Inject, UseGuards } from '@nestjs/common';
import { UserContext } from '../auth/authenticated-admin';
import { AnnouncementDTO } from './dto/announcement.dto';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AnnouncementResolver {
  constructor(
    private readonly announcementService: AnnouncementService,
    @Inject(CONTEXT) private context: UserContext,
  ) {}

  @Mutation(() => AnnouncementDTO)
  async createAnnouncement(
    @Args('input') input: CreateAnnouncementInput,
  ): Promise<AnnouncementDTO> {
    const announcement = await this.announcementService.createAnnouncement({
      announcement: input,
      operatorId: this.context.req.user?.id,
    });
    return announcement;
  }
}
