import cx from 'clsx';
import * as React from 'react';

import { Eye, EyeOff, X as Close } from '~/components/shared/FeatherIcons';
import { useToggle } from '~/hooks/basic';
import type { ClashAPIConfigWithAddedAt } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

import s from './BackendList.module.scss';

type Props = {
  apiConfigs: ClashAPIConfigWithAddedAt[];
  selectedClashAPIConfigIndex: number;
  onRemove: (x: ClashAPIConfig) => void;
  onSelect: (x: ClashAPIConfig) => void;
};

export function BackendList({
  apiConfigs,
  selectedClashAPIConfigIndex,
  onRemove,
  onSelect,
}: Props) {
  return (
    <>
      <ul className={s.ul}>
        {apiConfigs.map((item, idx) => {
          return (
            <li
              className={cx(s.li, {
                [s.hasSecret]: item.secret,
                [s.isSelected]: idx === selectedClashAPIConfigIndex,
              })}
              key={item.baseURL + item.secret}
            >
              <Item
                disableRemove={idx === selectedClashAPIConfigIndex}
                baseURL={item.baseURL}
                secret={item.secret}
                onRemove={onRemove}
                onSelect={onSelect}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Item({
  baseURL,
  secret,
  disableRemove,
  onRemove,
  onSelect,
}: {
  baseURL: string;
  secret?: string;
  disableRemove: boolean;
  onRemove: (x: ClashAPIConfig) => void;
  onSelect: (x: ClashAPIConfig) => void;
}) {
  const [show, toggle] = useToggle();
  const Icon = show ? EyeOff : Eye;

  const handleTap = React.useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <Button
        disabled={disableRemove}
        onClick={() => onRemove({ baseURL, secret })}
        className={s.close}
      >
        <Close size={20} />
      </Button>
      <span
        className={s.url}
        tabIndex={0}
        role="button"
        onClick={() => onSelect({ baseURL, secret })}
        onKeyUp={handleTap}
      >
        {baseURL}
      </span>
      <span />
      {secret ? (
        <>
          <span className={s.secret}>{show ? secret : '***'}</span>

          <Button onClick={toggle} className={s.eye}>
            <Icon size={20} />
          </Button>
        </>
      ) : null}
    </>
  );
}

function Button({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;

  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
  className: string;
  disabled?: boolean;
}) {
  return (
    <button disabled={disabled} className={cx(className, s.btn)} onClick={onClick}>
      {children}
    </button>
  );
}
