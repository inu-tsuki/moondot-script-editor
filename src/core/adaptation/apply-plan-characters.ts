import type { CharacterId, CharacterProfile, ScreenplayDocument } from '../screenplay';
import type { AdaptationPlan } from './types';

const normalizeCharacter = (character: CharacterProfile): CharacterProfile => ({
  ...character,
  aliases: character.aliases ?? [],
  description: character.description?.trim() || undefined,
  tags: character.tags?.filter(Boolean),
});

/**
 * Applies the Architect-owned character roster to the working document.
 *
 * The Architect roster is authoritative for the current adaptation run.  The
 * existing script may briefly reference stale characters until the Writer draft
 * is applied, but keeping old demo ids in the Writer prompt would let the model
 * keep writing with the wrong cast.
 */
export const applyPlanCharacters = (
  document: ScreenplayDocument,
  plan: AdaptationPlan,
): ScreenplayDocument => {
  if (!plan.characters.length) return document;

  const nextCharacters = new Map<CharacterId, CharacterProfile>();
  for (const character of plan.characters) {
    nextCharacters.set(character.id, normalizeCharacter(character));
  }

  return {
    ...document,
    characters: [...nextCharacters.values()],
  };
};
