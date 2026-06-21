import * as React from 'react';


import { useTextInut } from '~/hooks/useTextInput';

import s from './TextFitler.module.scss';

import type { PrimitiveAtom } from 'jotai';

export function TextFilter(props: { textAtom: PrimitiveAtom<string>; placeholder?: string }) {
  const [onChange, text] = useTextInut(props.textAtom);
  return (
    <input
      className={s.input}
      type="text"
      value={text}
      onChange={onChange}
      placeholder={props.placeholder}
    />
  );
}
