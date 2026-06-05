export type ProjectId = `project_${string}`;
export type ChapterId = `ch_${string}`;
export type CharacterId = `char_${string}`;
export type SceneId = `scene_${string}`;
export type BlockId = `blk_${string}`;

export type LanguageCode = 'zh-CN';

export type TargetMedium = 'screenplay' | 'short_drama' | 'visual_novel';

export type ScreenplayDocument = {
  documentVersion: '0.1';
  project: ScreenplayProject;
  source: SourceBundle;
  characters: CharacterProfile[];
  script: ScreenplayAst;
};

export type ScreenplayProject = {
  id: ProjectId;
  title: string;
  language: LanguageCode;
  targetMedium: TargetMedium;
  createdAt?: string;
  updatedAt?: string;
};

export type SourceBundle = NovelSource | InspirationSeedSource | OutlineSource | WorldBibleSource;

export type NovelSource = {
  type: 'novel';
  title?: string;
  chapters: SourceChapter[];
};

export type SourceChapter = {
  id: ChapterId;
  index: number;
  title: string;
  summary?: string;
  text?: string;
};

export type InspirationSeedSource = {
  type: 'inspiration_seed';
  prompt: string;
  keywords?: string[];
};

export type OutlineSource = {
  type: 'outline';
  outline: string;
};

export type WorldBibleSource = {
  type: 'world_bible';
  title?: string;
  summary: string;
};

export type CharacterProfile = {
  id: CharacterId;
  name: string;
  aliases: string[];
  description?: string;
  tags?: string[];
};

export type ScreenplayAst = {
  structure: ScriptStructure;
  scenes: SceneNode[];
};

export type ScriptStructure = {
  type: 'linear';
};

export type SceneNode = {
  id: SceneId;
  title: string;
  synopsis?: string;
  sourceRefs: SourceRef[];
  heading: SceneHeading;
  blocks: ScriptBlock[];
};

export type SceneHeading = {
  locationType: 'INT' | 'EXT' | 'INT_EXT';
  location: string;
  timeOfDay: string;
};

export type SourceRef = {
  sourceId: ChapterId | string;
  kind: 'chapter' | 'seed' | 'outline' | 'world_bible';
};

export type ScriptBlock =
  | ActionBlock
  | DialogueBlock
  | NarrationBlock
  | TransitionBlock
  | NoteBlock;

export type BaseBlock = {
  id: BlockId;
  sourceRefs?: SourceRef[];
};

export type ActionBlock = BaseBlock & {
  type: 'action';
  text: string;
};

export type DialogueBlock = BaseBlock & {
  type: 'dialogue';
  characterId: CharacterId;
  parenthetical?: string;
  text: string;
};

export type NarrationBlock = BaseBlock & {
  type: 'narration';
  voice?: 'voice_over' | 'off_screen' | 'narrator';
  text: string;
};

export type TransitionBlock = BaseBlock & {
  type: 'transition';
  text: string;
};

export type NoteBlock = BaseBlock & {
  type: 'note';
  text: string;
};
