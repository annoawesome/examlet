import { beforeEach, describe, expect, it } from 'vitest';

import { makeCards, uniqueDbName } from '../test/fixtures';
import { createIndexedDbRepository, type StudysheetRepository } from './repository';
import type { Studysheet } from './types';

function sheet(id: string, updatedAt: number): Studysheet {
  return { id, title: `Sheet ${id}`, description: '', createdAt: 0, updatedAt };
}

describe('IndexedDB repository', () => {
  let repo: StudysheetRepository;

  beforeEach(() => {
    repo = createIndexedDbRepository(uniqueDbName());
  });

  it('saves and loads a sheet with ordered cards', async () => {
    const cards = makeCards(3, 's1').reverse();
    await repo.save(sheet('s1', 1), cards);

    const loaded = await repo.get('s1');

    expect(loaded?.sheet.title).toBe('Sheet s1');
    expect(loaded?.cards.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it('returns undefined for unknown sheets', async () => {
    expect(await repo.get('missing')).toBeUndefined();
  });

  it('replaces cards on save instead of accumulating them', async () => {
    await repo.save(sheet('s1', 1), makeCards(5, 's1'));
    await repo.save(sheet('s1', 2), makeCards(2, 's1'));

    expect((await repo.get('s1'))?.cards).toHaveLength(2);
  });

  it('lists summaries with card counts, most recently updated first', async () => {
    await repo.save(sheet('old', 1), makeCards(1, 'old').map((c) => ({ ...c, id: `old-${c.id}` })));
    await repo.save(sheet('new', 2), makeCards(3, 'new').map((c) => ({ ...c, id: `new-${c.id}` })));

    const summaries = await repo.listSummaries();

    expect(summaries.map((s) => [s.id, s.cardCount])).toEqual([
      ['new', 3],
      ['old', 1],
    ]);
  });

  it('deletes a sheet and only its cards', async () => {
    await repo.save(sheet('a', 1), makeCards(2, 'a').map((c) => ({ ...c, id: `a-${c.id}` })));
    await repo.save(sheet('b', 1), makeCards(2, 'b').map((c) => ({ ...c, id: `b-${c.id}` })));

    await repo.delete('a');

    expect(await repo.get('a')).toBeUndefined();
    expect((await repo.get('b'))?.cards).toHaveLength(2);
  });

  it('stores large definitions', async () => {
    const huge = 'x'.repeat(200_000);
    await repo.save(sheet('s1', 1), [{ ...makeCards(1, 's1')[0]!, definition: huge }]);

    expect((await repo.get('s1'))?.cards[0]?.definition).toHaveLength(200_000);
  });
});
