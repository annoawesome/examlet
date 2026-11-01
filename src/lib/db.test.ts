import { describe, expect, it, vi } from 'vitest';

import { uniqueDbName } from '../test/fixtures';
import { DB_VERSION, openDatabase, requestToPromise } from './db';

describe('openDatabase', () => {
  it('steps aside when a newer version of the app upgrades the schema', async () => {
    const name = uniqueDbName();
    const onVersionChange = vi.fn();
    await openDatabase(name, onVersionChange);

    // Without the old connection closing, this open would stay blocked.
    const newer = await requestToPromise(indexedDB.open(name, DB_VERSION + 1));

    expect(newer.version).toBe(DB_VERSION + 1);
    expect(onVersionChange).toHaveBeenCalledOnce();
    newer.close();
  });
});
