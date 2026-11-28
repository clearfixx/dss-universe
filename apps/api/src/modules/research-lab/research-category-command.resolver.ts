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
  Resolver,
} from '@nestjs/graphql';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ResearchLabCommandError } from './domain/errors/research-lab-command.error';
import { ResearchCategoryService } from './infrastructure/research-category.service';
import { ResearchCategoryEntry } from './research-lab-read.resolver';

@InputType()
class ResearchCreateCategoryInput {
  @Field() @IsString() name!: string;
  @Field() @IsString() slug!: string;
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

@InputType()
class ResearchUpdateCategoryInput {
  @Field(() => ID) @IsString() id!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() parentId?:
    | string
    | null;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class ResearchCategoryCommandResolver {
  constructor(private readonly categories: ResearchCategoryService) {}

  private async execute<T>(operation: Promise<T>) {
    try {
      return await operation;
    } catch (error) {
      if (!(error instanceof ResearchLabCommandError)) throw error;
      switch (error.code) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_STATE':
          throw new BadRequestException(error.message);
        default:
          throw new ConflictException(error.message);
      }
    }
  }

  @Mutation(() => ResearchCategoryEntry)
  createResearchCategory(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchCreateCategoryInput,
  ) {
    return this.execute(this.categories.create(actor.id, input));
  }

  @Mutation(() => ResearchCategoryEntry)
  updateResearchCategory(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchUpdateCategoryInput,
  ) {
    return this.execute(this.categories.update(actor.id, input));
  }
}
