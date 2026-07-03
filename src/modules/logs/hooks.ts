import * as React from 'react';

import { fetchLogs, reconnect as reconnectLogs, stop as stopLogs } from '~/api/logs';
import { appendLog } from '~/store/logs';
import { DispatchFn, Log } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import { LOGS_SCROLL_BOTTOM_THRESHOLD } from './utils';

const { useCallback, useEffect, useRef, useState } = React;

type UpdateAppConfigFn = (name: string, value: unknown) => void;

export function useLogsPage({
  dispatch,
  logLevel,
  apiConfig,
  logs,
  logStreamingPaused,
  updateAppConfig,
}: {
  dispatch: DispatchFn;
  logLevel: string;
  apiConfig: ClashAPIConfig;
  logs: Log[];
  logStreamingPaused: boolean;
  updateAppConfig: UpdateAppConfigFn;
}) {
  const toggleIsRefreshPaused = useCallback(() => {
    logStreamingPaused ? reconnectLogs({ ...apiConfig, logLevel }) : stopLogs();
    updateAppConfig('logStreamingPaused', !logStreamingPaused);
  }, [apiConfig, logLevel, logStreamingPaused, updateAppConfig]);

  const appendLogInternal = useCallback((log) => dispatch(appendLog(log)), [dispatch]);

  useEffect(() => {
    const unsubscribe = fetchLogs({ ...apiConfig, logLevel }, appendLogInternal);
    return () => {
      unsubscribe?.();
    };
  }, [apiConfig, logLevel, appendLogInternal]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [logs, isAtBottom, scrollToBottom]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < LOGS_SCROLL_BOTTOM_THRESHOLD;
    setIsAtBottom(atBottom);
  }, []);

  return {
    toggleIsRefreshPaused,
    scrollRef,
    isAtBottom,
    scrollToBottom,
    onScroll,
  };
}
