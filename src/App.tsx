import { FileText, Layout } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  defaultAdaptationPreferences,
  draftNovelAdaptationFromPlanMock,
  planNovelAdaptationMock,
} from './core/adaptation';
import { serializeDocumentToYaml } from './core/serialization';
import {
  appendBlockToFirstScene,
  demoNovelText,
  demoScreenplayDocument,
  updateBlockText as updateDocumentBlockText,
} from './core/screenplay';
import { parseNovelChapters, withParsedNovelChapters } from './core/source-ingestion';
import { validateScreenplayDocument } from './core/validation';
import type {
  AdaptationPlan,
  AdaptationPreferences,
  NovelAdaptationTraceStep,
} from './core/adaptation';
import type { BlockId, ScreenplayDocument } from './core/screenplay';
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
  const isCurrentPlanDrafted = adaptationTrace.some(
    (traceStep) => traceStep.artifactType === 'writer_draft',
  );

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

  const addBlock = () => {
    setScreenplayDocument((currentDocument) => appendBlockToFirstScene(currentDocument));
    setExportFeedback('');
  };

  const updateBlockText = (id: BlockId, text: string) => {
    setScreenplayDocument((currentDocument) => updateDocumentBlockText(currentDocument, id, text));
    setExportFeedback('');
  };

  const updateSourceText = (text: string) => {
    setSourceText(text);
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setExportFeedback('');
  };

  const clearAdaptationRun = () => {
    setAdaptationDiagnostics([]);
    setAdaptationPlan(undefined);
    setAdaptationTrace([]);
    setExportFeedback('');
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

  const generateSceneOutline = () => {
    const adaptationResult = planNovelAdaptationMock({
      document: workingDocument,
      preferences: adaptationPreferences,
    });

    setAdaptationPlan(adaptationResult.plan);
    setAdaptationTrace(adaptationResult.trace);
    setAdaptationDiagnostics(adaptationResult.diagnostics);
    setExportFeedback('');
  };

  const confirmSceneOutline = () => {
    if (!adaptationPlan) {
      return;
    }

    const adaptationResult = draftNovelAdaptationFromPlanMock({
      document: workingDocument,
      plan: adaptationPlan,
    });

    setScreenplayDocument(adaptationResult.document);
    setAdaptationTrace((currentTrace) => [
      ...currentTrace.filter((traceStep) => traceStep.artifactType !== 'writer_draft'),
      ...adaptationResult.trace,
    ]);
    setAdaptationDiagnostics(adaptationResult.diagnostics);
    setExportFeedback('');
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
            onAddBlock={addBlock}
            onUpdateBlockText={updateBlockText}
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
