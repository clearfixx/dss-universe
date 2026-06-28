import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      app: 'DSS Universe API',
      status: 'ok',
    };
  }

  // @Get('auth-test')
  // @Authenticated()
  // authTest(@AuthUser() user: AuthenticatedUser) {
  //   return {
  //     ok: true,
  //     user,
  //   };
  // }

  // @Get('admin-test')
  // @Authenticated(UserRole.ADMIN)
  // adminTest(@AuthUser() user: AuthenticatedUser) {
  //   return {
  //     ok: true,
  //     message: 'Admin access granted',
  //     user,
  //   };
  // }
}
