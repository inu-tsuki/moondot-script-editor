import type { ScreenplayDocument } from './types';

export const demoNovelText = `第一章 雨夜重逢
张三在咖啡厅里等一个迟到很多年的人。雨声不断，他以为自己已经忘记那段旧事。

第二章 未寄出的信
李四带来一封没有寄出的信。信里写着当年分开的真相，也写着他们都不愿承认的愧疚。

第三章 月台灯火
两个人在末班车前重新做出选择。城市安静下来，月光落在站台边缘。`;

export const demoScreenplayDocument: ScreenplayDocument = {
  documentVersion: '0.1',
  project: {
    id: 'project_demo',
    title: '月点示例剧本',
    language: 'zh-CN',
    targetMedium: 'short_drama',
  },
  source: {
    type: 'novel',
    title: '雨夜重逢',
    chapters: [
      {
        id: 'ch_001',
        index: 1,
        title: '雨夜重逢',
        summary: '张三在咖啡厅等待多年未见的人，旧事随着雨声重新浮现。',
        text: '张三在咖啡厅里等一个迟到很多年的人。雨声不断，他以为自己已经忘记那段旧事。',
      },
      {
        id: 'ch_002',
        index: 2,
        title: '未寄出的信',
        summary: '李四带来未寄出的信，揭开当年分别的真相和两人的愧疚。',
        text: '李四带来一封没有寄出的信。信里写着当年分开的真相，也写着他们都不愿承认的愧疚。',
      },
      {
        id: 'ch_003',
        index: 3,
        title: '月台灯火',
        summary: '两人在末班车前重新选择彼此，月光落在安静的站台边缘。',
        text: '两个人在末班车前重新做出选择。城市安静下来，月光落在站台边缘。',
      },
    ],
  },
  characters: [
    {
      id: 'char_zhangsan',
      name: '张三',
      aliases: ['老张'],
      description: '习惯把情绪藏进沉默里的旧友。',
      tags: ['protagonist'],
    },
    {
      id: 'char_lisi',
      name: '李四',
      aliases: ['小李'],
      description: '带着迟到多年真相回到雨夜的人。',
      tags: ['deuteragonist'],
    },
  ],
  script: {
    structure: {
      type: 'linear',
    },
    scenes: [
      {
        id: 'scene_001',
        title: '雨夜重逢',
        synopsis: '张三和李四多年后在雨夜重逢。',
        sourceRefs: [
          {
            kind: 'chapter',
            sourceId: 'ch_001',
          },
        ],
        heading: {
          locationType: 'INT',
          location: '咖啡厅',
          timeOfDay: '夜',
        },
        blocks: [
          {
            id: 'blk_001',
            type: 'action',
            text: '雨水顺着咖啡厅的玻璃滑落。张三坐在角落，手指反复摩挲杯沿。',
            sourceRefs: [
              {
                kind: 'chapter',
                sourceId: 'ch_001',
              },
            ],
          },
          {
            id: 'blk_002',
            type: 'dialogue',
            characterId: 'char_zhangsan',
            text: '你终于来了。',
            sourceRefs: [
              {
                kind: 'chapter',
                sourceId: 'ch_001',
              },
            ],
          },
          {
            id: 'blk_003',
            type: 'narration',
            text: '多年没有出口的那句话，随着雨声一起悬在两人之间。',
            sourceRefs: [
              {
                kind: 'chapter',
                sourceId: 'ch_001',
              },
            ],
          },
        ],
      },
    ],
  },
};
