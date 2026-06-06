import type { Diagnostic } from './diagnostics';
import type { CharacterId, ScreenplayDocument, ScriptBlock, SourceRef } from '../screenplay';

export type ValidateScreenplayDocumentOptions = {
  requireSubmissionReady?: boolean;
  requireChapterText?: boolean;
};

const createDiagnostic = (
  severity: Diagnostic['severity'],
  code: string,
  message: string,
  path: string,
  suggestion?: string,
): Diagnostic => ({
  severity,
  code,
  message,
  path,
  suggestion,
});

const addDuplicateIdDiagnostics = (
  diagnostics: Diagnostic[],
  ids: string[],
  path: string,
  label: string,
) => {
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  ids.forEach((id) => {
    if (seenIds.has(id)) {
      duplicateIds.add(id);
      return;
    }

    seenIds.add(id);
  });

  duplicateIds.forEach((id) => {
    diagnostics.push(createDiagnostic('error', 'duplicate_id', `${label} ID 重复：${id}`, path));
  });
};

const getKnownSourceIds = (document: ScreenplayDocument) => {
  if (document.source.type !== 'novel') {
    return new Set<string>();
  }

  return new Set(document.source.chapters.map((chapter) => chapter.id));
};

const validateSourceRef = (
  diagnostics: Diagnostic[],
  sourceRef: SourceRef,
  knownSourceIds: Set<string>,
  path: string,
) => {
  if (sourceRef.kind === 'chapter' && !knownSourceIds.has(sourceRef.sourceId)) {
    diagnostics.push(
      createDiagnostic(
        'error',
        'missing_source_ref',
        `来源章节不存在：${sourceRef.sourceId}`,
        path,
      ),
    );
  }
};

const validateBlock = (
  diagnostics: Diagnostic[],
  block: ScriptBlock,
  blockPath: string,
  characterIds: Set<CharacterId>,
  knownSourceIds: Set<string>,
) => {
  if (!block.text.trim()) {
    diagnostics.push(
      createDiagnostic('error', 'empty_block_text', '剧本块文本不能为空。', `${blockPath}.text`),
    );
  }

  block.sourceRefs?.forEach((sourceRef, sourceRefIndex) => {
    validateSourceRef(
      diagnostics,
      sourceRef,
      knownSourceIds,
      `${blockPath}.sourceRefs[${sourceRefIndex}]`,
    );
  });

  if (block.type === 'dialogue' && !characterIds.has(block.characterId)) {
    diagnostics.push(
      createDiagnostic(
        'error',
        'missing_dialogue_character',
        `对白角色不存在：${block.characterId}`,
        `${blockPath}.characterId`,
        '先在 characters 中创建该角色，或改用已有 characterId。',
      ),
    );
  }
};

export const validateScreenplayDocument = (
  document: ScreenplayDocument,
  options: ValidateScreenplayDocumentOptions = {},
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  if (document.documentVersion !== '0.1') {
    diagnostics.push(
      createDiagnostic(
        'warning',
        'unknown_document_version',
        `当前 documentVersion 未明确支持：${document.documentVersion}`,
        'documentVersion',
      ),
    );
  }

  if (!document.project.title.trim()) {
    diagnostics.push(
      createDiagnostic('error', 'empty_project_title', '项目标题不能为空。', 'project.title'),
    );
  }

  if (document.source.type === 'novel') {
    if (document.source.chapters.length < 1) {
      diagnostics.push(
        createDiagnostic(
          'error',
          'empty_novel_source',
          '小说来源至少需要 1 个章节。',
          'source.chapters',
        ),
      );
    }

    if (options.requireSubmissionReady && document.source.chapters.length < 3) {
      diagnostics.push(
        createDiagnostic(
          'warning',
          'submission_chapter_count',
          '提交就绪检查建议覆盖 3 个以上章节。',
          'source.chapters',
        ),
      );
    }

    document.source.chapters.forEach((chapter, chapterIndex) => {
      if (!chapter.title.trim()) {
        diagnostics.push(
          createDiagnostic(
            'warning',
            'empty_chapter_title',
            '章节标题为空，可能影响来源追溯。',
            `source.chapters[${chapterIndex}].title`,
          ),
        );
      }

      if (options.requireChapterText && !chapter.text?.trim()) {
        diagnostics.push(
          createDiagnostic(
            'error',
            'empty_chapter_text',
            '章节正文不能为空。',
            `source.chapters[${chapterIndex}].text`,
          ),
        );
      }
    });
  }

  addDuplicateIdDiagnostics(
    diagnostics,
    document.characters.map((character) => character.id),
    'characters',
    '角色',
  );

  const sceneIds = document.script.scenes.map((scene) => scene.id);
  addDuplicateIdDiagnostics(diagnostics, sceneIds, 'script.scenes', '场景');

  if (document.script.structure.type === 'linear' && document.script.scenes.length < 1) {
    diagnostics.push(
      createDiagnostic('error', 'empty_scene_list', '线性剧本至少需要 1 个场景。', 'script.scenes'),
    );
  }

  const characterIds = new Set(document.characters.map((character) => character.id));
  const knownSourceIds = getKnownSourceIds(document);
  const allBlockIds: string[] = [];

  document.script.scenes.forEach((scene, sceneIndex) => {
    const scenePath = `script.scenes[${sceneIndex}]`;

    if (!scene.title.trim()) {
      diagnostics.push(
        createDiagnostic('error', 'empty_scene_title', '场景标题不能为空。', `${scenePath}.title`),
      );
    }

    if (!scene.sourceRefs.length) {
      diagnostics.push(
        createDiagnostic(
          'warning',
          'missing_scene_source_ref',
          '场景没有关联来源章节。',
          `${scenePath}.sourceRefs`,
        ),
      );
    }

    scene.sourceRefs.forEach((sourceRef, sourceRefIndex) => {
      validateSourceRef(
        diagnostics,
        sourceRef,
        knownSourceIds,
        `${scenePath}.sourceRefs[${sourceRefIndex}]`,
      );
    });

    if (!scene.heading.location.trim()) {
      diagnostics.push(
        createDiagnostic(
          'error',
          'empty_scene_location',
          '场景地点不能为空。',
          `${scenePath}.heading.location`,
        ),
      );
    }

    if (!scene.heading.timeOfDay.trim()) {
      diagnostics.push(
        createDiagnostic(
          'error',
          'empty_scene_time',
          '场景时间不能为空。',
          `${scenePath}.heading.timeOfDay`,
        ),
      );
    }

    if (!scene.blocks.length) {
      diagnostics.push(
        createDiagnostic(
          'error',
          'empty_scene_blocks',
          '场景至少需要 1 个剧本块。',
          `${scenePath}.blocks`,
        ),
      );
    }

    scene.blocks.forEach((block, blockIndex) => {
      allBlockIds.push(block.id);
      validateBlock(
        diagnostics,
        block,
        `${scenePath}.blocks[${blockIndex}]`,
        characterIds,
        knownSourceIds,
      );
    });
  });

  addDuplicateIdDiagnostics(diagnostics, allBlockIds, 'script.scenes[].blocks', '剧本块');

  return diagnostics;
};
