import {
  AlertTriangle,
  Download,
  FileText,
  ListChecks,
  Plus,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import './App.css';
import { adaptNovelToScreenplayMock, defaultAdaptationPreferences } from './core/adaptation';
import { serializeDocumentToYaml } from './core/serialization';
import {
  appendBlockToFirstScene,
  demoNovelText,
  demoScreenplayDocument,
  formatSceneHeading,
  getBlockCharacterId,
  updateBlockText as updateDocumentBlockText,
} from './core/screenplay';
import { parseNovelChapters, withParsedNovelChapters } from './core/source-ingestion';
import { validateScreenplayDocument } from './core/validation';
import type {
  AdaptationFidelity,
  AdaptationPacing,
  AdaptationPlan,
  AdaptationPreferences,
  AdaptationStyle,
  AdaptationTargetLength,
  NovelAdaptationTraceStep,
} from './core/adaptation';
import type { BlockId, ScreenplayDocument, ScriptBlock } from './core/screenplay';
import type { Diagnostic } from './core/validation';

const blockTypeLabels: Record<ScriptBlock['type'], string> = {
  action: 'ACTION',
  dialogue: 'DIALOGUE',
  narration: 'NARRATION',
  transition: 'TRANSITION',
  note: 'NOTE',
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

const shouldSuppressParsedDiagnostic = (
  diagnostic: Diagnostic,
  documentDiagnostics: Diagnostic[],
) =>
  (diagnostic.code === 'empty_source_text' && diagnostic.path === 'sourceText') ||
  (diagnostic.code === 'empty_parsed_chapter_text' &&
    documentDiagnostics.some(
      (documentDiagnostic) =>
        documentDiagnostic.code === 'empty_chapter_text' &&
        documentDiagnostic.path === diagnostic.path,
    ));

function App() {
  const [sourceText, setSourceText] = useState(demoNovelText);
  const [generatedAt] = useState(() => new Date().toISOString());
  const [screenplayDocument, setScreenplayDocument] =
    useState<ScreenplayDocument>(demoScreenplayDocument);
  const [adaptationPreferences, setAdaptationPreferences] = useState<AdaptationPreferences>({
    ...defaultAdaptationPreferences,
  });
  const [adaptationDiagnostics, setAdaptationDiagnostics] = useState<Diagnostic[]>([]);
  const [adaptationPlan, setAdaptationPlan] = useState<AdaptationPlan>();
  const [adaptationTrace, setAdaptationTrace] = useState<NovelAdaptationTraceStep[]>([]);

  const parsedNovel = useMemo(() => parseNovelChapters(sourceText), [sourceText]);
  const workingDocument = useMemo<ScreenplayDocument>(
    () => withParsedNovelChapters(screenplayDocument, parsedNovel.chapters),
    [parsedNovel.chapters, screenplayDocument],
  );
  const activeScene = workingDocument.script.scenes[0];
  const chapterCount =
    workingDocument.source.type === 'novel'
      ? workingDocument.source.chapters.length
      : parsedNovel.chapters.length;

  const charactersById = useMemo(
    () => new Map(workingDocument.characters.map((character) => [character.id, character])),
    [workingDocument.characters],
  );
  const documentDiagnostics = useMemo(
    () =>
      validateScreenplayDocument(workingDocument, {
        requireChapterText: true,
        requireSubmissionReady: true,
      }),
    [workingDocument],
  );
  const displayedDiagnostics = useMemo<Diagnostic[]>(
    () => [
      {
        severity: sourceText.trim() ? (chapterCount >= 3 ? 'info' : 'warning') : 'error',
        code: sourceText.trim() ? 'source_text_chapter_count' : 'empty_source_text',
        message: sourceText.trim()
          ? chapterCount >= 3
            ? '提交样例满足 3+ 章节检查。'
            : '当前输入少于 3 章，普通转换允许继续。'
          : '小说文本不能为空。',
        path: 'sourceText',
      },
      ...parsedNovel.diagnostics.filter(
        (diagnostic) => !shouldSuppressParsedDiagnostic(diagnostic, documentDiagnostics),
      ),
      ...adaptationDiagnostics,
      ...documentDiagnostics,
    ],
    [adaptationDiagnostics, chapterCount, documentDiagnostics, parsedNovel.diagnostics, sourceText],
  );

  const yamlPreview = useMemo(
    () => serializeDocumentToYaml(workingDocument, { generatedAt }),
    [generatedAt, workingDocument],
  );

  const addBlock = () => {
    setScreenplayDocument((currentDocument) => appendBlockToFirstScene(currentDocument));
  };

  const updateBlockText = (id: BlockId, text: string) => {
    setScreenplayDocument((currentDocument) => updateDocumentBlockText(currentDocument, id, text));
  };

  const updateSourceText = (text: string) => {
    setSourceText(text);
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
  };

  const clearAdaptationRun = () => {
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
  };

  const updateAdaptationPreference = <Key extends keyof AdaptationPreferences>(
    key: Key,
    value: AdaptationPreferences[Key],
  ) => {
    setAdaptationPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: value,
      source: 'user',
    }));
    clearAdaptationRun();
  };

  const generateScreenplay = () => {
    const adaptationResult = adaptNovelToScreenplayMock({
      document: workingDocument,
      preferences: adaptationPreferences,
    });

    setScreenplayDocument(adaptationResult.document);
    setAdaptationPlan(adaptationResult.plan);
    setAdaptationTrace(adaptationResult.trace);
    setAdaptationDiagnostics(adaptationResult.diagnostics);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">月</span>
          <div className="brand-copy">
            <span className="brand-title">月点</span>
            <span className="brand-subtitle">AI 剧本创作工作台</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button-secondary" type="button" title="导入小说">
            <FileText size={16} />
            导入
          </button>
          <button
            className="button-primary"
            type="button"
            title="生成剧本"
            onClick={generateScreenplay}
          >
            <WandSparkles size={16} />
            生成
          </button>
          <button className="button-secondary" type="button" title="导出 YAML">
            <Download size={16} />
            YAML
          </button>
        </div>
      </header>

      <main className="workbench">
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={16} />
              Source
            </div>
            <span className="panel-meta">
              {workingDocument.source.type} · {chapterCount} chapters
            </span>
          </div>
          <div className="panel-body">
            <textarea
              aria-label="小说来源文本"
              className="source-textarea"
              value={sourceText}
              onChange={(event) => updateSourceText(event.target.value)}
            />
            <div className="chapter-strip" aria-label="章节识别结果">
              <div className="chapter-pill">
                <span>sourceType</span>
                <span>{workingDocument.source.type}</span>
              </div>
              <div className="chapter-pill">
                <span>submission check</span>
                <span>{chapterCount >= 3 ? 'ready' : 'warning'}</span>
              </div>
            </div>
            <div className="preference-panel" aria-label="改编基础偏好">
              <div className="preference-grid">
                <label className="preference-field">
                  <span>媒介</span>
                  <select
                    value={adaptationPreferences.targetMedium}
                    onChange={(event) =>
                      updateAdaptationPreference(
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
                </label>
                <label className="preference-field">
                  <span>长度</span>
                  <select
                    value={adaptationPreferences.targetLength}
                    onChange={(event) =>
                      updateAdaptationPreference(
                        'targetLength',
                        event.target.value as AdaptationTargetLength,
                      )
                    }
                  >
                    {targetLengthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="preference-field">
                  <span>忠实度</span>
                  <select
                    value={adaptationPreferences.fidelity}
                    onChange={(event) =>
                      updateAdaptationPreference(
                        'fidelity',
                        event.target.value as AdaptationFidelity,
                      )
                    }
                  >
                    {fidelityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="preference-field">
                  <span>节奏</span>
                  <select
                    value={adaptationPreferences.pacing}
                    onChange={(event) =>
                      updateAdaptationPreference('pacing', event.target.value as AdaptationPacing)
                    }
                  >
                    {pacingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="preference-field preference-field-wide">
                  <span>风格</span>
                  <select
                    value={adaptationPreferences.style}
                    onChange={(event) =>
                      updateAdaptationPreference('style', event.target.value as AdaptationStyle)
                    }
                  >
                    {styleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="preference-toggles">
                <label className="preference-toggle">
                  <input
                    type="checkbox"
                    checked={adaptationPreferences.allowSubplotCompression}
                    onChange={(event) =>
                      updateAdaptationPreference('allowSubplotCompression', event.target.checked)
                    }
                  />
                  <span>压缩支线</span>
                </label>
                <label className="preference-toggle">
                  <input
                    type="checkbox"
                    checked={adaptationPreferences.allowTimelineReorder}
                    onChange={(event) =>
                      updateAdaptationPreference('allowTimelineReorder', event.target.checked)
                    }
                  />
                  <span>重排时间线</span>
                </label>
                <label className="preference-toggle">
                  <input
                    type="checkbox"
                    checked={adaptationPreferences.allowCharacterMerge}
                    onChange={(event) =>
                      updateAdaptationPreference('allowCharacterMerge', event.target.checked)
                    }
                  />
                  <span>合并角色</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Sparkles size={16} />
              Semantic Blocks
            </div>
            <button
              className="button-secondary"
              type="button"
              title="增加语义块"
              onClick={addBlock}
            >
              <Plus size={16} />
              Block
            </button>
          </div>
          <div className="panel-body">
            <div className="scene-list">
              {activeScene ? (
                <article className="scene-card">
                  <div className="scene-heading">
                    <div>
                      <div className="scene-kicker">{formatSceneHeading(activeScene.heading)}</div>
                      <div className="scene-title">{activeScene.title}</div>
                      <div className="scene-summary">{activeScene.synopsis}</div>
                    </div>
                    <span className="panel-meta">{activeScene.id}</span>
                  </div>
                  <div className="block-list">
                    {activeScene.blocks.map((block) => {
                      const characterId = getBlockCharacterId(block);
                      const characterName = characterId
                        ? (charactersById.get(characterId)?.name ?? characterId)
                        : undefined;

                      return (
                        <div className="script-block" key={block.id}>
                          <div className="block-toolbar">
                            <span className="block-type">{blockTypeLabels[block.type]}</span>
                            {characterName ? (
                              <span className="block-character">{characterName}</span>
                            ) : null}
                          </div>
                          <textarea
                            aria-label={`${blockTypeLabels[block.type]} ${block.id}`}
                            className="block-input"
                            value={block.text}
                            onChange={(event) => updateBlockText(block.id, event.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </article>
              ) : (
                <div className="diagnostic">
                  <AlertTriangle size={16} />
                  <span>当前 document 没有可编辑场景。</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel panel-output">
          <div className="panel-header">
            <div className="panel-title">
              <Download size={16} />
              YAML Projection
            </div>
            <span className="panel-meta">document v{workingDocument.documentVersion}</span>
          </div>
          <div className="panel-body side-tabs">
            {adaptationPlan ? (
              <section className="outline-panel" aria-label="改编大纲">
                <div className="outline-header">
                  <div className="panel-title">
                    <ListChecks size={16} />
                    Scene Outline
                  </div>
                  <span className="panel-meta">{adaptationPlan.sceneOutline.length} scenes</span>
                </div>
                <div className="outline-preferences">
                  <span>{adaptationPlan.preferences.targetMedium}</span>
                  <span>{adaptationPlan.preferences.targetLength}</span>
                  <span>{adaptationPlan.preferences.fidelity}</span>
                  <span>{adaptationPlan.preferences.pacing}</span>
                </div>
                <div className="outline-list">
                  {adaptationPlan.sceneOutline.map((sceneCard) => (
                    <article className="outline-card" key={sceneCard.id}>
                      <div className="outline-title">{sceneCard.title}</div>
                      <div className="outline-purpose">{sceneCard.dramaticPurpose}</div>
                      <div className="outline-meta">
                        <span>{sceneCard.id}</span>
                        <span>
                          {sceneCard.sourceRefs.map((sourceRef) => sourceRef.sourceId).join(' + ')}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
                {adaptationTrace.length ? (
                  <div className="trace-list" aria-label="生成轨迹">
                    {adaptationTrace.map((traceStep) => (
                      <div className="trace-item" key={`${traceStep.label}-${traceStep.stage}`}>
                        <span>{traceStep.label}</span>
                        <span>{traceStep.detail}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            <pre className="yaml-preview">{yamlPreview}</pre>
            <div className="diagnostics">
              {displayedDiagnostics.map((diagnostic, index) => (
                <div className="diagnostic" key={`${diagnostic.code}-${diagnostic.path}-${index}`}>
                  <AlertTriangle size={16} />
                  <span>
                    {diagnostic.message}
                    {diagnostic.suggestion ? ` ${diagnostic.suggestion}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
