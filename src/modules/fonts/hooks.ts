import { useAtom, useAtomValue } from 'jotai';
import { useLayoutEffect, useMemo } from 'react';

import { emojiFontAtom, uiFontAtom } from '~/store/fonts';

import { applyFontSettings, isFontInstalled } from './utils';

/**
 * useApplyFontSettings 让 <html> 上的字体设置跟着 atom 走。只在应用根部调用一次。
 * 用 layout effect 是为了在首次绘制前写好，避免先按系统字体画一帧。
 */
export function useApplyFontSettings() {
  const uiFont = useAtomValue(uiFontAtom);
  const emojiFont = useAtomValue(emojiFontAtom);
  useLayoutEffect(() => {
    applyFontSettings(uiFont, emojiFont);
  }, [uiFont, emojiFont]);
}

/** 设置页用：两项字体设置的读写，以及填写的面板字体在本机是否找得到 */
export function useFontSettings() {
  const [uiFont, setUiFont] = useAtom(uiFontAtom);
  const [emojiFont, setEmojiFont] = useAtom(emojiFontAtom);
  const uiFontMissing = useMemo(() => uiFont.trim() !== '' && !isFontInstalled(uiFont), [uiFont]);
  return { uiFont, setUiFont, uiFontMissing, emojiFont, setEmojiFont };
}
