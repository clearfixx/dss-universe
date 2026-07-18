/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query ApiInfo {\n  apiInfo {\n    name\n    status\n    transport\n  }\n}": typeof types.ApiInfoDocument,
    "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}": typeof types.LoginDocument,
    "query Viewer {\n  viewer {\n    id\n    username\n    displayName\n    email\n    avatarUrl\n    status\n    createdAt\n  }\n}": typeof types.ViewerDocument,
};
const documents: Documents = {
    "query ApiInfo {\n  apiInfo {\n    name\n    status\n    transport\n  }\n}": types.ApiInfoDocument,
    "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}": types.LoginDocument,
    "query Viewer {\n  viewer {\n    id\n    username\n    displayName\n    email\n    avatarUrl\n    status\n    createdAt\n  }\n}": types.ViewerDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query ApiInfo {\n  apiInfo {\n    name\n    status\n    transport\n  }\n}"): (typeof documents)["query ApiInfo {\n  apiInfo {\n    name\n    status\n    transport\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}"): (typeof documents)["mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    user {\n      id\n      username\n      displayName\n      email\n    }\n    tokens {\n      accessToken\n      refreshToken\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Viewer {\n  viewer {\n    id\n    username\n    displayName\n    email\n    avatarUrl\n    status\n    createdAt\n  }\n}"): (typeof documents)["query Viewer {\n  viewer {\n    id\n    username\n    displayName\n    email\n    avatarUrl\n    status\n    createdAt\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;