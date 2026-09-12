import { Field, InputType, registerEnumType } from '@nestjs/graphql';

enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Sort order',
});

@InputType()
export class TaxiOrderSortInput {
  @Field(() => SortOrder, { nullable: true })
  id?: SortOrder;
}
