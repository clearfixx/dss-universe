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
  Mutation,
  ObjectType,
  Resolver,
} from '@nestjs/graphql';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ResearchLabCommandError } from './domain/errors/research-lab-command.error';
import { ResearchContainerService } from './infrastructure/research-container.service';

@ObjectType()
class ResearchContainerReceipt {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
}

@InputType()
class ResearchCreateContainerInput {
  @Field() @IsString() language!: string;
  @Field() @IsString() slug!: string;
  @Field() @IsString() title!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
  @Field(() => [ID]) @IsArray() @IsString({ each: true }) pageIds!: string[];
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class ResearchContainerCommandResolver {
  constructor(private readonly containers: ResearchContainerService) {}

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

  @Mutation(() => ResearchContainerReceipt)
  async createResearchManual(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchCreateContainerInput,
  ) {
    return this.execute(this.containers.createManual(actor.id, input));
  }

  @Mutation(() => ResearchContainerReceipt)
  async createResearchCollection(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchCreateContainerInput,
  ) {
    return this.execute(this.containers.createCollection(actor.id, input));
  }
}
