import type { ModelProviderType } from '../../core/model';

type RunBadgeProps = {
  provider: ModelProviderType;
};

export function RunBadge({ provider }: RunBadgeProps) {
  const isProxy = provider === 'local_proxy';

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#5f6b64]">
      <span
        className={`inline-block h-[7px] w-[7px] rounded-full ${isProxy ? 'bg-[#3b8a6f]' : 'bg-[#9ba8a2]'}`}
      />
      {isProxy ? 'API' : 'Mock'}
    </span>
  );
}
