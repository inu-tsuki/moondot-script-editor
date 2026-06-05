import { AlertTriangle, Download, FileText, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import './App.css';
import { serializeDocumentToYaml } from './core/serialization';
import { demoNovelText, demoScreenplayDocument } from './core/screenplay';
import { validateScreenplayDocument } from './core/validation';
import type { BlockId, CharacterId, ScreenplayDocument, ScriptBlock } from './core/screenplay';
import type { Diagnostic } from './core/validation';

const blockTypeLabels: Record<ScriptBlock['type'], string> = {
  action: 'ACTION',
  dialogue: 'DIALOGUE',
  narration: 'NARRATION',
  transition: 'TRANSITION',
  note: 'NOTE',
};

const locationTypeLabels: Record<
  ScreenplayDocument['script']['scenes'][number]['heading']['locationType'],
  string
> = {
  INT: 'INT',
  EXT: 'EXT',
  INT_EXT: 'INT/EXT',
};

const countChaptersInText = (sourceText: string) => {
  if (!sourceText.trim()) {
    return 0;
  }

  const matches = sourceText.match(/(^|\n)\s*(第.{1,9}章|Chapter\s+\d+)/gi);

  return Math.max(matches?.length ?? 0, 1);
};

const createNextBlockId = (blocks: ScriptBlock[]): BlockId =>
  `blk_${String(blocks.length + 1).padStart(3, '0')}` as BlockId;

const getBlockCharacterId = (block: ScriptBlock): CharacterId | undefined =>
  block.type === 'dialogue' ? block.characterId : undefined;

const formatSceneHeading = (heading: ScreenplayDocument['script']['scenes'][number]['heading']) =>
  `${locationTypeLabels[heading.locationType]}. ${heading.location} - ${heading.timeOfDay}`;

function App() {
  const [sourceText, setSourceText] = useState(demoNovelText);
  const [generatedAt] = useState(() => new Date().toISOString());
  const [screenplayDocument, setScreenplayDocument] =
    useState<ScreenplayDocument>(demoScreenplayDocument);

  const activeScene = screenplayDocument.script.scenes[0];
  const chapterCount = countChaptersInText(sourceText);

  const charactersById = useMemo(
    () => new Map(screenplayDocument.characters.map((character) => [character.id, character])),
    [screenplayDocument.characters],
  );
  const documentDiagnostics = useMemo(
    () =>
      validateScreenplayDocument(screenplayDocument, {
        requireChapterText: true,
        requireSubmissionReady: true,
      }),
    [screenplayDocument],
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
      ...documentDiagnostics,
    ],
    [chapterCount, documentDiagnostics, sourceText],
  );

  const yamlPreview = useMemo(
    () => serializeDocumentToYaml(screenplayDocument, { generatedAt }),
    [generatedAt, screenplayDocument],
  );

  const addBlock = () => {
    setScreenplayDocument((currentDocument) => {
      const scene = currentDocument.script.scenes[0];

      if (!scene) {
        return currentDocument;
      }

      const nextBlock: ScriptBlock = {
        id: createNextBlockId(scene.blocks),
        type: 'action',
        text: '新的动作描写。',
      };

      return {
        ...currentDocument,
        script: {
          ...currentDocument.script,
          scenes: currentDocument.script.scenes.map((currentScene) =>
            currentScene.id === scene.id
              ? {
                  ...currentScene,
                  blocks: [...currentScene.blocks, nextBlock],
                }
              : currentScene,
          ),
        },
      };
    });
  };

  const updateBlockText = (id: BlockId, text: string) => {
    setScreenplayDocument((currentDocument) => ({
      ...currentDocument,
      script: {
        ...currentDocument.script,
        scenes: currentDocument.script.scenes.map((scene) => ({
          ...scene,
          blocks: scene.blocks.map((block) => (block.id === id ? { ...block, text } : block)),
        })),
      },
    }));
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
          <button className="button-primary" type="button" title="生成剧本">
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
              {screenplayDocument.source.type} · {chapterCount} chapters
            </span>
          </div>
          <div className="panel-body">
            <textarea
              aria-label="小说来源文本"
              className="source-textarea"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
            />
            <div className="chapter-strip" aria-label="章节识别结果">
              <div className="chapter-pill">
                <span>sourceType</span>
                <span>{screenplayDocument.source.type}</span>
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
            <span className="panel-meta">document v{screenplayDocument.documentVersion}</span>
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
