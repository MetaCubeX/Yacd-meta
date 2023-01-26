import cx from 'clsx';
import * as React from 'react';

import { Proxy, ProxySmall } from './Proxy';
import s from './ProxyList.module.scss';

type ProxyListProps = {
  all: string[];
  now?: string;
  isSelectable?: boolean;
  itemOnTapCallback?: (x: string) => void;
  show?: boolean;
};

export function ProxyList({ all, now, isSelectable, itemOnTapCallback }: ProxyListProps) {
  const proxies = all;

  return (
    <div className={cx(s.list, s.detail)}>
      {proxies.map((proxyName) => {
        return (
          <Proxy
            key={proxyName}
            onClick={itemOnTapCallback}
            isSelectable={isSelectable}
            name={proxyName}
            now={proxyName === now}
          />
        );
      })}
    </div>
  );
}

export function ProxyListSummaryView({
  all,
  now,
  isSelectable,
  itemOnTapCallback,
}: ProxyListProps) {
  return (
    <div className={cx(s.list, s.summary)}>
      {all.map((proxyName) => {
        return (
          <ProxySmall
            key={proxyName}
            onClick={itemOnTapCallback}
            isSelectable={isSelectable}
            name={proxyName}
            now={proxyName === now}
          />
        );
      })}
    </div>
  );
}
