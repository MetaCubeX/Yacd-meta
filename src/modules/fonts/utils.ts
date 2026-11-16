import type { EmojiFont } from '~/store/fonts';

/**
 * quoteFontFamily 把用户填写的字体名转成 CSS 字符串。不加引号的话，
 * 带空格、数字开头或撞上 serif 这类通用族名关键字的名字会被解析错。
 */
export function quoteFontFamily(name: string) {
  return `"${name.replace(/[\r\n\f]/g, '').replace(/["\\]/g, '\\$&')}"`;
}

/**
 * applyFontSettings 把字体设置写到 <html> 上，fonts.scss 按它们组合字体栈。
 * uiFont 为空串时移除 --font-ui-custom，退回系统界面字体。
 */
export function applyFontSettings(uiFont: string, emojiFont: EmojiFont) {
  const root = document.documentElement;
  const name = uiFont.trim();
  if (name) {
    root.style.setProperty('--font-ui-custom', quoteFontFamily(name));
  } else {
    root.style.removeProperty('--font-ui-custom');
  }

  if (emojiFont === 'system') {
    root.removeAttribute('data-emoji-font');
  } else {
    root.setAttribute('data-emoji-font', emojiFont);
  }
}

const PROBE_TEXT = 'mmmmmmmmmmlli10WW@#中文字体';
const PROBE_BASES = ['monospace', 'serif', 'sans-serif'];
let probeCtx: CanvasRenderingContext2D | null = null;

/**
 * isFontInstalled 判断本机是否装有这个字体。document.fonts.check 对本机字体一律返回 true，
 * 不能用；这里比较「该字体 + 通用族名」和「仅通用族名」排出的文字宽度，
 * 三种通用族名下宽度都不变，说明浏览器根本没找到它。
 */
export function isFontInstalled(name: string) {
  probeCtx ??= document.createElement('canvas').getContext('2d');
  const ctx = probeCtx;
  if (!ctx) return true;
  const family = quoteFontFamily(name.trim());
  return PROBE_BASES.some((base) => {
    ctx.font = `72px ${base}`;
    const baseWidth = ctx.measureText(PROBE_TEXT).width;
    ctx.font = `72px ${family}, ${base}`;
    return ctx.measureText(PROBE_TEXT).width !== baseWidth;
  });
}
