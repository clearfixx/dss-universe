/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/access-groups.controller.ts
 *
 * 🎯 Purpose:
 * Translates protected REST transport into owned group commands; no DB access.
 *
 * 🧠 Responsibilities:
 * • applies authenticated, permission-protected route metadata;
 * • delegates validated transport to owned application commands;
 * • derives actor identity from the current authenticated principal.
 *
 * 🏗️ Architecture:
 * Thin IAM REST controller; no queries or authorization policy decisions.
 *
 * ⚠️ Important:
 * Runtime DTO class imports preserve Nest validation metadata.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { AccessGroupsService } from '../application/access-groups.service';
import { CreateAccessGroupDto } from './dto/create-access-group.dto';
import { UpdateAccessGroupDto } from './dto/update-access-group.dto';
import { SetAccessCapabilitiesDto } from './dto/set-access-capabilities.dto';
import { GrantAccessMembershipDto } from './dto/grant-access-membership.dto';
import { RevokeAccessMembershipDto } from './dto/revoke-access-membership.dto';
import { AccessGroupPageDto } from './dto/access-group-page.dto';
import { SubjectMembershipPageDto } from './dto/subject-membership-page.dto';
@Controller('iam/access-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.PermissionsManage)
export class AccessGroupsController {
  constructor(private readonly groups: AccessGroupsService) {}
  @Post() create(
    @AuthUser() actor: AuthenticatedUser,
    @Body() input: CreateAccessGroupDto,
  ) {
    return this.groups.create(actor.id, input);
  }
  @Get() list(
    @AuthUser() actor: AuthenticatedUser,
    @Query() page: AccessGroupPageDto,
  ) {
    return this.groups.list(actor.id, page.after, page.limit);
  }
  @Get('memberships') history(
    @AuthUser() actor: AuthenticatedUser,
    @Query() page: SubjectMembershipPageDto,
  ) {
    return this.groups.memberships(
      actor.id,
      { subjectId: page.subjectId },
      page.after,
      page.limit,
    );
  }
  @Post('memberships/:membershipId/revoke') revoke(
    @AuthUser() actor: AuthenticatedUser,
    @Param('membershipId', ParseUUIDPipe) id: string,
    @Body() input: RevokeAccessMembershipDto,
  ) {
    return this.groups.revoke(actor.id, id, input.reason);
  }
  @Get(':id/memberships') members(
    @AuthUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() page: AccessGroupPageDto,
  ) {
    return this.groups.memberships(
      actor.id,
      { groupId: id },
      page.after,
      page.limit,
    );
  }
  @Post(':id/memberships') grant(
    @AuthUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: GrantAccessMembershipDto,
  ) {
    return this.groups.grant(actor.id, {
      groupId: id,
      subjectId: input.subjectId,
      validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
    });
  }
  @Put(':id/capabilities') capabilities(
    @AuthUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SetAccessCapabilitiesDto,
  ) {
    return this.groups.setCapabilities(actor.id, id, input.capabilities);
  }
  @Patch(':id') update(
    @AuthUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAccessGroupDto,
  ) {
    return this.groups.update(actor.id, id, input);
  }
  @Get(':id') find(
    @AuthUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.groups.find(actor.id, id);
  }
}
