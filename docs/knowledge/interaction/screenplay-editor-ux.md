# Screenplay Editor UX

> 最近更新：2026-06-06  
> 状态：Phase 2.5.5b 规划，用于把中央 reading surface 推进为可完成基础打磨流程的语义编辑器。

## 核心目标

2.5.5 已经让中央编辑区像剧本稿。2.5.5b 要让它能完成一轮真实编辑：改场景、改对白、增删块、调整顺序、修正角色和括号提示，并持续更新 YAML / diagnostics。

编辑器仍然编辑 `ScreenplayDocument`，不是编辑 Fountain 文本。UI 可以借用剧本排版，但所有操作都应回写 scene / block / character 等结构化字段。

## 基础编辑流程

目标用户流程：

1. 生成或写入剧本草稿。
2. 在中央 `ScenePage` 阅读当前场景。
3. 点击某个 block 进入 selected / focused 状态。
4. 修改文本、角色、括号提示或场景元数据。
5. 添加、删除、上移、下移或复制 block。
6. 查看右侧 YAML / diagnostics 自动更新。
7. 导出 YAML。

这条流程必须不依赖用户直接编辑 YAML，也不要求用户理解 Fountain 语法。

## 编辑状态

建议区分三种状态：

- `reading`：默认状态。页面像剧本稿，控件最少。
- `selected`：点击 block 外层或工具区后出现轻量 block toolbar。
- `focused`：textarea / select / input 获得焦点，显示稳定编辑 affordance。

状态边界：

- `selectedBlockId` 是 UI state，不进入 `ScreenplayDocument`。
- `focused` 由浏览器焦点管理，不额外写入 document。
- 切换 source text 或重新生成 draft 时应清空 selected block。

## Block Toolbar

block 被 selected 时显示工具条。第一版工具条只做基础编辑，不做复杂 AI 操作。

建议动作：

- Add after：在当前 block 后插入新 block。
- Delete：删除当前 block。
- Move up / Move down：调整当前 scene 内顺序。
- Duplicate：可选，复制当前 block 到下方。
- Type：可选，用菜单把当前 block 转成 action / dialogue / narration / transition / note。

约束：

- 第一个 block 禁用 Move up，最后一个 block 禁用 Move down。
- Delete 至少保留一个 block 时可直接执行；删除最后一个 block 时可以保留空 action 或显示空场景状态。
- 所有操作必须使用 `src/core/screenplay/operations.ts` 中的纯函数，不在组件里手写深层 document mutation。

## Add Block Menu

新增 block 不应永远默认 action。用户需要选择类型：

```text
Action | Dialogue | Narration | Transition | Note
```

默认策略：

- 顶部 Add block：追加到当前 scene 末尾。
- Block toolbar Add after：插到当前 block 后。
- 默认选项可以是 Action，但菜单必须能选择其他类型。

不同类型默认字段：

- Action：`text`
- Dialogue：`characterId`、`parenthetical?`、`text`
- Narration：`voice?`、`text`
- Transition：`text`
- Note：`text`

如果当前没有角色，新增 dialogue 时可以先选择第一个角色、显示角色缺失提示，或引导创建角色；不要生成无效 `characterId`。

## Dialogue Editing

Dialogue block 至少要支持：

- 编辑对白正文。
- 选择已有角色。
- 编辑或清空 `parenthetical`。

第一版可以暂缓新增角色弹窗，但应预留入口。新增角色属于 document-level character registry 操作，不应只存在于 dialogue block 本地状态。

UX 建议：

- 阅读状态下角色名和 parenthetical 保持剧本排版。
- selected 状态下显示角色 selector 和 parenthetical input。
- focused 文本编辑不应造成大幅重排。

## Scene Metadata Editing

场景不是纯标题文本。应支持编辑：

- `scene.title`
- `scene.synopsis`
- `heading.locationType`
- `heading.location`
- `heading.timeOfDay`

第一版可以使用 scene header 内的轻量 edit mode，或一个 compact popover。不要把场景元数据塞进普通 block list。

## Core Operations

2.5.5b 需要补齐核心纯函数，供 UI 调用：

- `insertBlockAfter(document, sceneId, afterBlockId, blockDraft)`
- `appendBlockToScene(document, sceneId, blockDraft)`
- `deleteBlock(document, sceneId, blockId)`
- `moveBlock(document, sceneId, blockId, direction)`
- `duplicateBlock(document, sceneId, blockId)`
- `updateBlockCharacter(document, blockId, characterId)`
- `updateDialogueParenthetical(document, blockId, parenthetical)`
- `updateSceneHeading(document, sceneId, headingPatch)`
- `updateSceneMetadata(document, sceneId, metadataPatch)`

命名可随实现调整，但能力边界应覆盖这些操作。

## Keyboard And Mobile

基础键盘原则：

- Tab 顺序应从 scene header 到 block 文本，再到 block toolbar。
- Toolbar button 必须可键盘触达。
- Delete / move 等破坏性或结构性快捷键可以暂缓，不要先做隐式快捷键。

移动端原则：

- Dialogue 在窄屏下使用更宽的文本列。
- Toolbar 可以折行或进入菜单。
- 不依赖 hover 才能发现关键操作。

## 非目标

2.5.5b 不做：

- 完整 Fountain 文本编辑。
- `contenteditable`。
- 富文本 overlay。
- 多场景 sidebar。
- 拖拽排序。
- 多选 block。
- 复杂 AI 局部重写工具条。
- 完整角色管理面板。

这些能力可以在基础编辑闭环稳定后继续推进。

## 完成标准

- 用户可以完成一次基础剧本打磨：改场景、改 block、加 block、删 block、移动 block、修正 dialogue 角色和括号提示。
- 所有编辑都回写 `ScreenplayDocument`，YAML preview 和 diagnostics 随之更新。
- 中央页面仍保持 Fountain-like reading surface，不退回卡片表单。
- 没有引入 Fountain parser、反解析或 `contenteditable`。
