import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Gender } from '@ridy/database';

@InputType()
export class DocumentPairInput {
  @Field(() => ID)
  documentId!: number;

  @Field(() => ID)
  mediaId!: number;
}

@InputType()
export class CompleteRegistrationInput {
  @Field(() => String)
  firstName!: string;
  @Field(() => String)
  lastName!: string;
  @Field(() => String, { nullable: true })
  certificateNumber?: string;
  @Field(() => String, { nullable: true })
  email?: string;
  @Field(() => Int, { nullable: true })
  carProductionYear?: number;
  @Field(() => String, { nullable: true })
  carPlate?: string;
  @Field(() => ID)
  profilePictureId!: number;
  @Field(() => Gender)
  gender!: Gender;
  @Field(() => String, { nullable: true })
  address?: string;
  @Field(() => ID, { nullable: true })
  carId?: number;
  @Field(() => ID, { nullable: true })
  carColorId?: number;
  @Field(() => [DocumentPairInput])
  documentPairs!: DocumentPairInput[];
  @Field(() => [ID], { nullable: true })
  legacyDocumentIds?: number[];
}
