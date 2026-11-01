import 'katex/dist/katex.min.css';
import './styles/theme.css';
import './styles/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { RepositoryProvider } from './hooks/RepositoryContext';
import { requestPersistentStorage } from './lib/db';
import { createIndexedDbRepository } from './lib/repository';

const repository = createIndexedDbRepository();
void requestPersistentStorage();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element.');

createRoot(root).render(
  <StrictMode>
    <RepositoryProvider repository={repository}>
      <App />
    </RepositoryProvider>
  </StrictMode>,
);
