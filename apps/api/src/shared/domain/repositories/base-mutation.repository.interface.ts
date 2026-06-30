/**
 * 📄 File: apps/api/src/shared/repositories/base-mutation.repository.interface.ts
 *
 * Base mutation repository contract.
 *
 * Mutation repositories change state.
 * Keep them separate from query repositories so reads and writes
 * do not turn into one giant swamp later. 🐊
 */

export interface BaseMutationRepository<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TId = string,
> {
  create(input: TCreateInput): Promise<TEntity>;

  update(id: TId, input: TUpdateInput): Promise<TEntity>;

  delete(id: TId): Promise<void>;
}
