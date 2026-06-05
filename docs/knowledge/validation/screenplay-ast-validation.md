# Screenplay AST Validation

> 最近更新：2026-06-05  
> 状态：草案 v0.1。

## 为什么需要校验层

校验层不是为了把作者挡在外面，而是为了保护 AST 这条主链路。

本项目有几个天然不稳定源：

- 小说输入可能没有清晰章节。
- LLM 输出可能缺字段、错字段、重复 ID、引用不存在的角色。
- 用户编辑可能删掉必要结构。
- YAML 序列化可能被中文标点、空值和嵌套结构影响。
- 可选导出器可能只支持 AST 的一部分。

因此校验层要在每个关键边界把问题变成 diagnostics，而不是让错误在 demo 时变成空白页面、坏 YAML 或不可解释的模型失败。

## 输入校验

- 小说文本不能为空。
- 普通转换模式下，章节数至少为 1。
- 提交就绪 / demo 检查模式下，应覆盖 3 个以上章节，以证明长文本解析和多章节改编能力。
- 章节标题不能全为空。
- 章节正文不能全为空。
- 如果自动分章失败，应提示用户手动分章。

## AST 结构校验

- `schemaVersion` / `project` / `source` / `characters` / `script` 必须存在。
- `scene.id`、`block.id`、`character.id` 在各自作用域内必须唯一。
- `script.structure.startSceneId` 必须指向存在的 scene。
- `scene.nextSceneId` 如果存在，必须指向存在的 scene。
- 每个 scene 必须有 heading、title、blocks。
- 每个 block 必须有 type 和 text。
- `dialogue.characterId` 如果存在，必须指向存在的 character。

## 改编质量校验

这些不一定阻止导出，但应产生 warning：

- scene 没有关联任何来源章节。
- 角色表为空，但对白块出现了角色名。
- 大量 narration/action 直接复制小说心理描写，没有转成可拍/可演内容。
- 连续多个 scene 没有对白或没有动作，可能像摘要而不是剧本。
- 生成结果明显少于输入章节覆盖范围。

## YAML Projection 校验

- AST 能成功序列化为 YAML。
- YAML 能被重新解析为对象。
- 字符串字段中的中文冒号、引号、破折号不会破坏 YAML。
- YAML projection 不应丢掉官方要求相关字段，例如章节映射、场景、角色、剧本块。

## 导出器能力校验

每个导出器只校验自己的能力范围：

- YAML exporter：要求完整 AST。
- Fountain-like exporter：要求线性 scene 顺序、scene heading、action/dialogue/narration 等基础块。
- Ren'Py sample exporter：要求 character alias 或可生成变量名。

导出器不应该反向要求 AST 为自己改变形状。

## Diagnostic 分级

- `error`：阻止当前步骤继续，例如文本为空、scene 引用不存在、YAML 无法序列化。
- `warning`：允许继续，但影响质量或评审表达，例如当前样例少于 3 章、角色表为空、某章未覆盖。
- `info`：提示用户可优化，例如建议补充场景标题、添加人物小传。

## 关于 3+ 章节

官方题目要求的是“能将 3 个章节以上的小说文本自动转换”，这表示能力门槛，不表示工具只能处理 3 个以上章节。

因此：

- 工具应允许用户用 1 章或 2 章进行快速试跑。
- 如果当前输入少于 3 章，普通模式给 warning，不阻止生成。
- 提交就绪检查和 demo 样例必须使用 3 个以上章节。
- README 和 demo 视频应明确展示 3+ 章节输入。

## 实现目标

第一版实现：

```text
validateScreenplayAst(ast) -> Diagnostic[]
```

Diagnostic 应包含：

- `severity`
- `code`
- `message`
- `path`
- 可选 `suggestion`
