import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';

@InputType('DriverTimesheetFilterInput')
export class DriverTimesheetFilterInput {
  @Field(() => ID, { nullable: false })
  driverId!: number;
  @Field(() => GraphQLISODateTime, { nullable: false })
  startDate!: Date;
  @Field(() => GraphQLISODateTime, { nullable: false })
  endDate!: Date;
}
