import { Field, fieldControlClassName } from '../ui';
import type {
  AdaptationFidelity,
  AdaptationPacing,
  AdaptationPreferences,
  AdaptationStyle,
  AdaptationTargetLength,
} from '../../core/adaptation';

type AdaptationPreferencesPanelProps = {
  preferences: AdaptationPreferences;
  onPreferenceChange: <K extends keyof AdaptationPreferences>(
    key: K,
    value: AdaptationPreferences[K],
  ) => void;
};

const targetMediumOptions: Array<{
  value: AdaptationPreferences['targetMedium'];
  label: string;
}> = [
  { value: 'short_drama', label: '短剧' },
  { value: 'screenplay', label: '影视剧本' },
  { value: 'visual_novel', label: '视觉小说' },
];

const targetLengthOptions: Array<{ value: AdaptationTargetLength; label: string }> = [
  { value: 'short_drama_3_min', label: '3 分钟' },
  { value: 'short_scene', label: '单场戏' },
  { value: 'ten_scene_outline', label: '10 场' },
  { value: 'episode_outline', label: '单集' },
];

const fidelityOptions: Array<{ value: AdaptationFidelity; label: string }> = [
  { value: 'core_rewrite', label: '核心重写' },
  { value: 'faithful', label: '忠于原文' },
  { value: 'free', label: '自由改编' },
];

const pacingOptions: Array<{ value: AdaptationPacing; label: string }> = [
  { value: 'balanced', label: '均衡' },
  { value: 'fast', label: '快节奏' },
  { value: 'slow', label: '慢节奏' },
];

const styleOptions: Array<{ value: AdaptationStyle; label: string }> = [
  { value: 'realist', label: '现实主义' },
  { value: 'suspense', label: '悬疑' },
  { value: 'light_comedy', label: '轻喜剧' },
  { value: 'cold', label: '冷峻' },
  { value: 'romantic', label: '浪漫' },
];

export function AdaptationPreferencesPanel({
  preferences,
  onPreferenceChange,
}: AdaptationPreferencesPanelProps) {
  return (
    <div
      aria-label="改编基础偏好"
      className="grid gap-2.5 rounded-md border border-[#d9d1c4] bg-[#fffaf2] p-2.5"
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="媒介">
          <select
            className={fieldControlClassName}
            value={preferences.targetMedium}
            onChange={(event) =>
              onPreferenceChange(
                'targetMedium',
                event.target.value as AdaptationPreferences['targetMedium'],
              )
            }
          >
            {targetMediumOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="长度">
          <select
            className={fieldControlClassName}
            value={preferences.targetLength}
            onChange={(event) =>
              onPreferenceChange('targetLength', event.target.value as AdaptationTargetLength)
            }
          >
            {targetLengthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="忠实度">
          <select
            className={fieldControlClassName}
            value={preferences.fidelity}
            onChange={(event) =>
              onPreferenceChange('fidelity', event.target.value as AdaptationFidelity)
            }
          >
            {fidelityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="节奏">
          <select
            className={fieldControlClassName}
            value={preferences.pacing}
            onChange={(event) =>
              onPreferenceChange('pacing', event.target.value as AdaptationPacing)
            }
          >
            {pacingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="风格" wide>
          <select
            className={fieldControlClassName}
            value={preferences.style}
            onChange={(event) => onPreferenceChange('style', event.target.value as AdaptationStyle)}
          >
            {styleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-[#b8d8ce] bg-[#eef6f2] px-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[#1f7667]"
            checked={preferences.allowSubplotCompression}
            onChange={(event) =>
              onPreferenceChange('allowSubplotCompression', event.target.checked)
            }
          />
          <span className="text-[11px] font-extrabold text-[#5f6b64]">压缩支线</span>
        </label>
        <label className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-[#b8d8ce] bg-[#eef6f2] px-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[#1f7667]"
            checked={preferences.allowTimelineReorder}
            onChange={(event) => onPreferenceChange('allowTimelineReorder', event.target.checked)}
          />
          <span className="text-[11px] font-extrabold text-[#5f6b64]">重排时间线</span>
        </label>
        <label className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-[#b8d8ce] bg-[#eef6f2] px-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[#1f7667]"
            checked={preferences.allowCharacterMerge}
            onChange={(event) => onPreferenceChange('allowCharacterMerge', event.target.checked)}
          />
          <span className="text-[11px] font-extrabold text-[#5f6b64]">合并角色</span>
        </label>
      </div>
    </div>
  );
}
