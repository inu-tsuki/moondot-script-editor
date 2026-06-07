import { describe, expect, it } from 'vitest';
import {
  applyPlanCharacters,
  createMockAdaptationPlan,
  type AdaptationPlan,
} from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { CharacterProfile } from '../../../src/core/screenplay';

const doc = demoScreenplayDocument;
const novelSource = doc.source as Extract<typeof doc.source, { type: 'novel' }>;

const makePlanWithCharacters = (characters: CharacterProfile[]): AdaptationPlan => ({
  ...createMockAdaptationPlan(doc, novelSource, {}),
  characters,
});

describe('applyPlanCharacters', () => {
  it('uses Architect characters as the authoritative roster', () => {
    const characters: CharacterProfile[] = [
      {
        id: 'char_rick',
        name: '里克',
        aliases: ['德卡德'],
        description: '赏金猎人。',
        tags: ['protagonist'],
      },
      {
        id: 'char_iran',
        name: '伊兰',
        aliases: [],
      },
    ];

    const result = applyPlanCharacters(doc, makePlanWithCharacters(characters));

    expect(result.characters).toEqual(characters);
    expect(result.characters.some((character) => character.id === 'char_zhangsan')).toBe(false);
    expect(result.project).toEqual(doc.project);
    expect(result.source).toEqual(doc.source);
    expect(result.script).toEqual(doc.script);
  });

  it('keeps the existing roster when Architect returns no characters', () => {
    const result = applyPlanCharacters(doc, makePlanWithCharacters([]));

    expect(result.characters).toEqual(doc.characters);
  });
});
