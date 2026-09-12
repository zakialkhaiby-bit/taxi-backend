import {
  Field,
  ID,
  Int,
  ObjectType,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import {
  Authorize,
  FilterableField,
  FilterableUnPagedRelation,
  IDField,
  OffsetConnection,
  Relation,
  UnPagedRelation,
} from '@ptc-org/nestjs-query-graphql';
import { MediaDTO } from '../../upload/media.dto';
import { Point, PhoneNumberDTO } from '@ridy/database';
import { ShopItemPresetDTO } from './shop-item-preset.dto';
import { ShopCategoryDTO } from './shop-category.dto';
import { ShopSessionDTO } from './shop-session.dto';
import { ShopWalletDTO } from './shop-wallet.dto';
import { ShopOrderCartDTO } from './shop-order-cart.dto';
import { OrderQueueLevel } from '@ridy/database';
import { ShopStatus } from '@ridy/database';
import { PersonalInfoDTO } from '../../core/fragments/personal-info.dto';
import { WeekdayScheduleDTO } from '@ridy/database';
import { RatingAggregateDTO } from '../../core/fragments/rating-aggregate.dto';
import { ShopAuthorizer } from '../../core/authorizers/shop.authorizer';
import { ItemCategoryDTO } from './item-category.dto';

@ObjectType('Shop')
@Relation('image', () => MediaDTO, { nullable: true })
@Relation('headerSmall', () => MediaDTO, { nullable: true })
@Relation('headerLarge', () => MediaDTO, { nullable: true })
@UnPagedRelation('productCategories', () => ItemCategoryDTO)
@FilterableUnPagedRelation('itemPresets', () => ShopItemPresetDTO)
@FilterableUnPagedRelation('categories', () => ShopCategoryDTO, {
  update: { enabled: true },
})
@UnPagedRelation('sessions', () => ShopSessionDTO)
@UnPagedRelation('wallet', () => ShopWalletDTO)
@OffsetConnection('carts', () => ShopOrderCartDTO, {
  enableAggregate: true,
  enableTotalCount: true,
})
@Authorize(ShopAuthorizer)
export class ShopDTO {
  @IDField(() => ID)
  id!: number;
  @FilterableField()
  name!: string;
  @FilterableField(() => ShopStatus)
  status: ShopStatus;
  @FilterableField(() => Int, { nullable: true })
  recommendedScore?: number;
  @Field(() => PhoneNumberDTO)
  mobileNumber: PhoneNumberDTO;
  @Field(() => PersonalInfoDTO)
  ownerInformation!: PersonalInfoDTO;
  @Field(() => String, { nullable: true })
  email?: string;
  @Field(() => String, { nullable: true })
  address?: string;
  @Field(() => String, { nullable: true })
  password?: string;
  @Field(() => GraphQLISODateTime, { nullable: false })
  createdAt!: Date;
  @Field(() => [WeekdayScheduleDTO])
  weeklySchedule: WeekdayScheduleDTO[];
  @Field(() => OrderQueueLevel, { nullable: false })
  orderQueueLevel!: OrderQueueLevel;
  @Field(() => Boolean, { nullable: false })
  isExpressDeliveryAvailable!: boolean;
  @Field(() => Boolean, { nullable: false })
  isShopDeliveryAvailable!: boolean;
  @Field(() => Int, {
    description:
      'The percentage of the delivery fee that shop pays so the delivery fee would be more appealing to the users.',
  })
  expressDeliveryShopCommission!: number;
  @Field(() => Boolean, { nullable: false })
  isOnlinePaymentAvailable!: boolean;
  @Field(() => Boolean, { nullable: false })
  isCashOnDeliveryAvailable!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastActivityAt?: Date;
  @Field(() => String, { nullable: true })
  description?: string;
  @Field(() => Point, { nullable: true })
  location?: Point;
  @Field(() => String, { nullable: false })
  currency!: string;
  @FilterableField(() => RatingAggregateDTO, { nullable: true })
  ratingAggregate?: RatingAggregateDTO;
  @FilterableField(() => Int, { nullable: false })
  displayPriority!: number;
}
