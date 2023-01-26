import cx from 'clsx';
import * as React from 'react';

import s from './SvgYacd.module.scss';

type Props = {
  width?: number;
  height?: number;
  animate?: boolean;
  c0?: string;
  c1?: string;
  stroke?: string;
  eye?: string;
  line?: string;
};

function SvgYacd({
  width = 320,
  height = 320,
  animate = false,
  c0 = '#316eb5',
  c1 = '#f19500',
  line = '#cccccc',
}: Props) {
  const faceClasName = cx({ [s.path]: animate });
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.2"
      viewBox="0 0 512 512"
      width={width}
      height={height}
    >
      <path
        id="Layer"
        className={faceClasName}
        fill={c0}
        stroke={line}
        strokeLinecap="round"
        strokeWidth="4"
        d="m280.8 182.4l119-108.3c1.9-1.7 4.3-2.7 6.8-2.4l39.5 4.1c2.1 0.3 3.9 2.2 3.9 4.4v251.1c0 2-1.5 3.9-3.5 4.4l-41.9 9c-0.5 0.3-1.2 0.3-1.9 0.3h-18.8c-2.4 0-4.4-2-4.4-4.4v-132.9c0-7.5-9-11.7-14.8-6.3l-59 53.4c-2.2 2.2-5.4 2.9-8.5 1.9-27.1-8-56.3-8-83.4 0-2.9 1-6.1 0.3-8.5-1.9l-59-53.4c-5.6-5.4-14.6-1.2-14.6 6.3v132.9c0 2.4-2.2 4.4-4.7 4.4h-18.7c-0.7 0-1.2 0-2-0.3l-41.6-9c-2-0.5-3.5-2.4-3.5-4.4v-251.1c0-2.2 1.8-4.1 3.9-4.4l39.5-4.1c2.5-0.3 4.9 0.7 6.9 2.4l115.7 105.3c2 1.7 4.6 2.5 7.1 2.2 15.3-2.2 31.4-1.9 46.5 0.8z"
      />
      <path
        id="Layer"
        className={faceClasName}
        fill={c0}
        stroke={line}
        strokeLinecap="round"
        strokeWidth="4"
        d="m269.4 361.8l-7.1 13.4c-2.4 4.2-8.5 4.2-11 0l-7-13.4c-2.5-4.1 0.7-9.3 5.3-9h14.4c4.9 0 7.8 4.9 5.4 9z"
      />
      <path
        id="Layer"
        className={faceClasName}
        fill={c1}
        stroke={line}
        strokeLinecap="round"
        strokeWidth="4"
        d="m160.7 362.5c3.6 0 6.8 3.2 6.8 6.9 0 3.6-3.2 6.5-6.8 6.5h-94.6c-3.6 0-6.8-2.9-6.8-6.5 0-3.7 3.2-6.9 6.8-6.9z"
      />
      <path
        id="Layer"
        className={faceClasName}
        fill={c1}
        stroke={line}
        strokeLinecap="round"
        strokeWidth="4"
        d="m158.7 394.7c3.4-1 7.1 1 8.3 4.4 1 3.4-1 7.3-4.4 8.3l-92.8 31.7c-3.4 1.2-7.3-0.7-8.3-4.2-1.2-3.6 0.7-7.3 4.4-8.5z"
      />
      <path
        id="Layer"
        className={faceClasName}
        fill={c1}
        stroke={line}
        strokeLinecap="round"
        strokeWidth="4"
        d="m446.1 426.4c3.4 1.2 5.3 4.9 4.3 8.5-1.2 3.5-4.8 5.4-8.2 4.2l-93.1-31.7c-3.5-1-5.4-4.9-4.2-8.3 1-3.4 4.9-5.4 8.3-4.4z"
      />
      <path
        id="Layer"
        className={faceClasName}
        fill={c1}
        stroke={line}
        strokeLinecap="round"
        strokeWidth="4"
        d="m445.8 362.5c3.7 0 6.6 3.2 6.6 6.9 0 3.6-2.9 6.5-6.6 6.5h-94.8c-3.6 0-6.6-2.9-6.6-6.5 0-3.7 3-6.9 6.6-6.9z"
      />
    </svg>
  );
}

export default SvgYacd;
