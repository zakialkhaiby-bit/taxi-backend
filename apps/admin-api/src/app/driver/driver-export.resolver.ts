import { Resolver } from '@nestjs/graphql';
import { ExportResolver } from '../export/export.resolver';
import { DriverDTO } from './dto/driver.dto';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { DriverEntity, DriverTransactionEntity } from '@ridy/database';
import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { DriverTransactionDTO } from './dto/driver-transaction.dto';

const BaseDriverExportResolver = ExportResolver(DriverDTO, {
  exportFormat: 'csv', // or 'pdf', or dynamically switch based on query param
  pagingStrategy: PagingStrategies.NONE, // disable pagination
});

@Resolver(() => DriverDTO)
export class DriverExportResolver extends BaseDriverExportResolver {
  constructor(
    @InjectQueryService(DriverEntity)
    override readonly service: QueryService<DriverEntity>,
  ) {
    super(service);
  }
}

const BaseDriverTransactionExportResolver = ExportResolver(
  DriverTransactionDTO,
  {
    pagingStrategy: PagingStrategies.NONE,
  },
);

@Resolver()
export class DriverTransactionExportResolver extends BaseDriverTransactionExportResolver {
  constructor(
    @InjectQueryService(DriverTransactionEntity)
    override readonly service: QueryService<DriverTransactionEntity>,
  ) {
    super(service);
  }
}
