import { useSuspenseQuery } from '@tanstack/react-query';
import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FcAreaChart, FcDocument, FcGlobe, FcLink, FcRuler, FcSettings } from 'react-icons/fc';
import { Link, useLocation } from 'react-router-dom';

import { fetchVersion } from '~/api/version';
import { Info } from '~/components/shared/FeatherIcons';
import { ThemeSwitcher } from '~/components/shared/ThemeSwitcher';
import { Tooltip } from '~/components/shared/Tooltip';
import { connect } from '~/components/StateProvider';
import { getClashAPIConfig } from '~/store/app';
import { ClashAPIConfig } from '~/types';

import s from './SideBar.module.scss';

type Props = { apiConfig: ClashAPIConfig };

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
    <Link to={to} className={className}>
      <Comp />
      <div className={s.label}>{labelText}</div>
    </Link>
  );
});

interface SideBarRowProps {
  isActive: boolean;
  to: string;
  iconId?: string;
  labelText?: string;
}

const pages = [
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

const mapState = (s) => ({
  apiConfig: getClashAPIConfig(s),
});

export default connect(mapState)(SideBar);

function SideBar(props: Props) {
  const { t } = useTranslation();
  const location = useLocation();

  const { data: version } = useSuspenseQuery({
    queryKey: ['/version', props.apiConfig],
    queryFn: () => fetchVersion('/version', props.apiConfig),
  });
  return (
    <div className={s.root}>
      <div className={version.meta && version.premium ? s.logo_singbox : s.logo_meta} />
      <div className={s.rows}>
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
        <ThemeSwitcher />
        <Tooltip label={t('about')}>
          <Link to="/about" className={s.iconWrapper}>
            <Info size={20} />
          </Link>
        </Tooltip>
      </div>
    </div>
  );
}
