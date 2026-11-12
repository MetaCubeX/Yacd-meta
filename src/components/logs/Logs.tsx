import { useAtomValue, useSetAtom } from 'jotai';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowDown } from '~/components/shared/FeatherIcons';
import { useFilteredLogs, useLogsPage } from '~/modules/logs/hooks';
import { LOG_TYPES } from '~/modules/logs/utils';
import { updateConfigs } from '~/store/configs';
import { clearLogsAtom, logsForDisplayAtom } from '~/store/logs';
import { useStoreActions } from '~/store/StateProvider';
import { DispatchFn } from '~/store/types';
import { ClashAPIConfig, Log } from '~/types';

import s from './Logs.module.scss';
import { LogsHeader } from './LogsHeader';

// 一屏最多几十行，但列表整体可以有几百行；memo 之后新日志进来只渲染新增的那一条
const LogLine = React.memo(function LogLine({ time, payload, type }: Log) {
  return (
    <div className={s.line}>
      <span className={s.time}>{time}</span>
      <span className={s.type} data-type={type}>
        {LOG_TYPES[type]}
      </span>
      <span className={s.payload}>{payload}</span>
    </div>
  );
});

type Props = {
  dispatch: DispatchFn;
  logLevel: string;
  apiConfig: ClashAPIConfig;
  logStreamingPaused: boolean;
};

export default function Logs({ dispatch, logLevel, apiConfig, logStreamingPaused }: Props) {
  const { t } = useTranslation();
  const actions = useStoreActions();
  const logs = useAtomValue(logsForDisplayAtom);
  const { toggleIsRefreshPaused, scrollRef, isAtBottom, scrollToBottom, onScroll } = useLogsPage({
    logLevel,
    apiConfig,
    logs,
    logStreamingPaused,
    updateAppConfig: actions.app.updateAppConfig,
  });

  const visibleLogs = useFilteredLogs(logs);

  const setLogLevel = React.useCallback(
    (level: string) => dispatch(updateConfigs(apiConfig, { 'log-level': level })),
    [dispatch, apiConfig],
  );
  const onClear = useSetAtom(clearLogsAtom);

  return (
    <div className={s.page}>
      <LogsHeader
        logLevel={logLevel}
        setLogLevel={setLogLevel}
        isPaused={logStreamingPaused}
        toggleIsPaused={toggleIsRefreshPaused}
        onClear={onClear}
      />

      <div className={s.listArea}>
        <div className={s.card}>
          <div className={s.scroll} ref={scrollRef} onScroll={onScroll}>
            {visibleLogs.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyTitle}>
                  {logs.length === 0 ? t('no_logs') : t('logs_no_match')}
                </span>
                {logs.length === 0 ? (
                  <span className={s.emptyHint}>{t('logs_empty_hint')}</span>
                ) : null}
              </div>
            ) : (
              visibleLogs.map((log, index) => <LogLine {...log} key={log.id || index} />)
            )}
          </div>

          {visibleLogs.length > 0 && !isAtBottom ? (
            <button
              type="button"
              className={s.toBottomBtn}
              onClick={scrollToBottom}
              aria-label={t('logs_scroll_to_bottom')}
              title={t('logs_scroll_to_bottom')}
            >
              <ArrowDown size={16} />
            </button>
          ) : null}

          <div className={s.footer}>
            <span>{t('logs_shown', { count: visibleLogs.length })}</span>
            {logStreamingPaused ? <span className={s.paused}>{t('logs_paused')}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
