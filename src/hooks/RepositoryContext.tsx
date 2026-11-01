import { createContext, useContext, type ReactNode } from 'react';

import type { StudysheetRepository } from '../lib/repository';

const RepositoryContext = createContext<StudysheetRepository | null>(null);

/** Supplies storage to the tree, so tests can swap in an isolated database. */
export function RepositoryProvider({
  repository,
  children,
}: {
  repository: StudysheetRepository;
  children: ReactNode;
}) {
  return <RepositoryContext value={repository}>{children}</RepositoryContext>;
}

export function useRepository(): StudysheetRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <RepositoryProvider>.');
  return repository;
}
