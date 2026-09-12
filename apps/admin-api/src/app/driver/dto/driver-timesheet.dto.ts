import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('DriverTimesheet')
export class DriverTimesheetDTO {
  @Field(() => ID)
  id: number;

  @Field(() => GraphQLISODateTime)
  date: Date;

  @Field(() => [DriverTimesheetTimeRangeDTO])
  timeRanges: DriverTimesheetTimeRangeDTO[];
}

@ObjectType('DriverTimesheetTimeRange')
export class DriverTimesheetTimeRangeDTO {
  @Field(() => GraphQLISODateTime)
  startTime: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  endTime?: Date;
}
