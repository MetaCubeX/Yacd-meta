import * as React from 'react';
import { useTranslation } from 'react-i18next';

import ContentHeader from '~/components/ContentHeader';
import { Fab, position as fabPosition } from '~/components/shared/Fab';
import { ArrowDown, Pause, Play, Trash2 } from '~/components/shared/FeatherIcons';
import Select from '~/components/shared/Select';
import { useStoreActions } from '~/components/StateProvider';
import SvgYacd from '~/components/SvgYacd';
import useRemainingViewPortHeight from '~/hooks/useRemainingViewPortHeight';
import { LOG_LEVEL_OPTIONS } from '~/modules/config/utils';
import { useLogsPage } from '~/modules/logs/hooks';
import { LOG_TYPES, LOGS_HEIGHT_RATIO } from '~/modules/logs/utils';
import { updateConfigs } from '~/store/configs';
import { clearLogs } from '~/store/logs';
import { DispatchFn, Log } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import s from './Logs.module.scss';
import LogSearch from './LogSearch';

type LogLineProps = Partial<Log>;

function LogLine({ time, payload, type }: LogLineProps) {
  return (
    <div className={s.logLine}>
      <div className={s.logMeta}>
        <span className={s.logTime}>{time}</span>
        <span className={s.logType} data-type={type}>
          {LOG_TYPES[type]}
        </span>
      </div>
      <div className={s.logText}>{payload}</div>
    </div>
  );
}

type Props = {
  dispatch: DispatchFn;
  logLevel: string;
  apiConfig: ClashAPIConfig;
  logs: Log[];
  logStreamingPaused: boolean;
};

export default function Logs({ dispatch, logLevel, apiConfig, logs, logStreamingPaused }: Props) {
  const actions = useStoreActions();
  const { toggleIsRefreshPaused, scrollRef, isAtBottom, scrollToBottom, onScroll } = useLogsPage({
    dispatch,
    logLevel,
    apiConfig,
    logs,
    logStreamingPaused,
    updateAppConfig: actions.app.updateAppConfig,
  });
  const [refLogsContainer, containerHeight] = useRemainingViewPortHeight();
  const { t } = useTranslation();

  return (
    <div>
      <ContentHeader>
        <div className={s.headerControls}>
          <LogSearch className={s.searchWrapper} />
          <Select
            className={s.levelSelect}
            options={LOG_LEVEL_OPTIONS}
            selected={logLevel ? logLevel.toLowerCase() : 'info'}
            onChange={(e) => dispatch(updateConfigs(apiConfig, { 'log-level': e.target.value }))}
          />
          <button className={s.clearBtn} onClick={() => dispatch(clearLogs())} title={t('Clear')}>
            <Trash2 size={18} />
          </button>
        </div>
      </ContentHeader>
      <div ref={refLogsContainer} style={{ position: 'relative' }}>
        <div
          className={s.logsWrapper}
          style={{ height: containerHeight * LOGS_HEIGHT_RATIO }}
          ref={scrollRef}
          onScroll={onScroll}
        >
          {logs.length === 0 ? (
            <div className={s.logPlaceholder} style={{ height: '100%' }}>
              <div className={s.logPlaceholderIcon}>
                <SvgYacd width={200} height={200} />
              </div>
              <div>{t('no_logs')}</div>
            </div>
          ) : (
            logs.map((log, index) => <LogLine {...log} key={log.id || index} />)
          )}
        </div>

        {logs.length > 0 && !isAtBottom && (
          <button className={s.scrollToBottomBtn} onClick={scrollToBottom}>
            <ArrowDown size={16} />
          </button>
        )}

        <Fab
          icon={logStreamingPaused ? <Play size={16} /> : <Pause size={16} />}
          mainButtonStyles={logStreamingPaused ? { background: '#e74c3c' } : {}}
          style={fabPosition}
          text={logStreamingPaused ? t('Resume Refresh') : t('Pause Refresh')}
          onClick={toggleIsRefreshPaused}
        ></Fab>
      </div>
    </div>
  );
}
