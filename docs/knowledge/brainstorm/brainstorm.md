**|小说转剧本？**
什么剧本？
 -> 影视剧/短剧 -> 专业剧本渲染和编辑
 -> 视觉小说 -> naninovel，renpy脚本初稿

**|我们做的yaml格式没有让文科作者们自己编辑的能力。**
作者需要在生成剧本后得到编辑能力。

要做：
可视化所见即所得编辑界面
一个底层格式。现在的剧本业界有这个东西吗？
界面由yaml解析？json解析？直接用md写fountain？
如何渲染？
要有agent辅助编辑能力？
既然是做编辑器，能不能把lint和tabs也带进来？

我们的优势：虽然还是demo，但是开始趋近成熟的个人项目 ainovelengine 。
如何用上在ai-novel-engine中的积累？
复用llm和提示词？
参考数据结构建模？

**|他们只是要一个工具，还是要一个具备长文本导入&转换功能的编辑器？**
一个文本转换工具本身的开发周期没法撑起这三天。
编辑器的工作量又有点大，而且不确定是否跑题。

> 但我们不能让工具不可用。没有编剧会盯着yaml代码写作。

**|底层数据的模板要有什么？**

如果要有tabs，那么我们除了常用的关键字，还可以复用人物名字。人物管理可以另外定义。
剧本是分章结构化的，那么数据本身似乎也应该分章结构化？
剧本本身应该有复杂数据吗？直接用fountain不是更合适吗？

Gemini的建议：

我们在常规西方剧本格式中，有：

动作（Action）： 撑满全行，左右不缩进（或者小缩进）。
角色名（Character）： 居中（或居左大幅缩进，通常占总宽度的 40% 位置）。
对白（Dialogue）： 在中间形成一个垂直的窄列（左右各缩进十几字符）。
技术痛点（调研重点）： 汉字配合中文标点（全角）时，在缩进边缘的换行逻辑。你需要写一套精准的 Text wrapping 算法。因为中文标点（如 ，、。、”）不能出现在行首，这在等宽窄列排版中极易导致错位。

通过分析2001太空漫游的公开剧本，我们得到：

宏观叙事层级（Chapters / Parts）：
剧本中出现了 TITLE PART I AFRICA 3,000,000 YEARS AGO 这样的超大结构。现代剧本（尤其是多线叙事、剧集、分章节游戏）非常需要这种宏观的分区标识。

场景编号与版本标记（Scene Numbering & Dating）：
每个场景头部都有编号（如 A1, A2, B4），并且在右侧或右下角带有明确的修改日期（如 10/4/65, 12/7/65）。这是典型的制片追踪版本（Production Draft）。

复合场景行（Composite Scene Headings）：
出现了 A2 INT & EXT CAVES - MOONWATCHER。它同时包含了 INT（内景）和 EXT（外景）。

带有旁白/画外音的特殊节点（Narrator / Voice-Over）：
剧本后半部分有大段的 NARRATOR (con't)。在排版上，角色名居中，对白垂直窄列居中，且括号内的技术标记（如 (con't) 或 (TV)）紧跟其后。

制作批注/未定稿插页（Production Notes）：
剧本中直接包含了工业指示：THE REST OF THIS SEQUENCE (con't) IS BEING WORKED ON NOW BY OUR DESIGNERS...。这不是戏，而是写给特效和设计团队的备忘录。

初步结构构想：

核心数据结构定义 (TypeScript)

1. 全局资产与路由（Global Manifest / Front Matter）
这部分数据决定了剧本的“硬资产”，写盘时会被序列化为文件最顶部的 YAML。

```TypeScript
export interface CharacterAsset {
  id: string;          // 唯一标识，如 "char_moonwatcher"
  name: string;        // 标准影视导出名，如 "MOONWATCHER"
  alias?: string[];    // 别名/简写，用于游戏脚本变量，如 "m"
  avatar?: string;     // 头像/立绘资产路径
  description?: string;// 人物小传
}

export interface GlobalManifest {
  title: string;
  writers: string[];
  version: string;
  // 核心资产字典
  characters: CharacterAsset[];
  variables: Record<string, any>; // 游戏专用的全局变量/Flag（如: { met_floyd: false }）
}
```

2. 剧情网络与节点（Story Graph & Nodes）
对于电影，它是一条直线的数组；对于视觉小说，它是一个有向五环图（DAG）。通过 SceneNode 抹平两者的鸿沟。

```TypeScript
export interface SceneNode {
  id: string;               // 节点 ID，对应游戏中的 label，如 "scene_space_station"
  sceneNumber?: string;     // 影视剧本的场景号（如 "A1"）
  title: string;            // 场景标题（如 "INT. SPACE STATION - DAY"）
  
  // 核心文本内容（原子块流）
  blocks: ScriptBlock[];    
  
  // 现代化制片/游戏逻辑扩展
  meta: {
    background?: string;    // 背景图片资产
    bgm?: string;           // 音效/BGM 资产
    updatedAt: string;      // 版本追踪日期
    estimatedDuration: number; // 智能估算的时长（秒）
  };

  // 路由控制（非线性剧本的核心）
  routing: {
    nextType: 'LINEAR' | 'CHOICE' | 'CONDITIONAL' | 'END';
    defaultNext?: string;   // 线性下一个场景的 Node ID
    choices?: {
      text: string;         // 玩家看到的选项文本
      targetNodeId: string; // 跳转的目标节点 ID
      condition?: string;   // 出现该选项的脚本条件（如 "met_floyd == true"）
    }[];
  };
}

export interface StoryGraph {
  nodes: Record<string, SceneNode>; // 通过字典存储所有场景，极大方便图结构索引
  startNodeId: string;              // 故事的起点
}
```

3. 原子文本块（Script Block / AST Node）
这是富文本编辑器最关心的层级，完全与 Fountain 的语义挂钩。

```TypeScript
export type BlockType = 
  | 'SCENE_HEADING'   // 场景行
  | 'ACTION'          // 动作描写
  | 'CHARACTER'       // 角色名
  | 'DIALOGUE'        // 对白
  | 'PARENTHETICAL'   // 括号神态
  | 'TRANSITION'      // 转场 (如 FADE IN:)
  | 'NOTE'            // 编剧私有批注
  | 'NATIVE_COMMAND'; // 引擎原生代码块（允许硬编码高级 Ren'Py/Naninovel 代码）

export interface ScriptBlock {
  id: string;         // 协作冲突处理(CRDT)的唯一 Key
  type: BlockType;
  text: string;       // 用户输入的纯文本内容
  
  // 影视与游戏的双层映射
  binding?: {
    characterId?: string; // 如果是 DIALOGUE/CHARACTER，绑定到 Manifest 中的角色 ID
    inlineParenthetical?: string; // 中文编剧常用的：角色名 +（神态）+ 对白 结构拆解
  };
}

// 最终组合成完整的编辑器总状态 (Application State)
export interface ScreenplayProject {
  manifest: GlobalManifest;
  graph: StoryGraph;
}
```

编译器的双向转换逻辑（Compilation Logic）
有了这套数据结构，你的编辑器在面对不同端时，核心的逻辑就会变得极度清爽。

导出时：代码生成器（Code Generator）的基本伪代码
1. 编译为标准的 .fountain 文本（影视/写盘保存）
遍历 graph.nodes，如果是线性项目，按照逻辑顺序输出：

```TypeScript
function compileToFountain(project: ScreenplayProject): string {
  let output = `---\n${yaml.stringify(project.manifest)}---\n\n`; // 塞入 YAML
  
  for (const node of getLinearNodes(project.graph)) {
    output += `\n.${node.title}\n\n`; // 场景行
    for (const block of node.blocks) {
      if (block.type === 'CHARACTER') output += block.text.toUpperCase() + '\n';
      if (block.type === 'DIALOGUE') output += block.text + '\n\n';
      // ... 依次按 Fountain 规范拼接
    }
  }
  return output;
}
```

2. 编译为 Ren'Py 脚本（视觉小说游戏）

```TypeScript
function compileToRenpy(project: ScreenplayProject): string {
  let output = "";
  // 1. 将 Manifest 中的角色声明为 Ren'Py 变量
  for (const char of project.manifest.characters) {
    output += `define ${char.alias || char.id} = Character("${char.name}")\n`;
  }
  
  // 2. 遍历图节点，生成 label 和 menu
  for (const [id, node] of Object.entries(project.graph.nodes)) {
    output += `\nlabel ${id}:\n`;
    if (node.meta.background) output += `    scene bg ${node.meta.background}\n`;
    
    for (const block of node.blocks) {
      if (block.type === 'DIALOGUE') {
        output += `    ${block.binding?.characterId} "${block.text}"\n`;
      }
    }
    
    // 3. 处理分支选项
    if (node.routing.nextType === 'CHOICE') {
      output += `    menu:\n`;
      for (const choice of node.routing.choices) {
        output += `        "${choice.text}":\n            jump ${choice.targetNodeId}\n`;
      }
    }
  }
  return output;
}
```

根据这份建议 -> fountain很好，但是fountain不够。我们需要让剧本看上去很fountain，但底层有更多的控制来让中文也能适应剧本生态。

结论： 我们底层用ast存储剧本，导出时使用yaml+fountain。面对视觉小说写作，我们可以一键导出renpy脚本或naninovel脚本。面对影视和短剧，我们直接用fountain或中式老格式渲染成word导出即可。

**|架构原则是？**

> 小工具拼成大系统

可以做成一个处处分散（编辑器，导入&转换&导出，资产管理，卡片墙……），通过插件式组合在一起的架构？核心是谁呢？它的ui怎么做？“编译”（即从ast渲染）怎么做呢？

**|怎么选型？**

需要：模型调用，语法解析，“DSL编译”，编辑器体验……不同的领域加起来，适合怎么选型？或者说不同的领域本身就需要不同的选型？

版本控制？

-> 已沉淀到 `../architecture/version-control-direction.md`，长期放在 workspace / project 外层，不进入当前 `ScreenplayDocument` MVP。
