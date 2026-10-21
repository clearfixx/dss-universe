/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL Tests
 * 📄 File: apps/api/src/core/graphql/query-depth.spec.ts
 *
 * 🎯 Purpose:
 * Verifies that the configured GraphQL depth policy rejects nested queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { buildSchema, parse, validate } from 'graphql';
import depthLimit from 'graphql-depth-limit';

describe('GraphQL query depth policy', () => {
  it('rejects operations deeper than ten levels', () => {
    const schema = buildSchema(`
      type Query { node: Node }
      type Node { child: Node, value: String }
    `);
    const document = parse(`{
      node { child { child { child { child { child { child { child {
        child { child { child { value } } }
      } } } } } } } }
    }`);

    // graphql-depth-limit does not publish strict ESLint-compatible types.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const errors = validate(schema, document, [depthLimit(10)]);

    expect(errors).toHaveLength(1);
  });
});
