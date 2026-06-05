# Validation Knowledge

> 最近更新：2026-06-05

这里记录 AST、输入、projection 和导出器的校验规则。它回答“哪些东西需要被检查，以及错误如何反馈”。

## 当前入口

- `screenplay-ast-validation.md`：输入、AST、改编质量、YAML projection 和导出器能力校验。

## 维护规则

- 校验规则应输出 diagnostics，而不是把错误藏在 UI 或导出器里。
- 阻断性规则和质量提示要分级。
- 导出器只能校验自己的能力范围，不应反向修改 AST。

