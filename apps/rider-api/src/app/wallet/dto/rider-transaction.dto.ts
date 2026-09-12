import {
  Field,
  ID,
  ObjectType,
  Float,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { RiderDeductTransactionType } from '@ridy/database';
import { RiderRechargeTransactionType } from '@ridy/database';
import { TransactionAction } from '@ridy/database';

@ObjectType('RiderTransacion')
export class RiderTransactionDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
  @Field(() => TransactionAction, { nullable: false })
  action!: TransactionAction;
  @Field(() => RiderDeductTransactionType, { nullable: true })
  deductType?: RiderDeductTransactionType;
  @Field(() => RiderRechargeTransactionType, { nullable: true })
  rechargeType?: RiderRechargeTransactionType;
  @Field(() => Float, { nullable: false })
  amount!: number;
  @Field(() => String, { nullable: false })
  currency!: string;
  @Field(() => String, { nullable: true })
  referenceNumber?: string;
}
