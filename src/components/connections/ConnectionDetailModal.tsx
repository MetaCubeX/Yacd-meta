import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { X } from '~/components/shared/FeatherIcons';
import { getDateFnsLocale } from '~/misc/date-locale';
import prettyBytes from '~/misc/pretty-bytes';
import { formatElapsed } from '~/modules/connections/utils';
import { FormattedConn } from '~/store/connections';

import s from './ConnectionDetailModal.module.scss';

type Props = {
  conn: FormattedConn | null;
  onRequestClose: () => void;
};

type DetailItem = { label: string; value: string };

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <div className={s.grid}>
      {items.map((item) => (
        <div key={item.label} className={s.item}>
          <span className={s.label}>{item.label}</span>
          <span className={s.value} title={item.value}>
            {item.value || '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ConnectionDetailModal({ conn, onRequestClose }: Props) {
  const { t, i18n } = useTranslation();

  const items = React.useMemo<DetailItem[]>(() => {
    if (!conn) return [];
    const locale = getDateFnsLocale(i18n.language);
    // 顺序按「连接怎么走 → 流量 → 基础信息 → 地址与元数据」组织
    return [
      // 路由
      { label: t('c_host'), value: conn.host },
      { label: t('c_rule'), value: conn.rule },
      { label: t('c_node'), value: conn.chainNode },
      { label: t('c_full_chain'), value: conn.chainsFull },
      // 流量
      { label: t('c_dl'), value: prettyBytes(conn.download) },
      { label: t('c_ul'), value: prettyBytes(conn.upload) },
      {
        label: t('c_dl_speed'),
        value: `${prettyBytes(conn.downloadSpeedCurr ?? 0)}/s`,
      },
      {
        label: t('c_ul_speed'),
        value: `${prettyBytes(conn.uploadSpeedCurr ?? 0)}/s`,
      },
      // 基础信息
      { label: t('c_source'), value: conn.source },
      { label: t('c_type'), value: conn.type },
      { label: t('c_network'), value: conn.network.toUpperCase() },
      {
        label: t('c_time'),
        value: formatElapsed(conn.start, locale),
      },
      // 地址与元数据
      { label: t('c_destination'), value: `${conn.destinationIP}:${conn.destinationPort}` },
      { label: t('c_destination_ip'), value: conn.destinationIP },
      { label: t('c_sni'), value: conn.sniffHost },
      { label: t('c_process'), value: conn.process ?? '' },
      { label: t('c_source_port'), value: conn.sourcePort },
      { label: t('c_conn_id'), value: conn.id },
    ];
  }, [conn, t, i18n.language]);

  return (
    <>
      <div className={s.overlay} onClick={onRequestClose} aria-hidden />
      <div className={s.panel} role="dialog" aria-modal="true" aria-label={t('conn_details')}>
        <div className={s.header}>
          <span className={s.headerTitle} title={conn?.host}>
            {conn?.host || t('conn_details')}
          </span>
          <button
            type="button"
            className={s.headerClose}
            onClick={onRequestClose}
            aria-label={t('close')}
          >
            <X size={15} />
          </button>
        </div>
        <div className={s.body}>
          <DetailGrid items={items} />
        </div>
      </div>
    </>
  );
}
