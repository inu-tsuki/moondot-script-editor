import type { AdaptationPreferences } from './types';

export const defaultAdaptationPreferences: AdaptationPreferences = {
  targetMedium: 'short_drama',
  targetLength: 'short_drama_3_min',
  fidelity: 'core_rewrite',
  pacing: 'balanced',
  style: 'realist',
  allowCharacterMerge: false,
  allowSubplotCompression: true,
  allowTimelineReorder: true,
  source: 'system_default',
};

export const resolveAdaptationPreferences = (
  preferences: Partial<AdaptationPreferences> = {},
): AdaptationPreferences => {
  const hasUserOverrides = Object.keys(preferences).some((key) => key !== 'source');

  return {
    ...defaultAdaptationPreferences,
    ...preferences,
    source: preferences.source ?? (hasUserOverrides ? 'user' : defaultAdaptationPreferences.source),
  };
};
