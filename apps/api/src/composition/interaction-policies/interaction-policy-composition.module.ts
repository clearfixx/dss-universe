/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Policy Composition
 * 📄 File: apps/api/src/composition/interaction-policies/interaction-policy-composition.module.ts
 *
 * 🎯 Purpose:
 * Assembles owner decision contracts without foreign feature service or repository injection.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { InteractionsModule } from '@api/modules/interactions';
import { NewsModule } from '@api/modules/news';
import { UsersModule } from '@api/modules/users';
import { InteractionOwnerBindingsService } from './interaction-owner-bindings.service';

@Module({
  imports: [InteractionsModule, NewsModule, UsersModule],
  providers: [InteractionOwnerBindingsService],
})
export class InteractionPolicyCompositionModule {}
