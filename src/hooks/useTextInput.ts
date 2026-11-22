import { useAtom, type PrimitiveAtom } from 'jotai';
import debounce from 'lodash-es/debounce';
import * as React from 'react';

const { useCallback, useEffect, useState, useMemo } = React;

export function useTextInput(
  x: PrimitiveAtom<string>,
): [(e: React.ChangeEvent<HTMLInputElement>) => void, string] {
  const [textGlobal, setTextGlobal] = useAtom(x);
  // The atom outlives the input, so a remount must start from the filter that is still applied.
  const [text, setText] = useState(textGlobal);
  const setTextDebounced = useMemo(() => debounce(setTextGlobal, 300), [setTextGlobal]);
  // Commit a keystroke still inside the debounce window when the input unmounts, otherwise the
  // atom keeps the older value and the next mount shows text that differs from what was typed.
  useEffect(() => () => setTextDebounced.flush(), [setTextDebounced]);
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
      setTextDebounced(e.target.value);
    },
    [setTextDebounced],
  );
  return [onChange, text];
}
