
DSS Universe Backend Style
Backend principles
Authentication and Authorization are separate systems.
Auth answers: "Who is this user?"
Authorization answers: "What is this user allowed to do?"
Do not check roles directly in business logic.
Use permissions for access control.
Permissions philosophy

Role = badge / rank / container.
Permission = real action allowed by backend.

Bad:

if (user.role === "ADMIN") {
}

Good:

@RequirePermissions(Permission.UsersDelete)
NestJS module rules
Each feature module owns its controller and service.
Core modules provide reusable infrastructure.
Do not mix core/auth and core/authorization.
Import the module that owns the provider you need.
Prisma seed rules
One seed entry point.
One PrismaClient per seed process.
Child seed files receive PrismaClient as an argument.
No new PrismaClient() inside child seed files.
