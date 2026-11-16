import { useTranslation } from 'react-i18next';

import Input from '~/components/shared/Input';
import Select from '~/components/shared/Select';
import { useFontSettings } from '~/modules/fonts/hooks';
import type { EmojiFont } from '~/store/fonts';

import s0 from './Config.module.scss';

/** 面板字体和 emoji 字体两项设置，渲染成配置页网格里的两格 */
export function FontSettings() {
  const { t } = useTranslation();
  const { uiFont, setUiFont, uiFontMissing, emojiFont, setEmojiFont } = useFontSettings();

  const emojiOptions: Array<[EmojiFont, string]> = [
    ['system', t('font_system_default')],
    ['twemoji', 'Twemoji'],
  ];

  return (
    <>
      <div>
        <div className={s0.label}>{t('panel_font')}</div>
        <Input
          name="ui-font"
          autoComplete="off"
          spellCheck={false}
          value={uiFont}
          placeholder={t('font_system_default')}
          onChange={(e) => setUiFont(e.target.value)}
        />
        {uiFontMissing ? <p className={s0.fieldHint}>{t('font_not_found')}</p> : null}
      </div>

      <div>
        <div className={s0.label}>{t('emoji_font')}</div>
        <Select
          options={emojiOptions}
          selected={emojiFont}
          onChange={(e) => setEmojiFont(e.target.value as EmojiFont)}
        />
      </div>
    </>
  );
}
