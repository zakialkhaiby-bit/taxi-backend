import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { PersonalInfoDTO } from '../../core/fragments/personal-info.dto';
import { ShopStatus, PhoneNumberDTO } from '@ridy/database';
import { Point } from '@ridy/database';
import { WeekdayScheduleDTO } from '@ridy/database';

@InputType()
export class UpsertShopInput {
  @Field(() => String, { nullable: true })
  name?: string;
  @Field(() => ShopStatus, { nullable: true })
  status?: ShopStatus;
  @Field(() => PhoneNumberDTO, { nullable: true })
  mobileNumber?: PhoneNumberDTO;
  @Field(() => PersonalInfoDTO, { nullable: true })
  ownerInformation?: PersonalInfoDTO;
  @Field(() => String, { nullable: true })
  email?: string;
  @Field(() => String, { nullable: true })
  address?: string;
  @Field(() => String, { nullable: true })
  password?: string;
  @Field(() => [WeekdayScheduleDTO], { nullable: true })
  weeklySchedule?: WeekdayScheduleDTO[];
  @Field(() => Boolean, { nullable: true })
  isExpressDeliveryAvailable?: boolean;
  @Field(() => Boolean, { nullable: true })
  isShopDeliveryAvailable?: boolean;
  @Field(() => Int, {
    nullable: true,
    description:
      'The percentage of the delivery fee that shop pays so the delivery fee would be more appealing to the users.',
  })
  expressDeliveryShopCommission?: number;
  @Field(() => Boolean, { nullable: true })
  isOnlinePaymentAvailable?: boolean;
  @Field(() => Boolean, { nullable: true })
  isCashOnDeliveryAvailable?: boolean;
  @Field(() => String, { nullable: true })
  description?: string;
  @Field(() => Point, { nullable: true })
  location?: Point;
  @Field(() => ID, { nullable: true, description: 'Image ID' })
  imageId?: number;
}
