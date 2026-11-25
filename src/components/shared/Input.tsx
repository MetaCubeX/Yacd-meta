import cx from 'clsx';
import React from 'react';

import s0 from './Input.module.scss';

const { useState, useRef, useEffect, useCallback } = React;

export default function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cx(s0.input, className)} {...props} />;
}

export function SelfControlledInput({
  value,
  className,
  ...restProps
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [internalValue, setInternalValue] = useState(value);
  const refValue = useRef(value);
  useEffect(() => {
    if (refValue.current !== value) {
      // ideally we should only do this when this input is not focused
      setInternalValue(value);
    }
    refValue.current = value;
  }, [value]);
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInternalValue(e.target.value),
    [setInternalValue],
  );

  return (
    <input
      className={cx(s0.input, className)}
      value={internalValue}
      onChange={onChange}
      {...restProps}
    />
  );
}
