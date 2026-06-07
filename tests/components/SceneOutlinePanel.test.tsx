import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SceneOutlinePanel } from '../../src/features/converter/SceneOutlinePanel';
import type { AdaptationPlan } from '../../src/core/adaptation';

const mockPlan: AdaptationPlan = {
  planId: 'plan-001',
  preferences: {
    targetMedium: '电影剧本',
    targetLength: '标准常规片',
    fidelity: 'balanced',
    pacing: 'standard',
    style: ['naturalistic'],
    questions: [],
  },
  sceneOutline: [
    {
      id: 'scene_card_01',
      sceneNumber: 1,
      title: '开篇：初遇',
      dramaticPurpose:
        '建立主角的平凡日常，引入第一幕转折点。通过环境描写和人物动作暗示即将到来的变化。',
      sourceRefs: [
        { sourceId: 'ch_001', kind: 'chapter' as const },
        { sourceId: 'ch_002', kind: 'chapter' as const },
      ],
      headingSuggestion: {
        locationType: 'INT',
        location: '老旧公寓客厅',
        timeOfDay: '清晨',
      },
      characterIds: ['char_xiaoming'],
      tone: '静谧中带不安',
      keyEvents: ['主角发现神秘信件'],
      risks: ['节奏过慢可能导致观众失去耐心'],
    },
    {
      id: 'scene_card_02',
      sceneNumber: 2,
      title: '冲突升级',
      dramaticPurpose: '揭示核心矛盾，强化人物关系张力。',
      sourceRefs: [{ sourceId: 'ch_002', kind: 'chapter' as const }],
      headingSuggestion: {
        locationType: 'EXT',
        location: '城市街道',
        timeOfDay: '黄昏',
      },
      characterIds: ['char_xiaoming', 'char_lili'],
      tone: '紧张',
      keyEvents: ['追车戏'],
      risks: [],
    },
  ],
  characters: [],
  sourceAnalysis: {
    sourceIds: ['ch_001', 'ch_002'],
    estimatedChapters: 2,
  },
};

describe('SceneOutlinePanel', () => {
  it('renders outline cards for a valid plan', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        isGeneratingWriter={false}
        hasDraft={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
      />,
    );

    expect(screen.getByText('开篇：初遇')).toBeInTheDocument();
    expect(screen.getByText('冲突升级')).toBeInTheDocument();
    expect(screen.getByText('scene_card_01')).toBeInTheDocument();
    expect(screen.getByText('scene_card_02')).toBeInTheDocument();
    expect(screen.getByText(/建立主角的平凡日常/)).toBeInTheDocument();
    expect(screen.getByText(/揭示核心矛盾/)).toBeInTheDocument();
    expect(screen.getByText('电影剧本')).toBeInTheDocument();
    expect(screen.getByText('标准常规片')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认生成' })).toBeInTheDocument();
  });

  it('triggers onGenerateDraft when "确认生成" is clicked', async () => {
    const user = userEvent.setup();
    const onGenerateDraft = vi.fn();

    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        isGeneratingWriter={false}
        hasDraft={false}
        isDraftApplied={false}
        onGenerateDraft={onGenerateDraft}
      />,
    );

    await user.click(screen.getByRole('button', { name: '确认生成' }));
    expect(onGenerateDraft).toHaveBeenCalledTimes(1);
  });

  it('disables "确认生成" button when generating', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        isGeneratingWriter={true}
        hasDraft={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: '生成中...' });
    expect(button).toBeDisabled();
  });

  it('returns null when plan is undefined', () => {
    const { container } = render(
      <SceneOutlinePanel
        plan={undefined}
        trace={[]}
        isGeneratingWriter={false}
        hasDraft={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
