import cx from 'clsx';
import * as React from 'react';

import s from './Select.module.scss';

type Props = {
  options: Array<string[]>;
  selected: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({ options, selected, onChange, className, ...props }: Props) {
  return (
     
    <select className={cx(s.select, className)} value={selected} onChange={onChange} {...props}>
      {options.map(([value, name]) => (
        <option key={value} value={value}>
          {name}
        </option>
      ))}
    </select>
  );
}
