/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/content-presentation.module.ts
 *
 * 🎯 Purpose:
 * Registers content transport exactly once through published owner capabilities.
 *
 * 🏗️ Architecture:
 * Root transport composition; policy and persistence remain with owners.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { ContentAccessModule } from '@api/modules/content-access';
import { EditorModule } from '@api/modules/editor';
import { ContentGatesResolver } from './presentation/graphql/content-gate.resolver';
import { EditorResolver } from './presentation/graphql/editor.resolver';
@Module({
  imports: [ContentAccessModule, EditorModule],
  providers: [ContentGatesResolver, EditorResolver],
})
export class ContentPresentationModule {}
