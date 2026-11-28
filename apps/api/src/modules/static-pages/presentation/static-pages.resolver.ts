/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/src/modules/static-pages/presentation/static-pages.resolver.ts
 *
 * 🎯 Purpose:
 * GraphQL of static pages: administration and the public read.
 *
 * ⚠️ Important:
 * `staticPage` and `publishedStaticPages` are public on purpose and return
 * published snapshots only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { StaticPageError } from '../domain/static-page.rules';
import { StaticPagesService } from '../infrastructure/prisma-static-pages';

@InputType()
class StaticPageInput {
  @Field() @IsString() @MaxLength(120) slug!: string;
  @Field() @IsString() @MaxLength(300) title!: string;
  @Field() @IsString() @MaxLength(600) description!: string;
  @Field() @IsString() @MaxLength(2_000_000) documentJson!: string;
}

@ObjectType('AdminStaticPage')
class AdminStaticPageModel {
  @Field(() => ID) id!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field() documentJson!: string;
  @Field(() => Int) revision!: number;
  @Field(() => Date, { nullable: true }) publishedAt!: Date | null;
  @Field() hasUnpublishedChanges!: boolean;
  @Field() updatedAt!: Date;
}

@ObjectType('StaticPage', { description: 'A published static page.' })
class StaticPageModel {
  @Field() slug!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field() documentJson!: string;
  @Field() publishedAt!: Date;
}

@ObjectType('StaticPageAddress')
class StaticPageAddressModel {
  @Field() slug!: string;
  @Field() publishedAt!: Date;
}

@Resolver()
export class StaticPagesResolver {
  constructor(private readonly pages: StaticPagesService) {}

  @Query(() => StaticPageModel, { nullable: true })
  staticPage(@Args('slug') slug: string) {
    return this.pages.published(slug);
  }

  @Query(() => [StaticPageAddressModel])
  publishedStaticPages() {
    return this.pages.publishedIndex();
  }

  @Query(() => [AdminStaticPageModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CmsPagesManage)
  adminStaticPages(@AuthUser() actor: AuthenticatedUser) {
    return this.execute(this.pages.list(actor));
  }

  @Query(() => AdminStaticPageModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CmsPagesManage)
  adminStaticPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.execute(this.pages.get(actor, id));
  }

  @Mutation(() => AdminStaticPageModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CmsPagesManage)
  createStaticPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: StaticPageInput,
  ) {
    return this.execute(this.pages.create(actor, { ...input }));
  }

  @Mutation(() => AdminStaticPageModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CmsPagesManage)
  saveStaticPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('expectedRevision', { type: () => Int }) expectedRevision: number,
    @Args('input') input: StaticPageInput,
  ) {
    return this.execute(
      this.pages.save(actor, id, expectedRevision, { ...input }),
    );
  }

  @Mutation(() => AdminStaticPageModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CmsPagesManage)
  publishStaticPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('expectedRevision', { type: () => Int }) expectedRevision: number,
  ) {
    return this.execute(this.pages.publish(actor, id, expectedRevision));
  }

  @Mutation(() => AdminStaticPageModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CmsPagesManage)
  unpublishStaticPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.execute(this.pages.unpublish(actor, id));
  }

  private async execute<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (!(error instanceof StaticPageError)) throw error;
      switch (error.code) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_INPUT':
          throw new BadRequestException(error.message);
        case 'CONFLICT':
          throw new ConflictException(error.message);
      }
    }
  }
}
