import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowDown, ArrowDownCircle, ArrowUp, X } from '~/components/shared/FeatherIcons';
import prettyBytes from '~/misc/pretty-bytes';
import { formatElapsed, getDateFnsLocale } from '~/modules/connections/utils';
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
        <div className={s.host}>{conn.host}</div>
        <div className={s.time}>{timeAgo}</div>
      </div>
      <div className={s.row}>
        <div className={s.typeProtocol}>{conn.type.replace(/\((.*)\)/, ' | $1')}</div>
        <div className={s.totals}>
          <span>
            {prettyBytes(conn.download)} <ArrowDown size={12} />
          </span>
          <span>
            {prettyBytes(conn.upload)} <ArrowUp size={12} />
          </span>
        </div>
      </div>
      <div className={s.row}>
        <div className={s.ruleChain}>
          <span className={s.rule}>{conn.rule}</span>
          <span className={s.arrow}>→</span>
          <span className={s.chains}>{conn.chains}</span>
        </div>
        <div className={s.speedAndAction}>
          <div className={s.speed}>
            {prettyBytes(conn.downloadSpeedCurr)}/s
            <ArrowDownCircle size={16} className={s.speedIcon} />
          </div>
          <button
            className={s.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDisconnect(conn.id, e);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ConnectionCard;
