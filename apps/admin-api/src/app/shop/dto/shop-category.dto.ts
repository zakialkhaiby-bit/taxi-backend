import { ID, ObjectType } from '@nestjs/graphql';
import {
  Authorize,
  FilterableField,
  IDField,
  OffsetConnection,
  Relation,
} from '@ptc-org/nestjs-query-graphql';
import { ShopCategoryStatus } from '@ridy/database';
import { MediaDTO } from '../../upload/media.dto';
import { ShopDTO } from './shop.dto';
import { CriticalSectionsAuthorizer } from '../../core/authorizers/critical-sections.authorizer';

@ObjectType('ShopCategory', {})
@Relation('image', () => MediaDTO, { nullable: true })
@OffsetConnection('shops', () => ShopDTO, {
  enableTotalCount: true,
  relationName: 'shops',
})
@Authorize(CriticalSectionsAuthorizer)
export class ShopCategoryDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField(() => String, { nullable: false })
  name!: string;
  @FilterableField(() => ID, { nullable: false })
  displayPriority!: number;
  @FilterableField(() => ShopCategoryStatus)
  status!: ShopCategoryStatus;
}
