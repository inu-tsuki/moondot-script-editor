import { describe, expect, it } from 'vitest';
import {
  buildNovelAdaptationPrompt,
  buildNovelSceneWriterPrompt,
  createMockAdaptationPlan,
} from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { ScreenplayDocument } from '../../../src/core/screenplay';

const doc: ScreenplayDocument = demoScreenplayDocument;
const novelSource = doc.source as Extract<ScreenplayDocument['source'], { type: 'novel' }>;

describe('buildNovelAdaptationPrompt', () => {
  it('asks Architect to use many scenes for normal novel coverage', () => {
    const messages = buildNovelAdaptationPrompt(doc);
    const combined = messages.map((message) => message.content).join('\n');

    expect(combined).toContain('当前识别到 3 个来源章节');
    expect(combined).toContain('sceneOutline 应至少包含 6 个 scene cards');
    expect(combined).toContain('常规小说改编需要大量复数 scenes');
    expect(combined).toContain('不要把多章压缩成少量剧情摘要式 scenes');
    expect(combined).toContain('sceneOutline 至少包含 6 个 scene cards');
  });
});

describe('buildNovelSceneWriterPrompt', () => {
  it('pins WriterScenePatch.planId to the current AdaptationPlan id', () => {
    const plan = createMockAdaptationPlan(doc, novelSource, {});
    const messages = buildNovelSceneWriterPrompt(doc, plan);
    const userMessage = messages.find((message) => message.role === 'user');

    expect(userMessage?.content).toContain(`AdaptationPlan.id：${plan.id}`);
    expect(userMessage?.content).toContain(
      `estimatedBlocks: ${plan.sceneOutline[0].estimatedBlocks}`,
    );
    expect(userMessage?.content).toContain(
      'WriterScenePatch.planId 必须与上方 AdaptationPlan.id 完全一致',
    );
    expect(userMessage?.content).toContain(
      'dialogue.characterId 只能使用角色表中列出的 character id',
    );
    expect(userMessage?.content).toContain('blocks 数量应接近对应 scene card 的 estimatedBlocks');
    expect(userMessage?.content).toContain('不要重新命名、追加版本号或根据项目标题生成新 id');
  });
});
