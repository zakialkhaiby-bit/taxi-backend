import {
  Field,
  Float,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { DispatchStrategy } from '@ridy/database';

registerEnumType(DispatchStrategy, {
  name: 'DispatchStrategy',
});

@ObjectType('BroadcastConfig')
@InputType('BroadcastConfigInput')
export class BroadcastConfigDTO {
  @Field(() => Int, {
    description: 'Number of drivers to notify in each wave',
  })
  waveSize: number;
  @Field(() => Int, {
    description: 'Interval in seconds between notification waves',
  })
  waveIntervalSeconds: number;

  @Field(() => Int, {
    description: 'Maximum number of waves to send',
  })
  maxWaves: number;

  @Field(() => Int, {
    description: 'Incremental radius in meters for each wave',
    nullable: true,
  })
  radiusIncrementMeters?: number;
}

@ObjectType('SequentialConfig')
@InputType('SequentialConfigInput')
export class SequentialConfigDTO {
  @Field(() => Int, {
    description: 'Cooldown in seconds before trying next driver',
  })
  perDriverTimeoutSeconds!: number;

  @Field(() => Boolean, {
    description: 'Avoid notifying previously rejected drivers',
  })
  avoidPreviousCandidates!: boolean;

  @Field(() => Int, {
    description: 'Maximum number of times to retry dispatching to a driver',
    nullable: true,
  })
  driverRetryLimit?: number;

  @Field(() => Int, {
    description: 'Maximum number of drivers to test',
    nullable: true,
  })
  maxDriversToTest?: number;
}

@ObjectType('DriverScoringConfig')
@InputType('DriverScoringConfigInput')
export class DriverScoringConfigDTO {
  @Field(() => Float, { description: 'Weight for distance in driver scoring' })
  distanceWeight: number;

  @Field(() => Float, {
    description: 'Weight for driver rating in driver scoring',
  })
  driverRatingWeight: number;

  @Field(() => Float, { description: 'Weight for idle time in driver scoring' })
  idleTimeWeight: number;

  @Field(() => Float, {
    description: 'Weight for cancel rate in driver scoring',
  })
  cancelRateWeight: number;

  @Field(() => Float, {
    description: 'The minimum driver rating for a successful dispatch',
    nullable: true,
  })
  threshold?: number;

  @Field(() => Int, {
    description: 'The number of top drivers to consider for dispatch',
    nullable: true,
  })
  topN?: number;
}

@ObjectType('RadiusExpansionConfig')
@InputType('RadiusExpansionConfigInput')
export class RadiusExpansionConfigDTO {
  @Field(() => Boolean, { description: 'Enable radius expansion for dispatch' })
  enabled: boolean;

  @Field(() => Int, {
    description: 'Step size in meters for radius expansion',
  })
  stepMeters: number;

  @Field(() => Int, {
    description: 'Maximum number of steps for radius expansion',
  })
  maxSteps: number;

  @Field(() => Int, {
    description: 'Interval in seconds between radius expansion steps',
  })
  intervalSeconds: number;
}

@ObjectType('FallbackConfig')
@InputType('FallbackConfigInput')
export class FallbackConfigDTO {
  @Field(() => Boolean, { description: 'Enable fallback dispatch strategy' })
  fallbackEnabled: boolean;

  @Field(() => DispatchStrategy, {
    description: 'Fallback dispatch strategy to use',
  })
  fallbackStrategy: DispatchStrategy;

  @Field(() => DriverScoringConfigDTO, {
    description: 'Scoring configuration for fallback dispatch',
    nullable: true,
  })
  fallbackScoring?: DriverScoringConfigDTO;
}

@ObjectType('DispatchConfig')
@InputType('DispatchConfigInput')
export class DispatchConfigDTO {
  @Field(() => DispatchStrategy, {
    description: 'The dispatch strategy to use',
  })
  strategy: DispatchStrategy;

  @Field(() => Int, {
    description: 'Request timeout in seconds for dispatch',
  })
  requestTimeoutSeconds: number;

  @Field(() => Int, {
    description: 'Maximum search radius in meters',
  })
  maxSearchRadiusMeters: number;

  @Field(() => DriverScoringConfigDTO, {
    description: 'Driver scoring configuration for dispatch',
    nullable: true,
  })
  scoring?: DriverScoringConfigDTO;

  @Field(() => RadiusExpansionConfigDTO, {
    description: 'Radius expansion configuration for dispatch',
    nullable: true,
  })
  radiusExpansion?: RadiusExpansionConfigDTO;

  @Field(() => FallbackConfigDTO, {
    description: 'Fallback configuration for dispatch',
    nullable: true,
  })
  fallback?: FallbackConfigDTO;

  @Field(() => Boolean, {
    description: 'Enable admin notifications on dispatch failure',
    nullable: true,
  })
  notifyAdminOnFailure?: boolean;

  @Field(() => BroadcastConfigDTO, {
    nullable: true,
    description: 'Broadcast-specific configuration',
  })
  broadcastConfig?: BroadcastConfigDTO;

  @Field(() => SequentialConfigDTO, {
    nullable: true,
    description: 'Sequential-specific configuration',
  })
  sequentialConfig?: SequentialConfigDTO;
}
