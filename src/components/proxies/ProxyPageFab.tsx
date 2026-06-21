import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Action, Fab, IsFetching, position as fabPosition } from '~/components/shared/Fab';
import { Zap } from '~/components/shared/FeatherIcons';
import { RotateIcon } from '~/components/shared/RotateIcon';
import { useTestLatencyAction, useUpdateProviderItems } from '~/modules/proxies/hooks';
import { DispatchFn, FormattedProxyProvider } from '~/store/types';
import { ClashAPIConfig } from '~/types';

function StatefulZap({ isLoading }: { isLoading: boolean }) {
  return isLoading ? (
    <IsFetching>
      <Zap width={16} height={16} />
    </IsFetching>
  ) : (
    <Zap width={16} height={16} />
  );
}

export function ProxyPageFab({
  dispatch,
  apiConfig,
  proxyProviders,
}: {
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
  proxyProviders: FormattedProxyProvider[];
}) {
  const { t } = useTranslation();
  const [requestDelayAllFn, isTestingLatency] = useTestLatencyAction({
    dispatch,
    apiConfig,
  });

  const [updateProviders, isUpdating] = useUpdateProviderItems({
    apiConfig,
    dispatch,
    names: proxyProviders.map((item) => item.name),
  });

  return (
    <Fab
      icon={<StatefulZap isLoading={isTestingLatency} />}
      onClick={requestDelayAllFn}
      text={t('Test Latency')}
      style={fabPosition}
    >
      {proxyProviders.length > 0 ? (
        <Action text={t('update_all_proxy_provider')} onClick={updateProviders}>
          <RotateIcon isRotating={isUpdating} />
        </Action>
      ) : null}
    </Fab>
  );
}
