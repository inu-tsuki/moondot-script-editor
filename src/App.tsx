import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { AppShell, DockLayout } from './components/shell';
import { EditorWorkspace, ExportBar, SceneNavigator, ScriptEditorPanel } from './features/editor';
import {
  AdaptationPreferencesPanel,
  ConverterWorkspace,
  DiagnosticsBand,
  SceneOutlinePanel,
  SourcePanel,
  WriterDraftPanel,
} from './features/converter';
import {
  ADAPTATION_PLAN_SCHEMA_ID,
  WRITER_SCENE_PATCH_SCHEMA_ID,
  applySceneDrafts,
  buildNovelAdaptationPrompt,
  buildNovelSceneWriterPrompt,
  defaultAdaptationPreferences,
  validateAdaptationPlan,
  validateWriterScenePatch,
} from './core/adaptation';
import { createMockModelAdapter, createProxyModelAdapter } from './core/model';
import type { ModelProviderType } from './core/model';
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
import { getDiagnosticStage, validateScreenplayDocument } from './core/validation';
import type {
  AdaptationPlan,
  AdaptationPreferences,
  NovelAdaptationTraceStep,
  WriterScenePatch,
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
  const [selectedBlockId, setSelectedBlockId] = useState<BlockId | null>(null);
  const [providerType, setProviderType] = useState<ModelProviderType>('mock');
  const [isProxyAvailable, setIsProxyAvailable] = useState(false);
  const [isProbing, setIsProbing] = useState(true);
  // Writer two-phase workflow:
  // Phase 1 — click "确认生成" triggers Writer, stores validated patch here.
  // Phase 2 — click "应用到剧本" calls applySceneDrafts() and writes to document.
  const [writerDraft, setWriterDraft] = useState<WriterScenePatch | null>(null);
  const [isGeneratingWriter, setIsGeneratingWriter] = useState(false);
  // Provider that actually generated each artifact — captured from
  // `result.trace.provider` so the RunBadge reflects the generation source,
  // not the currently-selected provider.
  const [planProvider, setPlanProvider] = useState<ModelProviderType | null>(null);
  const [draftProvider, setDraftProvider] = useState<ModelProviderType | null>(null);
  // Derived: draft has been applied to document (Writer trace step exists).
  const isDraftApplied = adaptationTrace.some(
    (traceStep) => traceStep.artifactType === 'writer_draft',
  );
  const hasWriterDraft = writerDraft !== null;
  // Synchronous gate to prevent duplicate Writer calls within the same event batch.
  const generatingRef = useRef(false);
  // Which scene is currently shown in the central editor.
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // ---------------------------------------------------------------------------
  // Model adapter — stable reference, reads latest state via refs
  // ---------------------------------------------------------------------------
  const docRef = useRef(screenplayDocument);
  const prefsRef = useRef(adaptationPreferences);
  prefsRef.current = adaptationPreferences;
  const planRef = useRef(adaptationPlan);
  planRef.current = adaptationPlan;

  const modelAdapter = useMemo(() => {
    if (providerType === 'local_proxy' && isProxyAvailable) {
      return createProxyModelAdapter();
    }
    return createMockModelAdapter({
      getDocument: () => docRef.current,
      getPreferences: () => prefsRef.current,
      getPlan: () => planRef.current,
    });
  }, [providerType, isProxyAvailable]);

  // Track the latest call to ignore stale async results.
  const latestRunIdRef = useRef<string | null>(null);

  const invalidateModelRun = () => {
    latestRunIdRef.current = null;
  };

  const invalidateWriterDraft = () => {
    setWriterDraft(null);
    setDraftProvider(null);
  };

  const handleProviderChange = (next: ModelProviderType) => {
    invalidateModelRun();
    invalidateWriterDraft();
    setProviderType(next);
  };

  // ---------------------------------------------------------------------------
  // Auto-detect /api/model/call availability on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        const res = await fetch('/api/model/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'probe' }],
            stage: '_probe',
            structuredOutput: { schemaId: '_probe' },
          }),
        });

        if (!cancelled) {
          const ct = res.headers.get('Content-Type') ?? '';
          if (ct.includes('application/json')) {
            try {
              const body = await res.json();
              if (body?.trace?.provider === 'local_proxy') {
                setIsProxyAvailable(true);
              }
            } catch {
              // JSON parse failed — not our endpoint
            }
          }
        }
      } catch {
        // fetch failed — proxy not available
      } finally {
        if (!cancelled) setIsProbing(false);
      }
    };

    if (import.meta.env.DEV) {
      probe();
    } else {
      setIsProbing(false);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const parsedNovel = useMemo(() => parseNovelChapters(sourceText), [sourceText]);
  const workingDocument = useMemo<ScreenplayDocument>(
    () => withParsedNovelChapters(screenplayDocument, parsedNovel.chapters),
    [parsedNovel.chapters, screenplayDocument],
  );
  docRef.current = workingDocument;
  useEffect(() => {
    const maxIndex = Math.max(0, workingDocument.script.scenes.length - 1);
    if (activeSceneIndex > maxIndex) {
      setActiveSceneIndex(maxIndex);
    }
  }, [workingDocument.script.scenes.length, activeSceneIndex]);
  const activeScene =
    workingDocument.script.scenes[activeSceneIndex] ?? workingDocument.script.scenes[0];
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

  // Stage-filtered diagnostics for inline display between converter cards.
  const sourceDiagnostics = useMemo(
    () => displayedDiagnostics.filter((d) => getDiagnosticStage(d) === 'source'),
    [displayedDiagnostics],
  );
  const planDiagnostics = useMemo(
    () => displayedDiagnostics.filter((d) => getDiagnosticStage(d) === 'plan'),
    [displayedDiagnostics],
  );
  const documentExportDiagnostics = useMemo(
    () => displayedDiagnostics.filter((d) => getDiagnosticStage(d) === 'document'),
    [displayedDiagnostics],
  );

  const yamlPreview = useMemo(
    () => serializeDocumentToYaml(workingDocument, { generatedAt }),
    [generatedAt, workingDocument],
  );

  // ---------------------------------------------------------------------------
  // Unified edit dispatcher
  // ---------------------------------------------------------------------------

  const handleEdit = (action: EditAction) => {
    if (action.type !== 'select-block') {
      invalidateModelRun();
      invalidateWriterDraft();
    }

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
    invalidateModelRun();
    invalidateWriterDraft();
    setScreenplayDocument((currentDocument) => updateDocumentBlockText(currentDocument, id, text));
    setExportFeedback('');
  };

  const clearSelection = () => setSelectedBlockId(null);

  const updateSourceText = (text: string) => {
    invalidateModelRun();
    setSourceText(text);
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setWriterDraft(null);
    setExportFeedback('');
    clearSelection();
  };

  const clearAdaptationRun = () => {
    invalidateModelRun();
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setWriterDraft(null);
    setExportFeedback('');
    clearSelection();
  };

  const updateAdaptationPreference = <Key extends keyof AdaptationPreferences>(
    key: Key,
    value: AdaptationPreferences[Key],
  ) => {
    invalidateModelRun();
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
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setWriterDraft(null);

    try {
      const messages = buildNovelAdaptationPrompt(workingDocument, adaptationPreferences);
      const result = await modelAdapter.call({
        messages,
        stage: 'adaptation_planning',
        runId,
        structuredOutput: { schemaId: ADAPTATION_PLAN_SCHEMA_ID },
      });

      if (result.runId !== latestRunIdRef.current) {
        return;
      }

      const knownChapterIds = new Set(
        workingDocument.source.type === 'novel'
          ? workingDocument.source.chapters.map((c) => c.id)
          : [],
      );
      const validated = validateAdaptationPlan(result.data, { knownChapterIds });

      if (!validated.plan) {
        setAdaptationPlan(undefined);
        setPlanProvider(null);
        setAdaptationTrace([]);
        setAdaptationDiagnostics([...result.diagnostics, ...validated.diagnostics]);
        setExportFeedback('');
        return;
      }

      setAdaptationPlan(validated.plan);
      setPlanProvider(result.trace.provider);
      setAdaptationTrace(
        validated.plan
          ? [
              {
                label: 'source-ingestion',
                detail: `读取 ${chapterCount} 个小说章节作为模型输入。`,
                stage: 'source_analysis',
                artifactType: 'source_analysis',
                sourceIds: validated.plan.sceneOutline.flatMap((sceneCard) =>
                  sceneCard.sourceRefs.map((sourceRef) => String(sourceRef.sourceId)),
                ),
              },
              {
                label: 'model-planning',
                detail: `通过 ${result.trace.provider} provider 生成 ${validated.plan.sceneOutline.length} 张 scene cards；scene 可以引用多个章节。`,
                stage: 'adaptation_planning',
                artifactType: 'adaptation_plan',
              },
            ]
          : [],
      );
      setAdaptationDiagnostics([...result.diagnostics, ...validated.diagnostics]);
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

  const generateWriterDraft = async () => {
    if (!adaptationPlan) {
      return;
    }

    if (generatingRef.current) {
      return;
    }
    generatingRef.current = true;

    setWriterDraft(null);

    const runId = crypto.randomUUID();
    latestRunIdRef.current = runId;
    setIsGeneratingWriter(true);

    try {
      const messages = buildNovelSceneWriterPrompt(workingDocument, adaptationPlan);
      const result = await modelAdapter.call({
        messages,
        stage: 'scene_draft',
        runId,
        structuredOutput: { schemaId: WRITER_SCENE_PATCH_SCHEMA_ID },
      });

      if (result.runId !== latestRunIdRef.current) {
        return;
      }

      if (!result.data) {
        setAdaptationDiagnostics(result.diagnostics);
        setWriterDraft(null);
        setDraftProvider(null);
        return;
      }

      const knownChapterIds = new Set(
        workingDocument.source.type === 'novel'
          ? workingDocument.source.chapters.map((c) => c.id)
          : [],
      );
      const knownCharacterIds = new Set(workingDocument.characters.map((c) => c.id));
      const validated = validateWriterScenePatch(result.data, {
        plan: adaptationPlan,
        knownChapterIds,
        knownCharacterIds,
      });

      if (!validated.patch) {
        setWriterDraft(null);
        setDraftProvider(null);
        setAdaptationDiagnostics([...result.diagnostics, ...validated.diagnostics]);
        return;
      }

      setWriterDraft(validated.patch);
      setDraftProvider(result.trace.provider);
      setAdaptationDiagnostics([...result.diagnostics, ...validated.diagnostics]);
      setExportFeedback('');
    } catch (err) {
      setWriterDraft(null);
      setDraftProvider(null);
      setAdaptationDiagnostics([
        {
          severity: 'error',
          code: 'model_call_rejected',
          message: err instanceof Error ? err.message : 'Model call failed unexpectedly.',
          path: 'model',
        },
      ]);
    } finally {
      generatingRef.current = false;
      setIsGeneratingWriter(false);
    }
  };

  const applyWriterDraft = () => {
    if (!writerDraft) return;

    setScreenplayDocument((prev) => applySceneDrafts(prev, writerDraft));
    setAdaptationTrace((currentTrace) => [
      ...currentTrace.filter((traceStep) => traceStep.artifactType !== 'writer_draft'),
      {
        label: 'model-writing',
        detail: `Writer 生成的 ${writerDraft.scenes.length} 个 scene draft 已通过 validation 并写入剧本初稿。`,
        stage: 'scene_draft',
        artifactType: 'writer_draft',
      },
    ]);
    setWriterDraft(null);
    setExportFeedback('');
    clearSelection();
  };

  const copyYaml = async () => {
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

  const editorWorkspace = (
    <EditorWorkspace
      sceneNavigator={
        <SceneNavigator
          scenes={workingDocument.script.scenes}
          activeIndex={activeSceneIndex}
          onSelect={setActiveSceneIndex}
        />
      }
      scriptEditor={
        <ScriptEditorPanel
          charactersById={charactersById}
          scene={activeScene}
          selectedBlockId={selectedBlockId}
          onEdit={handleEdit}
          onUpdateBlockText={handleUpdateBlockText}
        />
      }
      exportBar={
        <ExportBar
          isReady={exportStatus.isReady}
          errorCount={exportStatus.errorCount}
          warningCount={exportStatus.warningCount}
          feedback={exportFeedback}
          onCopy={copyYaml}
          onDownload={downloadYaml}
        />
      }
    />
  );

  const converterWorkspace = (
    <ConverterWorkspace>
      <SourcePanel
        chapterCount={chapterCount}
        sourceText={sourceText}
        sourceType={workingDocument.source.type}
        onSourceTextChange={updateSourceText}
      />
      <DiagnosticsBand diagnostics={sourceDiagnostics} />

      <AdaptationPreferencesPanel
        preferences={adaptationPreferences}
        onPreferenceChange={updateAdaptationPreference}
        onGenerateOutline={generateSceneOutline}
      />

      <SceneOutlinePanel
        plan={adaptationPlan}
        trace={adaptationTrace}
        isGeneratingWriter={isGeneratingWriter}
        hasDraft={hasWriterDraft}
        isDraftApplied={isDraftApplied}
        onGenerateDraft={generateWriterDraft}
        generationProvider={planProvider!}
      />
      <DiagnosticsBand diagnostics={planDiagnostics} />

      <WriterDraftPanel
        writerDraft={writerDraft}
        isDraftApplied={isDraftApplied}
        onApplyDraft={applyWriterDraft}
        generationProvider={draftProvider!}
      />
      <DiagnosticsBand diagnostics={documentExportDiagnostics} />
    </ConverterWorkspace>
  );

  return (
    <AppShell
      providerType={providerType}
      isProxyAvailable={isProxyAvailable}
      isProbing={isProbing}
      onProviderChange={handleProviderChange}
    >
      <DockLayout
        preset="editor-with-converter"
        left={editorWorkspace}
        right={converterWorkspace}
      />
    </AppShell>
  );
}

export default App;
