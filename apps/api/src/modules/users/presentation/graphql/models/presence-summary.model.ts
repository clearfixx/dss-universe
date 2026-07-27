/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/presence-summary.model.ts
 *
 * 🎯 Purpose:
 * Exposes privacy-safe aggregate online metrics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PresenceSummary')
export class PresenceSummaryModel {
  @Field(() => Int)
  onlineMembers!: number;

  @Field(() => Int)
  onlineGuests!: number;

  @Field(() => Int)
  onlineCrawlers!: number;

  @Field(() => Int)
  totalOnline!: number;

  @Field(() => GraphQLISODateTime)
  sampledAt!: Date;
}

/**
 * A headcount is useful. A guest surveillance dossier is not.
 */
