import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import { RepositoryProvider } from '../hooks/RepositoryContext';
import { createIndexedDbRepository, type StudysheetRepository } from '../lib/repository';
import { uniqueDbName } from './fixtures';

/** A repository backed by a fresh, isolated IndexedDB database. */
export function createTestRepository(): StudysheetRepository {
  return createIndexedDbRepository(uniqueDbName());
}

export function renderWithRepository(ui: ReactElement, repository = createTestRepository()) {
  const result = render(<RepositoryProvider repository={repository}>{ui}</RepositoryProvider>);
  return { ...result, repository };
}
