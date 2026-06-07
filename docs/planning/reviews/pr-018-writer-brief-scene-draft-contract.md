# PR: WriterBrief and Scene Draft Contract（Phase 3.3）

> 最近更新：2026-06-07
> 对应分支：`feat/phase3.3-writer-contract-planning`
> 对应阶段：Phase 3.3 `WriterBrief and scene draft contract`

## 结论

方向正确：3.3 已经把 Writer stage 从直接返回完整 `ScreenplayDocument` 收窄为 `WriterScenePatch`，新增 Zod schema、`WRITER_SCENE_PATCH_SCHEMA_ID`、app-side validator 和 `applySceneDrafts()` 写回 operation。`ModelStagePayloadMap.scene_draft` 也已经改为 `WriterScenePatch`，符合前一轮规划里“模型产物不能直接污染 document”的主线。

当前剩余问题集中在 Writer patch validation 的语义完整性：若 `validateWriterScenePatch()` 返回 patch，`App.tsx` 会立即调用 `applySceneDrafts()` 并替换整个 `script.scenes`。因此 validator 必须保证“通过的 patch 写回后仍是可信 document”。目前有三处缝隙会让坏 patch 通过，或者让已确认的 outline 静默丢场。

## Findings

### Active Medium：Writer patch 可漏写或重复 sceneCard，仍会整表替换剧本场景

位置：`src/core/adaptation/validate-writer-scene-patch.ts:89`、`src/core/adaptation/apply-scene-drafts.ts:22`

`validateWriterScenePatch()` 目前只检查每个 `draft.sceneCardId` 是否存在于 `plan.sceneOutline`。它没有校验 patch 是否完整覆盖当前 plan，也没有拒绝重复 `sceneCardId`。

但 `applySceneDrafts()` 会把 `patch.scenes` 直接 map 成新的 `script.scenes`，并替换掉整个 `document.script.scenes`。这意味着模型返回以下 patch 都会通过 validation 并写入 document：

- 少一个 scene card：确认过的 outline 中某一场戏会静默消失。
- 重复同一个 scene card：剧本中会出现重复场景，同时另一个 scene card 被挤掉。
- 只返回 1 个合法 scene draft：只要 `sceneCardId` 存在，整份剧本就会被替换成 1 场。

建议：

- 在 semantic validation 中要求 patch sceneCardId 与 `plan.sceneOutline.map(card => card.id)` 做 set equality。
- 对重复 sceneCardId 返回 `duplicate_scene_card_id`。
- 对缺失 sceneCardId 返回 `missing_scene_card_draft`。
- 补 validator 测试：少一场、重复一场、多余未知场三类都应失败。
- 如果未来想支持 partial patch，应改 `applySceneDrafts()` 为按 `sceneCardId` merge，而不是整表替换；当前实现语义更像 full patch。

### Active Medium：未知 dialogue character 只是 warning，但会写入无效 document

位置：`src/core/adaptation/validate-writer-scene-patch.ts:131`、`src/App.tsx:430`

`validateWriterScenePatch()` 发现 dialogue block 引用未知 `characterId` 时只 push `unknown_character_ref` warning，然后仍返回有效 `patch`。`App.tsx` 随后会调用 `applySceneDrafts()` 写入 document。

这会把 invalid dialogue reference 写进 `ScreenplayDocument`。`validateScreenplayDocument()` 对同类问题会报 `missing_dialogue_character` error，因此这里会出现一个不一致：Writer patch validation 认为可以写回，document validation 写回后才报错。

如果 Phase 3.3 的目标是“Writer 输出可验证、可回写 document”，unknown character 应该在 patch validation 阶段就是 semantic failure，除非同一 patch 明确定义了可应用的角色创建/更新 contract。

建议：

- 当前 3.3 内先把 unknown dialogue character 从 warning 升级为 fatal semantic failure。
- 或者扩展 `characterUpdates` 为结构化角色 patch，并在 `applySceneDrafts()` 同步写入角色表；但这会扩大 3.3 scope。
- 补测试：unknown dialogue character 时 `result.patch === null`，`error.reason === 'semantic'`。

### Active Medium：block-level `sourceRefs` 没有做 known chapter 语义校验

位置：`src/core/adaptation/validate-writer-scene-patch.ts:112`、`src/core/adaptation/apply-scene-drafts.ts:28`

validator 只检查 scene-level `draft.sourceRefs` 是否引用已知章节。`SceneBlockDraft.sourceRefs` 只经过 Zod 形状校验，没有检查 `sourceId` 是否存在于当前 source chapters。

`applySceneDrafts()` 会把 block draft 原样展开为 `ScriptBlock`。因此一个 block-level `{ kind: 'chapter', sourceId: 'ch_unknown' }` 可以通过 Writer patch validation，再由 document validation 延后报 `missing_source_ref`。这破坏了 “validated Writer patch can be safely applied” 的边界。

建议：

- 提取 `validateChapterSourceRefs()`，同时用于 scene-level 和 block-level sourceRefs。
- 对 block-level unknown chapter 返回 semantic failure，path 指到 `writerScenePatch.scenes[i].blocks[k].sourceRefs[j].sourceId`。
- 补测试：block sourceRef unknown chapter 应失败。

### Low：Writer prompt 有中文引号 typo

位置：`src/core/adaptation/buildNovelAdaptationPrompt.ts:140`

当前 system prompt 第一行是 `你是”月点”的 Lead Screenwriter...`，左引号误写成右引号。它不影响 runtime contract，但会让 prompt 文案显得不够干净。

建议：改成 `你是“月点”的 Lead Screenwriter...`。

## Verification

本轮审查已运行：

```sh
pnpm lint
pnpm test
pnpm build
git diff --check main...HEAD
```

结果：

- `pnpm lint` passed。
- `pnpm test` passed：8 files / 81 tests。
- `pnpm build` passed。
- `git diff --check main...HEAD` clean。

## Test Gap

现有 Writer patch 测试已经覆盖 Zod schema、planId mismatch、unknown sceneCardId、scene-level unknown sourceRef、unknown character warning 和 schema failure。

建议补充：

- `validateWriterScenePatch()` 拒绝缺失 scene card draft。
- `validateWriterScenePatch()` 拒绝重复 sceneCardId。
- `validateWriterScenePatch()` 拒绝 block-level unknown sourceRef。
- unknown dialogue character 改为 fatal 后的 semantic failure 测试。
- `applySceneDrafts()` 的最小测试：validated full patch 写回后 scene 数量与 patch / plan 一致，且 block ids 由本地 operation 分配。

## 后续动作

- 先修复三处 Active Medium，再继续 Phase 3.4 local proxy。
- 不建议在本轮扩大到角色创建 patch；若需要支持 Writer 新增角色，应单独规划 `CharacterPatch` contract。
