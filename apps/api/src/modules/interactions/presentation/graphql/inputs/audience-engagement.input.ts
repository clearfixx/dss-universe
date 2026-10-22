/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/inputs/audience-engagement.input.ts
 * 🎯 Purpose: Defines validated GraphQL engagement command inputs.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';
import { ShareChannelModel } from '../models/share-channel.model';

@InputType()
export class RecordViewInput {
  @Field(() => ID) @IsUUID() interactionTargetId!: string;
  @Field() @IsUUID() visitorId!: string;
}

@InputType()
export class RecordShareInput extends RecordViewInput {
  @Field(() => ShareChannelModel)
  @IsEnum(ShareChannelModel)
  channel!: ShareChannelModel;
}
