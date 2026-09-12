import { ID, ObjectType, Field, Float } from '@nestjs/graphql';
import { ServiceOptionIcon } from '@ridy/database';
import { ServiceOptionType } from '@ridy/database';

@ObjectType('ServiceOption')
export class ServiceOptionDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => String, { nullable: false })
  name!: string;
  @Field(() => String, { nullable: true })
  description?: string;
  @Field(() => ServiceOptionType, { nullable: false })
  type!: ServiceOptionType;
  @Field(() => Float, { nullable: true })
  additionalFee?: number;
  @Field(() => ServiceOptionIcon, { nullable: false })
  icon!: ServiceOptionIcon;
}
