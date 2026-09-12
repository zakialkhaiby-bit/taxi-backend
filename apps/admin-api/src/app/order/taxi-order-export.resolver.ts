import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { ExportResolver } from '../export/export.resolver';
import { TaxiOrderDTO } from './dto/order.dto';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { TaxiOrderEntity } from '@ridy/database';
import { Resolver } from '@nestjs/graphql';

@Resolver(() => TaxiOrderDTO)
export class TaxiOrderExportResolver extends ExportResolver(TaxiOrderDTO, {
  exportFormat: 'csv', // or 'pdf', or dynamically switch based on query param
  pagingStrategy: PagingStrategies.NONE, // disable pagination
}) {
  constructor(
    @InjectQueryService(TaxiOrderEntity)
    override readonly service: QueryService<TaxiOrderEntity>,
  ) {
    super(service);
  }
}
