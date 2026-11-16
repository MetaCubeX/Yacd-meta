import { atomWithStorage } from 'jotai/utils';

export type EmojiFont = 'system' | 'twemoji';

// getOnInit：首次读取就同步拿到 localStorage 里的值，首屏不会先按默认字体排一遍再跳

/** 面板字体的字体名，空串表示用系统界面字体 */
export const uiFontAtom = atomWithStorage<string>('uiFont', '', undefined, { getOnInit: true });

export const emojiFontAtom = atomWithStorage<EmojiFont>('emojiFont', 'system', undefined, {
  getOnInit: true,
});
