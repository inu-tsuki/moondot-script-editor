# Interaction Knowledge

> 最近更新：2026-06-06

这里记录用户操作、编辑体验和 UI 交互语义。它回答“用户怎样和 AST 打交道”。

## 当前入口

- `semantic-block-editing.md`：MVP 主编辑体验是语义块编辑，Fountain-like 是预览/导出投影。
- `screenplay-editor-ux.md`：基础编辑器流程、block toolbar、add block menu、dialogue 和 scene metadata 编辑契约。
- `workbench-layout.md`：已落地的 lightweight workbench 布局、阅读/编辑区域、样式工具和 dock 取舍。

## 维护规则

- 这里描述交互和编辑语义，不放具体组件实现细节。
- 核心数据仍以 `../architecture/screenplay-ast-contract.md` 为准。
- 导出格式细节放 `../export/`。
