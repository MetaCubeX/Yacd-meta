import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FcAreaChart, FcDocument, FcGlobe, FcLink, FcRuler, FcSettings } from 'react-icons/fc';
import { LuBox } from 'react-icons/lu';
import { Link, useLocation } from 'react-router-dom';

import { BackendSwitcher } from '~/components/backend/BackendSwitcher';
import { ThemeSwitcher } from '~/components/shared/ThemeSwitcher';
import { useSlidingIndicator } from '~/hooks/useSlidingIndicator';
import { useVersionNoSuspense } from '~/hooks/useVersion';
import {
  getClashAPIConfig,
  getClashAPIConfigs,
  getSelectedClashAPIConfigIndex,
  selectClashAPIConfig,
} from '~/store/app';
import { connect } from '~/store/StateProvider';
import type { ClashAPIConfigWithAddedAt, DispatchFn, State } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import s from './SideBar.module.scss';

type Props = {
  apiConfig: ClashAPIConfig;
  apiConfigs: ClashAPIConfigWithAddedAt[];
  selectedClashAPIConfigIndex: number;
  dispatch: DispatchFn;
};

const icons = {
  activity: FcAreaChart,
  globe: FcGlobe,
  command: FcRuler,
  file: FcDocument,
  settings: FcSettings,
  link: FcLink,
};

const SideBarRow = React.memo(function SideBarRow({
  isActive,
  to,
  iconId,
  labelText,
}: SideBarRowProps) {
  const Comp = icons[iconId];
  const className = cx(s.row, isActive ? s.rowActive : null);
  return (
    <Link to={to} className={className} aria-current={isActive ? 'page' : undefined}>
      <Comp />
      <div className={s.label}>{labelText}</div>
    </Link>
  );
});

interface SideBarRowProps {
  isActive: boolean;
  to: string;
  iconId: keyof typeof icons;
  labelText: string;
}

const pages: Array<Omit<SideBarRowProps, 'isActive'>> = [
  {
    to: '/home',
    iconId: 'activity',
    labelText: 'Overview',
  },
  {
    to: '/proxies',
    iconId: 'globe',
    labelText: 'Proxies',
  },
  {
    to: '/rules',
    iconId: 'command',
    labelText: 'Rules',
  },
  {
    to: '/connections',
    iconId: 'link',
    labelText: 'Conns',
  },
  {
    to: '/logs',
    iconId: 'file',
    labelText: 'Logs',
  },
  {
    to: '/configs',
    iconId: 'settings',
    labelText: 'Config',
  },
];

const mapState = (s: State) => ({
  apiConfig: getClashAPIConfig(s),
  apiConfigs: getClashAPIConfigs(s),
  selectedClashAPIConfigIndex: getSelectedClashAPIConfigIndex(s),
});

export default connect(mapState)(SideBar);

function SideBar(props: Props) {
  const { dispatch } = props;
  const { t } = useTranslation();
  const location = useLocation();
  const { containerRef, indicatorRef } = useSlidingIndicator('[aria-current="page"]');

  // 不能 suspend：后端连不上时侧边栏是唯一能切到别的后端的地方
  const version = useVersionNoSuspense(props.apiConfig);
  // fetchVersion 失败时返回空对象而不是抛错，所以拿 version 字段判断连通
  const backendStatus = !version ? 'checking' : version.version ? 'connected' : 'unreachable';
  const onSelectBackend = React.useCallback(
    (config: ClashAPIConfig) => dispatch(selectClashAPIConfig(config)),
    [dispatch],
  );
  return (
    <div className={s.root}>
      <div className={version?.core === 'sing-box' ? s.logo_singbox : s.logo_meta} />
      <div className={s.rows} ref={containerRef}>
        <div className={s.indicator} ref={indicatorRef} aria-hidden="true" />
        {pages.map(({ to, iconId, labelText }) => (
          <SideBarRow
            key={to}
            to={to}
            isActive={location.pathname === to}
            iconId={iconId}
            labelText={t(labelText)}
          />
        ))}
      </div>
      <div className={s.footer}>
        <BackendSwitcher
          apiConfigs={props.apiConfigs}
          selectedIndex={props.selectedClashAPIConfigIndex}
          status={backendStatus}
          onSelect={onSelectBackend}
        />
        <div className={s.meta}>
          <ThemeSwitcher />
          {version?.version ? (
            <span className={s.version} title={version.version}>
              <LuBox />
              <span className={s.versionText}>{version.version}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
