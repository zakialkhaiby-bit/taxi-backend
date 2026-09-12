import { Resolver } from '@nestjs/graphql';
import { ExportResolver } from '../export/export.resolver';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { FleetEntity, FleetTransactionEntity } from '@ridy/database';
import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { FleetDTO } from './dto/fleet.dto';
import { FleetTransactionDTO } from './dto/fleet-transaction.dto';

@Resolver(() => FleetDTO)
export class FleetExportResolver extends ExportResolver(FleetDTO, {
  pagingStrategy: PagingStrategies.NONE,
}) {
  constructor(
    @InjectQueryService(FleetEntity)
    override readonly service: QueryService<FleetEntity>,
  ) {
    super(service);
  }
}

@Resolver(() => FleetTransactionDTO)
export class FleetTransactionExportResolver extends ExportResolver(
  FleetTransactionDTO,
  {
    pagingStrategy: PagingStrategies.NONE,
  },
) {
  constructor(
    @InjectQueryService(FleetTransactionEntity)
    override readonly service: QueryService<FleetTransactionEntity>,
  ) {
    super(service);
  }
}
