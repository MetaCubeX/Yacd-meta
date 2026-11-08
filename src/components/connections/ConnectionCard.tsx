import cx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowDown, ArrowUp, X } from '~/components/shared/FeatherIcons';
import { getDateFnsLocale } from '~/misc/date-locale';
import prettyBytes from '~/misc/pretty-bytes';
import { formatElapsed } from '~/modules/connections/utils';
import { FormattedConn } from '~/store/connections';

import s from './ConnectionCard.module.scss';

interface Props {
  conn: FormattedConn;
  onDisconnect: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
}

const ConnectionCard = React.memo(function ConnectionCard({ conn, onDisconnect, onClick }: Props) {
  const { i18n } = useTranslation();

  const timeAgo = formatElapsed(conn.start, getDateFnsLocale(i18n.language));
  const busy = (conn.downloadSpeedCurr ?? 0) + (conn.uploadSpeedCurr ?? 0) > 0;

  return (
    <div
      className={s.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={s.row}>
        <span className={cx(s.dot, { [s.dotBusy]: busy })} aria-hidden />
        <div className={s.host}>{conn.host}</div>
        <div className={s.time}>{timeAgo}</div>
      </div>

      <div className={s.row}>
        <span className={cx(s.chip, conn.network === 'udp' ? s.chipUdp : s.chipTcp)}>
          {conn.type}
        </span>
        <div className={s.totals}>
          <span>
            <ArrowDown size={11} />
            {prettyBytes(conn.download)}
          </span>
          <span>
            <ArrowUp size={11} />
            {prettyBytes(conn.upload)}
          </span>
        </div>
      </div>

      <div className={s.row}>
        <div className={s.chain}>
          <span className={s.rule}>{conn.rule}</span>
          <span className={s.arrow} aria-hidden>
            ›
          </span>
          <span className={s.node}>{conn.chainNode}</span>
        </div>
        <div className={s.speedAndAction}>
          <span className={s.speed}>{prettyBytes(conn.downloadSpeedCurr)}/s</span>
          <button
            type="button"
            className={s.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDisconnect(conn.id, e);
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ConnectionCard;
