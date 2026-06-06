import { FileText, Layout } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import './App.css';
import { PanelBody, PanelHeader, PanelMeta, PanelShell, PanelTitle, Tabs } from './components/ui';
import {
  AdaptationPreferencesPanel,
  DiagnosticsPanel,
  SceneOutlinePanel,
  ScriptEditorPanel,
  SourcePanel,
  Topbar,
  WorkbenchLayout,
  YamlExportPanel,
} from './components/panels';
import {
  buildNovelAdaptationPrompt,
  buildNovelSceneWriterPrompt,
  defaultAdaptationPreferences,
} from './core/adaptation';
import { createMockModelAdapter } from './core/model';
import { serializeDocumentToYaml } from './core/serialization';
import {
  appendBlockToScene,
  deleteBlock,
  demoNovelText,
  demoScreenplayDocument,
  insertBlockAfter,
  moveBlock,
  updateBlockCharacter,
  updateBlockText as updateDocumentBlockText,
  updateDialogueParenthetical,
  updateSceneHeading,
  updateSceneMetadata,
} from './core/screenplay';
import { parseNovelChapters, withParsedNovelChapters } from './core/source-ingestion';
import { validateScreenplayDocument } from './core/validation';
import type {
  AdaptationPlan,
  AdaptationPreferences,
  NovelAdaptationTraceStep,
} from './core/adaptation';
import type { BlockId, EditAction, ScreenplayDocument } from './core/screenplay';
import type { Diagnostic } from './core/validation';

const createYamlFileName = (title: string) => {
  const normalizedTitle = title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]/g, '')
    .toLowerCase();

  return `${normalizedTitle || 'moondot-screenplay'}.yaml`;
};

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('clipboard unavailable');
  }
};

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
  const [exportFeedback, setExportFeedback] = useState('');
  const [outputTab, setOutputTab] = useState('outline');
  const [selectedBlockId, setSelectedBlockId] = useState<BlockId | null>(null);
  const isCurrentPlanDrafted = adaptationTrace.some(
    (traceStep) => traceStep.artifactType === 'writer_draft',
  );

  // ---------------------------------------------------------------------------
  // Model adapter — stable reference, reads latest state via refs
  // ---------------------------------------------------------------------------
  const docRef = useRef(screenplayDocument);
  const prefsRef = useRef(adaptationPreferences);
  prefsRef.current = adaptationPreferences;
  const planRef = useRef(adaptationPlan);
  planRef.current = adaptationPlan;

  const modelAdapter = useMemo(
    () =>
      createMockModelAdapter({
        getDocument: () => docRef.current,
        getPreferences: () => prefsRef.current,
        getPlan: () => planRef.current,
      }),
    [],
  );

  // Track the latest call to ignore stale async results.
  const latestRunIdRef = useRef<string | null>(null);

  const parsedNovel = useMemo(() => parseNovelChapters(sourceText), [sourceText]);
  const workingDocument = useMemo<ScreenplayDocument>(
    () => withParsedNovelChapters(screenplayDocument, parsedNovel.chapters),
    [parsedNovel.chapters, screenplayDocument],
  );
  // Keep docRef in sync with the derived working document used by all call sites.
  docRef.current = workingDocument;
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
  const exportStatus = useMemo(() => {
    const errorCount = documentDiagnostics.filter(
      (diagnostic) => diagnostic.severity === 'error',
    ).length;
    const warningCount = documentDiagnostics.filter(
      (diagnostic) => diagnostic.severity === 'warning',
    ).length;

    return {
      errorCount,
      warningCount,
      isReady: errorCount === 0,
    };
  }, [documentDiagnostics]);
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

  // ---------------------------------------------------------------------------
  // Unified edit dispatcher
  // ---------------------------------------------------------------------------

  const handleEdit = (action: EditAction) => {
    switch (action.type) {
      case 'select-block':
        setSelectedBlockId(action.blockId);
        break;
      case 'delete-block':
        setScreenplayDocument((prev) => deleteBlock(prev, action.sceneId, action.blockId));
        setSelectedBlockId(null);
        setExportFeedback('');
        break;
      case 'move-block':
        setScreenplayDocument((prev) =>
          moveBlock(prev, action.sceneId, action.blockId, action.direction),
        );
        setExportFeedback('');
        break;
      case 'insert-block-after':
        setScreenplayDocument((prev) =>
          insertBlockAfter(prev, action.sceneId, action.afterBlockId, action.draft),
        );
        setExportFeedback('');
        break;
      case 'append-block':
        setScreenplayDocument((prev) => appendBlockToScene(prev, action.sceneId, action.draft));
        setExportFeedback('');
        break;
      case 'update-block-character':
        setScreenplayDocument((prev) =>
          updateBlockCharacter(prev, action.blockId, action.characterId),
        );
        setExportFeedback('');
        break;
      case 'update-parenthetical':
        setScreenplayDocument((prev) =>
          updateDialogueParenthetical(prev, action.blockId, action.parenthetical),
        );
        setExportFeedback('');
        break;
      case 'update-scene-heading':
        setScreenplayDocument((prev) => updateSceneHeading(prev, action.sceneId, action.patch));
        setExportFeedback('');
        break;
      case 'update-scene-metadata':
        setScreenplayDocument((prev) => updateSceneMetadata(prev, action.sceneId, action.patch));
        setExportFeedback('');
        break;
    }
  };

  const handleUpdateBlockText = (id: BlockId, text: string) => {
    setScreenplayDocument((currentDocument) => updateDocumentBlockText(currentDocument, id, text));
    setExportFeedback('');
  };

  const clearSelection = () => setSelectedBlockId(null);

  const updateSourceText = (text: string) => {
    setSourceText(text);
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setExportFeedback('');
    clearSelection();
  };

  const clearAdaptationRun = () => {
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setExportFeedback('');
    clearSelection();
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

  const generateSceneOutline = async () => {
    const runId = crypto.randomUUID();
    latestRunIdRef.current = runId;

    try {
      const messages = buildNovelAdaptationPrompt(workingDocument, adaptationPreferences);
      const result = await modelAdapter.call({
        messages,
        stage: 'adaptation_planning',
        runId,
      });

      // Discard stale results (user changed source while request was in flight).
      if (result.runId !== latestRunIdRef.current) {
        return;
      }

      setAdaptationPlan(result.data ?? undefined);
      setAdaptationTrace(
        result.data
          ? [
              {
                label: 'source-ingestion',
                detail: `读取 ${chapterCount} 个小说章节作为模型输入。`,
                stage: 'source_analysis',
                artifactType: 'source_analysis',
                sourceIds: result.data.sceneOutline.flatMap((sceneCard) =>
                  sceneCard.sourceRefs.map((sourceRef) => String(sourceRef.sourceId)),
                ),
              },
              {
                label: 'model-planning',
                detail: `通过 ${result.trace.provider} provider 生成 ${result.data.sceneOutline.length} 张 scene cards；scene 可以引用多个章节。`,
                stage: 'adaptation_planning',
                artifactType: 'adaptation_plan',
              },
            ]
          : [],
      );
      setAdaptationDiagnostics(result.diagnostics);
      setExportFeedback('');
      setOutputTab('outline');
      clearSelection();
    } catch (err) {
      setAdaptationDiagnostics([
        {
          severity: 'error',
          code: 'model_call_rejected',
          message: err instanceof Error ? err.message : 'Model call failed unexpectedly.',
          path: 'model',
        },
      ]);
    }
  };

  const confirmSceneOutline = async () => {
    if (!adaptationPlan) {
      return;
    }

    const runId = crypto.randomUUID();
    latestRunIdRef.current = runId;

    try {
      const messages = buildNovelSceneWriterPrompt(workingDocument, adaptationPlan);
      const result = await modelAdapter.call({
        messages,
        stage: 'scene_draft',
        runId,
      });

      // Discard stale results.
      if (result.runId !== latestRunIdRef.current) {
        return;
      }

      if (!result.data) {
        setAdaptationDiagnostics(result.diagnostics);
        return;
      }

      setScreenplayDocument(result.data);
      setAdaptationTrace((currentTrace) => [
        ...currentTrace.filter((traceStep) => traceStep.artifactType !== 'writer_draft'),
        {
          label: 'model-writing',
          detail: `通过 ${result.trace.provider} provider 写入 ScreenplayAst 草稿。`,
          stage: 'scene_draft',
          artifactType: 'writer_draft',
        },
      ]);
      setAdaptationDiagnostics(result.diagnostics);
      setExportFeedback('');
      clearSelection();
    } catch (err) {
      setAdaptationDiagnostics([
        {
          severity: 'error',
          code: 'model_call_rejected',
          message: err instanceof Error ? err.message : 'Model call failed unexpectedly.',
          path: 'model',
        },
      ]);
    }
  };

  const copyYaml = async () => {
    setOutputTab('yaml');

    if (!exportStatus.isReady) {
      setExportFeedback('存在 validation error，暂不复制。');
      return;
    }

    try {
      await copyTextToClipboard(yamlPreview);
      setExportFeedback('YAML 已复制。');
    } catch {
      setExportFeedback('复制失败，请手动选择 YAML 文本。');
    }
  };

  const downloadYaml = () => {
    setOutputTab('yaml');

    if (!exportStatus.isReady) {
      setExportFeedback('存在 validation error，暂不下载。');
      return;
    }

    const blob = new Blob([yamlPreview], { type: 'text/yaml;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = createYamlFileName(workingDocument.project.title);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setExportFeedback('YAML 已下载。');
  };

  return (
    <div className="app-shell">
      <Topbar
        canConfirm={!!adaptationPlan && !isCurrentPlanDrafted}
        isExportReady={exportStatus.isReady}
        onGenerateOutline={generateSceneOutline}
        onConfirmOutline={confirmSceneOutline}
        onDownloadYaml={downloadYaml}
      />

      <WorkbenchLayout
        left={
          <PanelShell>
            <PanelHeader>
              <PanelTitle icon={<FileText size={16} />}>Source</PanelTitle>
              <PanelMeta>
                {workingDocument.source.type} · {chapterCount} chapters
              </PanelMeta>
            </PanelHeader>
            <PanelBody>
              <SourcePanel
                chapterCount={chapterCount}
                sourceText={sourceText}
                sourceType={workingDocument.source.type}
                onSourceTextChange={updateSourceText}
              />
              <AdaptationPreferencesPanel
                preferences={adaptationPreferences}
                onPreferenceChange={updateAdaptationPreference}
              />
            </PanelBody>
          </PanelShell>
        }
        center={
          <ScriptEditorPanel
            charactersById={charactersById}
            scene={activeScene}
            selectedBlockId={selectedBlockId}
            onEdit={handleEdit}
            onUpdateBlockText={handleUpdateBlockText}
          />
        }
        right={
          <PanelShell className="panel-output">
            <PanelHeader>
              <PanelTitle icon={<Layout size={16} />}>Output</PanelTitle>
              <PanelMeta>document v{workingDocument.documentVersion}</PanelMeta>
            </PanelHeader>
            <PanelBody>
              <Tabs
                tabs={[
                  { id: 'outline', label: 'Scene Outline' },
                  { id: 'yaml', label: 'YAML' },
                  { id: 'diagnostics', label: 'Diagnostics' },
                ]}
                activeTabId={outputTab}
                onTabChange={setOutputTab}
              />
              <div className="min-h-0 flex-1 overflow-auto">
                {outputTab === 'outline' &&
                  (adaptationPlan ? (
                    <SceneOutlinePanel
                      isDrafted={isCurrentPlanDrafted}
                      plan={adaptationPlan}
                      trace={adaptationTrace}
                      onConfirm={confirmSceneOutline}
                    />
                  ) : (
                    <div className="flex items-start gap-2 rounded-md border border-[#d9d1c4] bg-[#fffdf8] p-4 text-sm leading-relaxed text-[#66716b]">
                      尚未生成改编大纲。点击顶部「大纲」按钮开始。
                    </div>
                  ))}
                {outputTab === 'yaml' && (
                  <div className="flex min-h-0 flex-col gap-2.5">
                    <YamlExportPanel
                      exportStatus={exportStatus}
                      feedback={exportFeedback}
                      onCopy={copyYaml}
                      onDownload={downloadYaml}
                    />
                    <pre className="yaml-preview">{yamlPreview}</pre>
                  </div>
                )}
                {outputTab === 'diagnostics' && (
                  <DiagnosticsPanel diagnostics={displayedDiagnostics} />
                )}
              </div>
            </PanelBody>
          </PanelShell>
        }
      />
    </div>
  );
}

export default App;
