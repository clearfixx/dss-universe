/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 👤 Module: Users Presentation Tests
 * 📄 File: apps/api/src/modules/users/presentation/graphql/resolvers/users-orm-boundary.spec.ts
 *
 * 🎯 Purpose:
 * Keeps member directory filtering independent from Prisma representation.
 *
 * 🏗️ Architecture:
 * Source regression; migrated read/HTTP suites separately verify query semantics.
 *
 * ⚠️ Important:
 * ACTIVE remains a directory query filter, not a new authorization decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createSourceFile,
  forEachChild,
  isCallExpression,
  isImportDeclaration,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  ScriptTarget,
  type Node,
} from 'typescript';

describe('Users presentation ORM boundary', () => {
  it('retains the ACTIVE filter without importing persistence representation', () => {
    const source = createSourceFile(
      'users.resolver.ts',
      readFileSync(join(__dirname, 'users.resolver.ts'), 'utf8'),
      ScriptTarget.Latest,
    );
    for (const declaration of source.statements.filter(isImportDeclaration)) {
      expect(declaration.moduleSpecifier.getText(source)).not.toContain(
        '@prisma/',
      );
    }
    const statuses: string[] = [];
    const visit = (node: Node): void => {
      if (
        isCallExpression(node) &&
        node.expression.getText(source) === 'this.usersService.list'
      ) {
        const argument = node.arguments[0];
        if (argument && isObjectLiteralExpression(argument)) {
          for (const property of argument.properties) {
            if (
              isPropertyAssignment(property) &&
              property.name.getText(source) === 'status' &&
              isStringLiteral(property.initializer)
            )
              statuses.push(property.initializer.text);
          }
        }
      }
      forEachChild(node, visit);
    };
    visit(source);
    expect(statuses).toEqual(['ACTIVE']);
  });
});
