import { Resolver } from '@nestjs/graphql';
import { ExportResolver } from '../export/export.resolver';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { ProviderTransactionEntity } from '@ridy/database';
import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { ProviderTransactionDTO } from './dto/provider-transaction.dto';

@Resolver()
export class ProviderTransactionExportResolver extends ExportResolver(
  ProviderTransactionDTO,
  {
    pagingStrategy: PagingStrategies.NONE,
  },
) {
  constructor(
    @InjectQueryService(ProviderTransactionEntity)
    override readonly service: QueryService<ProviderTransactionEntity>,
  ) {
    super(service);
  }
}
