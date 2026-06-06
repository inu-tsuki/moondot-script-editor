import { AlertTriangle, Download, FileText, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import './App.css';
import { adaptNovelToScreenplayMock } from './core/adaptation';
import { serializeDocumentToYaml } from './core/serialization';
import {
  appendBlockToFirstScene,
  demoNovelText,
  demoScreenplayDocument,
  formatSceneHeading,
  getBlockCharacterId,
  updateBlockText as updateDocumentBlockText,
} from './core/screenplay';
import { parseNovelChapters } from './core/source-ingestion';
import { validateScreenplayDocument } from './core/validation';
import type { BlockId, ScreenplayDocument, ScriptBlock } from './core/screenplay';
import type { Diagnostic } from './core/validation';

const blockTypeLabels: Record<ScriptBlock['type'], string> = {
  action: 'ACTION',
  dialogue: 'DIALOGUE',
  narration: 'NARRATION',
  transition: 'TRANSITION',
  note: 'NOTE',
};

function App() {
  const [sourceText, setSourceText] = useState(demoNovelText);
  const [generatedAt] = useState(() => new Date().toISOString());
  const [screenplayDocument, setScreenplayDocument] =
    useState<ScreenplayDocument>(demoScreenplayDocument);
  const [adaptationDiagnostics, setAdaptationDiagnostics] = useState<Diagnostic[]>([]);

  const parsedNovel = useMemo(() => parseNovelChapters(sourceText), [sourceText]);
  const workingDocument = useMemo<ScreenplayDocument>(
    () => ({
      ...screenplayDocument,
      source: {
        type: 'novel',
        title:
          screenplayDocument.source.type === 'novel'
            ? screenplayDocument.source.title
            : screenplayDocument.project.title,
        chapters: parsedNovel.chapters,
      },
    }),
    [parsedNovel.chapters, screenplayDocument],
  );
  const activeScene = workingDocument.script.scenes[0];
  const chapterCount = parsedNovel.chapters.length;

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
      ...parsedNovel.diagnostics,
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
  };

  const generateScreenplay = () => {
    const adaptationResult = adaptNovelToScreenplayMock({ document: workingDocument });

    setScreenplayDocument(adaptationResult.document);
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
