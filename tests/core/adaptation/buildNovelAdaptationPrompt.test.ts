import { describe, expect, it } from 'vitest';
import {
  buildNovelSceneWriterPrompt,
  createMockAdaptationPlan,
} from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { ScreenplayDocument } from '../../../src/core/screenplay';

const doc: ScreenplayDocument = demoScreenplayDocument;
const novelSource = doc.source as Extract<ScreenplayDocument['source'], { type: 'novel' }>;

describe('buildNovelSceneWriterPrompt', () => {
  it('pins WriterScenePatch.planId to the current AdaptationPlan id', () => {
    const plan = createMockAdaptationPlan(doc, novelSource, {});
    const messages = buildNovelSceneWriterPrompt(doc, plan);
    const userMessage = messages.find((message) => message.role === 'user');

    expect(userMessage?.content).toContain(`AdaptationPlan.id：${plan.id}`);
    expect(userMessage?.content).toContain(
      'WriterScenePatch.planId 必须与上方 AdaptationPlan.id 完全一致',
    );
    expect(userMessage?.content).toContain('不要重新命名、追加版本号或根据项目标题生成新 id');
  });
});
