import { AlertTriangle, Download, FileText, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import './App.css';

type BlockType = 'action' | 'dialogue' | 'narration' | 'transition' | 'note';

type ScriptBlock = {
  id: string;
  type: BlockType;
  character?: string;
  text: string;
};

const initialSource = `第一章 雨夜重逢
张三在咖啡厅里等一个迟到很多年的人。雨声不断，他以为自己已经忘记那段旧事。

第二章 未寄出的信
李四带来一封没有寄出的信。信里写着当年分开的真相，也写着他们都不愿承认的愧疚。

第三章 月台灯火
两个人在末班车前重新做出选择。城市安静下来，月光落在站台边缘。`;

const initialBlocks: ScriptBlock[] = [
  {
    id: 'blk_001',
    type: 'action',
    text: '雨水顺着咖啡厅的玻璃滑落。张三坐在角落，手指反复摩挲杯沿。',
  },
  {
    id: 'blk_002',
    type: 'dialogue',
    character: '张三',
    text: '你终于来了。',
  },
  {
    id: 'blk_003',
    type: 'narration',
    text: '多年没有出口的那句话，随着雨声一起悬在两人之间。',
  },
];

const blockTypeLabels: Record<BlockType, string> = {
  action: 'ACTION',
  dialogue: 'DIALOGUE',
  narration: 'NARRATION',
  transition: 'TRANSITION',
  note: 'NOTE',
};

function App() {
  const [sourceText, setSourceText] = useState(initialSource);
  const [blocks, setBlocks] = useState(initialBlocks);

  const chapterCount = useMemo(() => {
    const matches = sourceText.match(/(^|\n)\s*(第.{1,9}章|Chapter\s+\d+)/gi);
    return Math.max(matches?.length ?? 0, 1);
  }, [sourceText]);

  const yamlPreview = useMemo(() => {
    const blockYaml = blocks
      .map((block) => {
        const characterLine = block.character
          ? `          characterId: "${block.character}"\n`
          : '';

        return `        - id: "${block.id}"
          type: "${block.type}"
${characterLine}          text: "${block.text.replace(/"/g, '\\"')}"`;
      })
      .join('\n');

    return `schemaVersion: "0.1"
project:
  title: "月点示例剧本"
  language: "zh-CN"
  targetMedium: "short_drama"
  sourceType: "novel"
source:
  chapterCount: ${chapterCount}
script:
  structure:
    type: "linear"
    startSceneId: "scene_001"
  scenes:
    - id: "scene_001"
      sourceChapterIds: ["ch_001"]
      heading:
        locationType: "INT"
        location: "咖啡厅"
        timeOfDay: "夜"
      title: "雨夜重逢"
      blocks:
${blockYaml}`;
  }, [blocks, chapterCount]);

  const addBlock = () => {
    const nextIndex = blocks.length + 1;

    setBlocks((currentBlocks) => [
      ...currentBlocks,
      {
        id: `blk_${String(nextIndex).padStart(3, '0')}`,
        type: 'action',
        text: '新的动作描写。',
      },
    ]);
  };

  const updateBlockText = (id: string, text: string) => {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) => (block.id === id ? { ...block, text } : block)),
    );
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
            <span className="panel-meta">novel · {chapterCount} chapters</span>
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
                <span>novel</span>
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
              <article className="scene-card">
                <div className="scene-heading">
                  <div>
                    <div className="scene-kicker">INT. 咖啡厅 - 夜</div>
                    <div className="scene-title">雨夜重逢</div>
                    <div className="scene-summary">张三和李四多年后在雨夜重逢。</div>
                  </div>
                  <span className="panel-meta">scene_001</span>
                </div>
                <div className="block-list">
                  {blocks.map((block) => (
                    <div className="script-block" key={block.id}>
                      <div className="block-toolbar">
                        <span className="block-type">{blockTypeLabels[block.type]}</span>
                        {block.character ? (
                          <span className="block-character">{block.character}</span>
                        ) : null}
                      </div>
                      <textarea
                        aria-label={`${blockTypeLabels[block.type]} ${block.id}`}
                        className="block-input"
                        value={block.text}
                        onChange={(event) => updateBlockText(block.id, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel panel-output">
          <div className="panel-header">
            <div className="panel-title">
              <Download size={16} />
              YAML Projection
            </div>
            <span className="panel-meta">draft v0.1</span>
          </div>
          <div className="panel-body side-tabs">
            <pre className="yaml-preview">{yamlPreview}</pre>
            <div className="diagnostics">
              <div className="diagnostic">
                <AlertTriangle size={16} />
                <span>
                  {chapterCount >= 3
                    ? '提交样例满足 3+ 章节检查。'
                    : '当前输入少于 3 章，普通转换允许继续。'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
