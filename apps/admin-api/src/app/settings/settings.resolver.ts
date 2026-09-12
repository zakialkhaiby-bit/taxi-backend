import { Args, CONTEXT, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DispatchConfigDTO } from './dto/dispatch-config.dto';
import { BetterConfigService, OperatorPermission } from '@ridy/database';
import { Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserContext } from '../auth/authenticated-admin';
import { OperatorService } from '../operator/operator.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class SettingsResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContext,
    private readonly operatorService: OperatorService,
    private sharedConfigService: BetterConfigService,
  ) {}

  @Query(() => DispatchConfigDTO)
  dispatchConfig(): Promise<DispatchConfigDTO> {
    return this.sharedConfigService.getDispatchConfig();
  }

  @Mutation(() => DispatchConfigDTO)
  async updateDispatchConfig(
    @Args('input', { type: () => DispatchConfigDTO }) input: DispatchConfigDTO,
  ): Promise<DispatchConfigDTO> {
    await this.operatorService.hasPermission(
      this.context.req.user.id,
      OperatorPermission.Critical_Edit,
    );
    await this.sharedConfigService.saveDispatchConfig(input);
    return input;
  }
}
