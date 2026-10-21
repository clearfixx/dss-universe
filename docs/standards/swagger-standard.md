# DSS Swagger Standard 📘

## Purpose

Swagger is the official interactive API documentation for DSS Universe.

Every public HTTP endpoint must be documented clearly enough for a developer to understand:

- what the endpoint does;
- whether authentication is required;
- what request body/query/params it accepts;
- what response it returns;
- what errors may happen.

Swagger is part of the DSS Definition of Done.

An endpoint is not considered complete if it works but is not documented.

---

## Location

Swagger configuration lives in:

```txt
apps/api/src/core/swagger/swagger.config.ts

Swagger UI is available at:

/api/docs

For local development:

http://localhost:4000/api/docs
Core Rules

Every controller must use:

@ApiTags('Module Name')

Every protected controller or protected endpoint must use:

@ApiBearerAuth('access-token')

Every endpoint must use:

@ApiOperation(...)

Every endpoint should use response decorators:

@ApiOkResponse(...)
@ApiCreatedResponse(...)
@ApiBadRequestResponse(...)
@ApiUnauthorizedResponse(...)
@ApiForbiddenResponse(...)
@ApiNotFoundResponse(...)

Every DTO exposed through Swagger must use:

@ApiProperty(...)

or, for optional fields:

@ApiPropertyOptional(...)
Tags

Use human-readable feature tags.

Approved examples:

Authentication
Users
Media
Authorization
Forum
News
CMS
Admin

Do not use technical folder names as Swagger tags.

Bad:

auth-controller
users-module
media.presentation

Good:

Authentication
Users
Media
Authentication

The DSS API uses JWT Bearer authentication in Swagger.

The shared auth name is:

access-token

Protected endpoints must use:

@ApiBearerAuth('access-token')

Example:

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {}

If only one method is protected, place @ApiBearerAuth('access-token') on that method instead of the whole controller.

Endpoint Documentation

Every endpoint must include a clear operation summary.

Example:

@ApiOperation({
  summary: 'Get the current authenticated user',
})

Avoid vague summaries.

Bad:

Get user
Handle request
Upload

Good:

Get the current authenticated user
Upload a media file
Update the current user's avatar
DTO Documentation

Every request DTO must expose Swagger metadata.

Example:

export class LoginRequestDto {
  @ApiProperty({
    example: 'admin@dss.local',
    description: 'User email address.',
  })
  email!: string;

  @ApiProperty({
    example: 'Admin123!',
    description: 'User password.',
  })
  password!: string;
}

Optional fields must use:

@ApiPropertyOptional(...)

Do not document private/internal fields in public DTOs.

Response Documentation

Use the most specific response decorator available.

Examples:

@ApiOkResponse({
  description: 'User profile returned successfully.',
})
@ApiCreatedResponse({
  description: 'Resource created successfully.',
})
@ApiUnauthorizedResponse({
  description: 'Authentication is required.',
})
@ApiForbiddenResponse({
  description: 'The user does not have enough permissions.',
})
@ApiNotFoundResponse({
  description: 'Requested resource was not found.',
})
Upload Endpoints

Upload endpoints must document multipart form data.

Use:

@ApiConsumes('multipart/form-data')

Upload request DTOs must document file fields clearly.

Example field name:

file

For media uploads, document at minimum:

accepted MIME types;
max file size;
authentication requirement;
returned media identifier or URL.
Pagination

Paginated endpoints must document:

page;
limit;
sorting;
filters;
returned metadata.

Pagination should use shared DTOs once they exist.

Required response metadata:

page
limit
total
totalPages
hasNextPage
hasPreviousPage
Error Documentation

Common error responses must be documented where relevant.

Typical API errors:

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error

Do not hide expected errors from Swagger.

If a feature has domain-specific errors, document them in that module's README as well.

Definition of Done

An API endpoint is complete only when:

implementation works;
validation works;
authorization rules are correct;
Swagger decorators are present;
request DTOs are documented;
expected responses are documented;
module README is updated if the endpoint changes module behavior.

Working code without Swagger documentation is not finished.

Architecture Rule

Swagger belongs to API presentation and documentation.

Swagger must not drive domain logic.

Controllers and DTOs may use Swagger decorators.

Domain entities, repositories, and core business rules must not depend on Swagger.

Maintenance

When an endpoint changes, update Swagger in the same commit.

Do not postpone Swagger updates.

If Swagger becomes outdated, it becomes technical debt.
```
