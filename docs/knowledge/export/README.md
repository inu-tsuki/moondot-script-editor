# Export Knowledge

> 最近更新：2026-06-05

这里记录 `ScreenplayDocument` 到外部格式的导出投影。它回答“如何把内部 document 展示或导出成某种目标格式”。

## 当前入口

- `fountain-like-projection.md`：基于 Fountain 官方语法的剧本阅读/导出投影。

## 维护规则

- 所有导出器都从 `ScreenplayDocument` 出发，必要时只读取其中的 `script: ScreenplayAst`。
- 导出器不能反向决定 document 结构。
- YAML 官方提交格式的字段定义放在 `../schema/`，这里放非 YAML 的阅读和导出目标。
