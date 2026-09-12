import { PagingStrategies } from '@ptc-org/nestjs-query-graphql';
import { ExportResolver } from '../export/export.resolver';
import { InjectQueryService, QueryService } from '@ptc-org/nestjs-query-core';
import { ShopOrderEntity, ShopTransactionEntity } from '@ridy/database';
import { Resolver } from '@nestjs/graphql';
import { ShopOrderDTO } from './dto/shop-order.dto';
import { ShopTransactionDTO } from './dto/shop-transaction.dto';

@Resolver(() => ShopOrderDTO)
export class ShopOrderExportResolver extends ExportResolver(ShopOrderDTO, {
  pagingStrategy: PagingStrategies.NONE, // disable pagination
}) {
  constructor(
    @InjectQueryService(ShopOrderEntity)
    override readonly service: QueryService<ShopOrderEntity>,
  ) {
    super(service);
  }
}

@Resolver(() => ShopTransactionDTO)
export class ShopTransactionExportResolver extends ExportResolver(
  ShopTransactionDTO,
  {
    pagingStrategy: PagingStrategies.NONE, // disable pagination
  },
) {
  constructor(
    @InjectQueryService(ShopTransactionEntity)
    override readonly service: QueryService<ShopTransactionEntity>,
  ) {
    super(service);
  }
}
