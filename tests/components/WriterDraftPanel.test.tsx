import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WriterDraftPanel } from '../../src/features/converter/WriterDraftPanel';
import type { WriterScenePatch } from '../../src/core/adaptation';

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

describe('WriterDraftPanel', () => {
  it('returns null when writerDraft is null', () => {
    const { container } = render(
      <WriterDraftPanel writerDraft={null} isDraftApplied={false} onApplyDraft={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows draft preview with heading, synopsis, source refs, and block previews', () => {
    render(
      <WriterDraftPanel
        writerDraft={mockWriterDraft}
        isDraftApplied={false}
        onApplyDraft={vi.fn()}
      />,
    );

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

    // Block text excerpts
    expect(screen.getByText(/阳光透过旧窗帘/)).toBeInTheDocument();
    expect(screen.getByText(/又是平常的一天/)).toBeInTheDocument();
    expect(screen.getByText(/这封信会改变一切/)).toBeInTheDocument();

    // More blocks hint (scene 1 has 4 blocks, preview shows 3)
    expect(preview).toHaveTextContent(/还有 1 个 block/);
  });

  it('shows "应用到剧本" button when not applied', () => {
    render(
      <WriterDraftPanel
        writerDraft={mockWriterDraft}
        isDraftApplied={false}
        onApplyDraft={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '应用到剧本' })).toBeInTheDocument();
  });

  it('shows "已应用到剧本" disabled button when already applied', () => {
    render(
      <WriterDraftPanel
        writerDraft={mockWriterDraft}
        isDraftApplied={true}
        onApplyDraft={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: '应用到剧本' })).toBeNull();
    expect(screen.getByText('已应用到剧本')).toBeInTheDocument();
  });

  it('triggers onApplyDraft when "应用到剧本" is clicked', async () => {
    const user = userEvent.setup();
    const onApplyDraft = vi.fn();

    render(
      <WriterDraftPanel
        writerDraft={mockWriterDraft}
        isDraftApplied={false}
        onApplyDraft={onApplyDraft}
      />,
    );

    await user.click(screen.getByRole('button', { name: '应用到剧本' }));
    expect(onApplyDraft).toHaveBeenCalledTimes(1);
  });
});
