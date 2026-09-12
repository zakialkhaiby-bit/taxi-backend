import { Args, CONTEXT, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ComplaintService } from './complaint.service';
import { ComplaintDTO } from './dtos/complaint.dto';
import { ComplaintInput } from './inputs/complaint.input';
import { UserContext } from '../auth/authenticated-user';
import { Inject, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/access-token.guard';

@Resolver()
@UseGuards(GqlAuthGuard)
export class ComplaintResolver {
  constructor(
    @Inject(CONTEXT)
    private readonly context: UserContext,
    private readonly complaintService: ComplaintService,
  ) {}

  @Mutation(() => ComplaintDTO)
  async createComplaint(
    @Args('input') input: ComplaintInput,
  ): Promise<ComplaintDTO> {
    return this.complaintService.createComplaint(this.context.req.user.id, {
      ...input,
    });
  }

  @Query(() => [ComplaintDTO])
  async getComplaints(): Promise<ComplaintDTO[]> {
    return this.complaintService.getComplaints(this.context.req.user.id);
  }
}
