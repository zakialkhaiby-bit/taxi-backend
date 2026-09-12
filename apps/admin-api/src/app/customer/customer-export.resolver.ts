import { Resolver } from '@nestjs/graphql';
import { ExportResolver } from '../export/export.resolver';
import { CustomerDTO } from './dto/customer.dto';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { CustomerEntity, RiderTransactionEntity } from '@ridy/database';
import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { RiderTransactionDTO } from './dto/rider-transaction.dto';

@Resolver(() => CustomerDTO)
export class CustomerExportResolver extends ExportResolver(CustomerDTO, {
  pagingStrategy: PagingStrategies.NONE,
}) {
  constructor(
    @InjectQueryService(CustomerEntity)
    override readonly service: QueryService<CustomerEntity>,
  ) {
    super(service);
  }
}

@Resolver(() => RiderTransactionDTO)
export class CustomerTransactionExportResolver extends ExportResolver(
  RiderTransactionDTO,
  {
    pagingStrategy: PagingStrategies.NONE,
  },
) {
  constructor(
    @InjectQueryService(RiderTransactionEntity)
    override readonly service: QueryService<RiderTransactionEntity>,
  ) {
    super(service);
  }
}
