import { useQueries } from '@tanstack/react-query';
import * as React from 'react';

import { fetchConfigs } from '~/store/configs';
import { closeModal } from '~/store/modals';
import type { DispatchFn } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

import {
  buildAPIBaseURL,
  DEFAULT_BACKEND_FIELDS,
  detectEmbeddedAPIBaseURL,
  splitAPIBaseURL,
  splitPastedHost,
  testAPIConfig,
  type BackendFields,
  type ConnectionTestResult,
  type Protocol,
} from './utils';

const { useCallback, useEffect, useMemo, useRef, useState } = React;

export function useBackendConfigForm({
  onAddConfig,
  onUpdateConfig,
}: {
  onAddConfig: (config: ClashAPIConfig) => void;
  onUpdateConfig: (prev: ClashAPIConfig, next: ClashAPIConfig) => void;
}) {
  const [fields, setFields] = useState<BackendFields>(DEFAULT_BACKEND_FIELDS);
  const [secret, setSecret] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  // 每次表单变动都递增；测试返回时编号对不上说明结果针对的是旧输入，丢弃
  const testSeq = useRef(0);
  // 非 null 时表单是在改这一条已保存的配置，而不是新增
  const [editing, setEditing] = useState<ClashAPIConfig | null>(null);
  // 用户已经动过表单后，自动探测的结果不能再覆盖回去
  const isFormDirty = useRef(false);

  const clearFeedback = useCallback(() => {
    testSeq.current += 1;
    setIsTesting(false);
    setTestResult(null);
    setErrMsg('');
  }, []);

  const handleProtocolOnChange = useCallback(
    (protocol: Protocol) => {
      clearFeedback();
      isFormDirty.current = true;
      setFields((prev) => ({ ...prev, protocol }));
    },
    [clearFeedback],
  );

  const handleInputOnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearFeedback();
      isFormDirty.current = true;
      const { name, value } = e.target;

      switch (name) {
        case 'host': {
          // 整条地址粘进来时自动拆分，省得用户手动删协议和端口
          const pasted = splitPastedHost(value);
          setFields((prev) => (pasted ? { ...prev, ...pasted } : { ...prev, host: value }));
          break;
        }
        case 'port':
          setFields((prev) => ({ ...prev, port: value }));
          break;
        case 'secret':
          setSecret(value);
          break;
        default:
          throw new Error(`unknown input name ${name}`);
      }
    },
    [clearFeedback],
  );

  const baseURLPreview = useMemo(() => {
    const built = buildAPIBaseURL(fields);
    return 'baseURL' in built ? built.baseURL : '';
  }, [fields]);

  const resetForm = useCallback(() => {
    isFormDirty.current = true;
    clearFeedback();
    setEditing(null);
    setFields(DEFAULT_BACKEND_FIELDS);
    setSecret('');
  }, [clearFeedback]);

  const startEdit = useCallback(
    (config: ClashAPIConfig) => {
      const parsed = splitAPIBaseURL(config.baseURL);
      if (!parsed) return;
      isFormDirty.current = true;
      clearFeedback();
      setEditing(config);
      setFields(parsed);
      setSecret(config.secret ?? '');
    },
    [clearFeedback],
  );

  const onTest = useCallback(() => {
    const built = buildAPIBaseURL(fields);
    if ('error' in built) {
      setErrMsg(built.error);
      return;
    }

    const seq = ++testSeq.current;
    setTestResult(null);
    setIsTesting(true);
    testAPIConfig({ baseURL: built.baseURL, secret }).then((result) => {
      if (seq !== testSeq.current) return;
      setIsTesting(false);
      setTestResult(result);
    });
  }, [fields, secret]);

  // 只保存不测试：暂时连不上的后端也允许先存下来，是否可用交给「测试连接」
  const onConfirm = useCallback(() => {
    const built = buildAPIBaseURL(fields);
    if ('error' in built) {
      setErrMsg(built.error);
      return;
    }

    const nextConfig = { baseURL: built.baseURL, secret };
    if (editing) {
      onUpdateConfig(editing, nextConfig);
      resetForm();
    } else {
      onAddConfig(nextConfig);
    }
  }, [editing, fields, onAddConfig, onUpdateConfig, resetForm, secret]);

  const handleContentOnKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.target instanceof Element &&
        (!e.target.tagName || e.target.tagName.toUpperCase() !== 'INPUT')
      ) {
        return;
      }

      if (e.key !== 'Enter') return;

      onConfirm();
    },
    [onConfirm],
  );

  useEffect(() => {
    let isCancelled = false;

    detectEmbeddedAPIBaseURL().then((detectedBaseURL) => {
      if (isCancelled || isFormDirty.current || !detectedBaseURL) return;
      const detected = splitAPIBaseURL(detectedBaseURL);
      if (detected) setFields(detected);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    ...fields,
    secret,
    errMsg,
    baseURLPreview,
    isTesting,
    testResult,
    editing,
    startEdit,
    cancelEdit: resetForm,
    handleProtocolOnChange,
    handleInputOnChange,
    handleContentOnKeyDown,
    onTest,
    onConfirm,
  };
}

// 打开切换菜单时的探测结果在这段时间内复用，来回开关菜单不会反复打每个后端
const REACHABILITY_STALE_MS = 30_000;

/**
 * useBackendReachability tests every saved backend with GET /version while enabled.
 * The result array lines up with apiConfigs; an entry is undefined until its test finishes.
 */
export function useBackendReachability(
  apiConfigs: ClashAPIConfig[],
  enabled: boolean,
): Array<ConnectionTestResult | undefined> {
  return useQueries({
    queries: apiConfigs.map(({ baseURL, secret }) => ({
      queryKey: ['backend-reachability', baseURL, secret] as const,
      queryFn: () => testAPIConfig({ baseURL, secret }),
      enabled,
      staleTime: REACHABILITY_STALE_MS,
      retry: false,
    })),
    combine: (results) => results.map((r) => r.data),
  });
}

export function useBackendDiscovery({
  apiConfig,
  dispatch,
}: {
  apiConfig: ClashAPIConfig;
  dispatch: DispatchFn;
}) {
  const closeAPIConfigModal = useCallback(() => {
    dispatch(closeModal('apiConfig'));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchConfigs(apiConfig));
  }, [apiConfig, dispatch]);

  return {
    closeAPIConfigModal,
  };
}
