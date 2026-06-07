import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SceneOutlinePanel } from '../../src/components/panels/SceneOutlinePanel';
import type { AdaptationPlan, WriterScenePatch } from '../../src/core/adaptation';

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

const mockWriterDraft: WriterScenePatch = {
  planId: 'plan-001',
  scenes: [
    {
      sceneCardId: 'scene_card_01',
      title: '开篇：初遇',
      synopsis: '主角小明在清晨的公寓中醒来，发现了一封神秘信件，生活从此改变。',
      heading: {
        locationType: 'INT',
        location: '老旧公寓客厅',
        timeOfDay: '清晨',
      },
      sourceRefs: [
        { sourceId: 'ch_001', kind: 'chapter' as const },
        { sourceId: 'ch_002', kind: 'chapter' as const },
      ],
      blocks: [
        {
          type: 'action' as const,
          text: '阳光透过旧窗帘洒在墙上的裂缝上。小明翻身关掉闹钟。',
        },
        {
          type: 'narration' as const,
          voice: 'voice_over' as const,
          text: '当时的我还不知道，这封信会改变一切。',
        },
        {
          type: 'dialogue' as const,
          characterId: '小明',
          text: '又是平常的一天...不，这是什么？',
        },
        {
          type: 'action' as const,
          text: '他注意到门缝下塞着一封黄色的信封。',
        },
      ],
    },
    {
      sceneCardId: 'scene_card_02',
      title: '冲突升级',
      synopsis: '小明在追赶神秘人的过程中发现了城市隐藏的另一面。',
      heading: {
        locationType: 'EXT',
        location: '城市街道',
        timeOfDay: '黄昏',
      },
      sourceRefs: [{ sourceId: 'ch_002', kind: 'chapter' as const }],
      blocks: [
        {
          type: 'action' as const,
          text: '小明在人行道上狂奔，撞翻了一个水果摊。',
        },
        {
          type: 'transition' as const,
          text: '切至：',
        },
      ],
    },
  ],
};

describe('SceneOutlinePanel', () => {
  it('renders outline cards for a valid plan', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={null}
        isGeneratingWriter={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
        onApplyDraft={vi.fn()}
      />,
    );

    // Outline cards
    expect(screen.getByText('开篇：初遇')).toBeInTheDocument();
    expect(screen.getByText('冲突升级')).toBeInTheDocument();

    // Scene IDs visible
    expect(screen.getByText('scene_card_01')).toBeInTheDocument();
    expect(screen.getByText('scene_card_02')).toBeInTheDocument();

    // Dramatic purposes
    expect(screen.getByText(/建立主角的平凡日常/)).toBeInTheDocument();
    expect(screen.getByText(/揭示核心矛盾/)).toBeInTheDocument();

    // Badges for preferences
    expect(screen.getByText('电影剧本')).toBeInTheDocument();
    expect(screen.getByText('标准常规片')).toBeInTheDocument();

    // "确认生成" button is present
    expect(screen.getByRole('button', { name: '确认生成' })).toBeInTheDocument();

    // No apply button when no draft
    expect(screen.queryByRole('button', { name: '应用到剧本' })).toBeNull();
  });

  it('shows "Writer 草稿预览" section with heading, synopsis, source refs, and block previews', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={mockWriterDraft}
        isGeneratingWriter={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
        onApplyDraft={vi.fn()}
      />,
    );

    // Draft preview section is present
    const preview = screen.getByLabelText('Writer 草稿预览');
    expect(preview).toBeInTheDocument();

    // Scene heading text
    expect(preview).toHaveTextContent('INT. 老旧公寓客厅 — 清晨');
    expect(preview).toHaveTextContent('EXT. 城市街道 — 黄昏');

    // Synopsis text
    expect(preview).toHaveTextContent(/神秘信件/);

    // Source ref badges
    expect(preview).toHaveTextContent('ch_001');
    expect(preview).toHaveTextContent('ch_002');

    // Block type labels
    expect(preview).toHaveTextContent('动作');
    expect(preview).toHaveTextContent('小明 对白');
    expect(preview).toHaveTextContent('叙述 (voice_over)');
    expect(preview).toHaveTextContent('转场');

    // Block text excerpts — each is rendered in its own sub-element
    expect(screen.getByText(/阳光透过旧窗帘/)).toBeInTheDocument();
    expect(screen.getByText(/又是平常的一天/)).toBeInTheDocument();
    // Narration block: check voice label is visible and block text is rendered
    expect(preview).toHaveTextContent('叙述 (voice_over)');
    expect(screen.getByText(/这封信会改变一切/)).toBeInTheDocument();

    // More blocks hint (scene 1 has 4 blocks, preview shows 3 → "还有 1 个 block")
    expect(preview).toHaveTextContent(/还有 1 个 block/);
  });

  it('shows "应用到剧本" button when draft is pending and not applied', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={mockWriterDraft}
        isGeneratingWriter={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
        onApplyDraft={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '应用到剧本' })).toBeInTheDocument();
  });

  it('hides apply button when draft is already applied', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={mockWriterDraft}
        isGeneratingWriter={false}
        isDraftApplied={true}
        onGenerateDraft={vi.fn()}
        onApplyDraft={vi.fn()}
      />,
    );

    // Apply button is gone
    expect(screen.queryByRole('button', { name: '应用到剧本' })).toBeNull();

    // "已应用到剧本" state shown
    expect(screen.getByText('已应用到剧本')).toBeInTheDocument();
  });

  it('triggers onGenerateDraft when "确认生成" is clicked', async () => {
    const user = userEvent.setup();
    const onGenerateDraft = vi.fn();

    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={null}
        isGeneratingWriter={false}
        isDraftApplied={false}
        onGenerateDraft={onGenerateDraft}
        onApplyDraft={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '确认生成' }));

    expect(onGenerateDraft).toHaveBeenCalledTimes(1);
  });

  it('triggers onApplyDraft when "应用到剧本" is clicked', async () => {
    const user = userEvent.setup();
    const onApplyDraft = vi.fn();

    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={mockWriterDraft}
        isGeneratingWriter={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
        onApplyDraft={onApplyDraft}
      />,
    );

    await user.click(screen.getByRole('button', { name: '应用到剧本' }));

    expect(onApplyDraft).toHaveBeenCalledTimes(1);
  });

  it('disables "确认生成" button when generating', () => {
    render(
      <SceneOutlinePanel
        plan={mockPlan}
        trace={[]}
        writerDraft={null}
        isGeneratingWriter={true}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
        onApplyDraft={vi.fn()}
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
        writerDraft={null}
        isGeneratingWriter={false}
        isDraftApplied={false}
        onGenerateDraft={vi.fn()}
        onApplyDraft={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
