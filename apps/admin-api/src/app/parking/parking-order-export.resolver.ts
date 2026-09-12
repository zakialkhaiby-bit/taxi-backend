import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { ExportResolver } from '../export/export.resolver';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { ParkingTransactionEntity, ParkOrderEntity } from '@ridy/database';
import { Resolver } from '@nestjs/graphql';
import { ParkOrderDTO } from './dto/park-order.dto';
import { ParkingTransactionDTO } from './dto/parking-transaction.dto';

@Resolver(() => ParkOrderDTO)
export class ParkingOrderExportResolver extends ExportResolver(ParkOrderDTO, {
  pagingStrategy: PagingStrategies.NONE, // disable pagination
}) {
  constructor(
    @InjectQueryService(ParkOrderEntity)
    override readonly service: QueryService<ParkOrderEntity>,
  ) {
    super(service);
  }
}

@Resolver(() => ParkingTransactionDTO)
export class ParkingTransactionExportResolver extends ExportResolver(
  ParkingTransactionDTO,
  {
    pagingStrategy: PagingStrategies.NONE, // disable pagination
  },
) {
  constructor(
    @InjectQueryService(ParkingTransactionEntity)
    override readonly service: QueryService<ParkingTransactionEntity>,
  ) {
    super(service);
  }
}
