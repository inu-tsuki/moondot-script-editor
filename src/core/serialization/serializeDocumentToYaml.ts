import type { NovelSource, ScreenplayDocument, ScriptBlock, SourceBundle } from '../screenplay';

export type SerializeDocumentToYamlOptions = {
  generatedAt?: string;
};

const normalizeYamlScalarString = (value: string) => value.replace(/\r\n?/g, '\n');

const escapeYamlString = (value: string) =>
  normalizeYamlScalarString(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

const yamlString = (value: string) => `"${escapeYamlString(value)}"`;

const yamlNullableString = (value: string | undefined) => (value ? yamlString(value) : 'null');

const yamlStringList = (values: string[]) =>
  values.length > 0 ? `[${values.map(yamlString).join(', ')}]` : '[]';

const isNovelSource = (source: SourceBundle): source is NovelSource => source.type === 'novel';

const serializeSource = (source: SourceBundle) => {
  if (!isNovelSource(source)) {
    return `source:
  type: ${yamlString(source.type)}`;
  }

  if (!source.chapters.length) {
    return `source:
  chapterCount: 0
  chapters: []`;
  }

  const chapters = source.chapters
    .map(
      (chapter) => `    - id: ${yamlString(chapter.id)}
      title: ${yamlString(chapter.title)}
      summary: ${yamlString(chapter.summary ?? '')}`,
    )
    .join('\n');

  return `source:
  chapterCount: ${source.chapters.length}
  chapters:
${chapters}`;
};

const serializeCharacters = (document: ScreenplayDocument) => {
  if (!document.characters.length) {
    return 'characters: []';
  }

  return `characters:
${document.characters
  .map(
    (character) => `  - id: ${yamlString(character.id)}
    name: ${yamlString(character.name)}
    aliases: ${yamlStringList(character.aliases)}
    description: ${yamlString(character.description ?? '')}`,
  )
  .join('\n')}`;
};

const serializeBlock = (block: ScriptBlock) => {
  const characterLine =
    block.type === 'dialogue' ? `\n          characterId: ${yamlString(block.characterId)}` : '';
  const parentheticalLine =
    block.type === 'dialogue' && block.parenthetical
      ? `\n          parenthetical: ${yamlString(block.parenthetical)}`
      : '';
  const voiceLine =
    block.type === 'narration' && block.voice
      ? `\n          voice: ${yamlString(block.voice)}`
      : '';

  return `        - id: ${yamlString(block.id)}
          type: ${yamlString(block.type)}${characterLine}${parentheticalLine}${voiceLine}
          text: ${yamlString(block.text)}`;
};

const serializeScenes = (document: ScreenplayDocument) => {
  if (!document.script.scenes.length) {
    return '  scenes: []';
  }

  return `  scenes:
${document.script.scenes
  .map((scene, sceneIndex) => {
    const nextScene = document.script.scenes[sceneIndex + 1];
    const sourceChapterIds = scene.sourceRefs
      .filter((sourceRef) => sourceRef.kind === 'chapter')
      .map((sourceRef) => sourceRef.sourceId);
    const blockSection = scene.blocks.length
      ? `      blocks:
${scene.blocks.map(serializeBlock).join('\n')}`
      : '      blocks: []';

    return `    - id: ${yamlString(scene.id)}
      sourceChapterIds: ${yamlStringList(sourceChapterIds)}
      heading:
        locationType: ${yamlString(scene.heading.locationType)}
        location: ${yamlString(scene.heading.location)}
        timeOfDay: ${yamlString(scene.heading.timeOfDay)}
      title: ${yamlString(scene.title)}
      synopsis: ${yamlString(scene.synopsis ?? '')}
${blockSection}
      nextSceneId: ${yamlNullableString(nextScene?.id)}`;
  })
  .join('\n')}`;
};

export const serializeDocumentToYaml = (
  document: ScreenplayDocument,
  options: SerializeDocumentToYamlOptions = {},
) => {
  const generatedAt =
    options.generatedAt ??
    document.project.updatedAt ??
    document.project.createdAt ??
    new Date().toISOString();
  const startSceneId = document.script.scenes[0]?.id;

  return `schemaVersion: "0.1"
project:
  title: ${yamlString(document.project.title)}
  language: ${yamlString(document.project.language)}
  targetMedium: ${yamlString(document.project.targetMedium)}
  sourceType: ${yamlString(document.source.type)}
  generatedAt: ${yamlString(generatedAt)}
${serializeSource(document.source)}
${serializeCharacters(document)}
script:
  structure:
    type: ${yamlString(document.script.structure.type)}
    startSceneId: ${yamlNullableString(startSceneId)}
${serializeScenes(document)}`;
};
