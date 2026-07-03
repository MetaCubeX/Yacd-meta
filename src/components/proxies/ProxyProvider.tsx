import cx from 'clsx';
import { formatDistance } from 'date-fns';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import * as React from 'react';


import Button from '~/components/Button';
import Collapsible from '~/components/Collapsible';
import CollapsibleSectionHeader from '~/components/CollapsibleSectionHeader';
import s0 from '~/components/proxies/ProxyGroup.module.scss';
import { ChevronDown, RotateCw, Zap } from '~/components/shared/FeatherIcons';
import { useStoreActions } from '~/components/StateProvider';
import { useFilteredAndSorted, useUpdateProviderItem } from '~/modules/proxies/hooks';
import { healthcheckProviderByName } from '~/store/proxies';
import { DelayMapping, DispatchFn, ProxiesMapping, SubscriptionInfo } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import { ProxyList, ProxyListSummaryView } from './ProxyList';
import s from './ProxyProvider.module.scss';

const { memo, useState, useCallback } = React;

type Props = {
  name: string;
  proxies: Array<string>;
  delay: DelayMapping;
  hideUnavailableProxies: boolean;
  proxySortBy: string;
  type: 'Proxy' | 'Rule';
  vehicleType: 'HTTP' | 'File' | 'Compatible';
  updatedAt?: string;
  subscriptionInfo?: SubscriptionInfo;
  proxyMapping: ProxiesMapping;
  httpsLatencyTest: boolean;
  dispatch: DispatchFn;
  isOpen: boolean;
  apiConfig: ClashAPIConfig;
};

export const ProxyProvider = memo(function ProxyProvider({
  name,
  proxies: all,
  delay,
  hideUnavailableProxies,
  proxySortBy,
  vehicleType,
  updatedAt,
  subscriptionInfo,
  proxyMapping,
  httpsLatencyTest,
  isOpen,
  dispatch,
  apiConfig,
}: Props) {
  const proxies = useFilteredAndSorted(all, delay, hideUnavailableProxies, proxySortBy);
  const [isHealthcheckLoading, setIsHealthcheckLoading] = useState(false);

  const updateProvider = useUpdateProviderItem({ dispatch, apiConfig, name });

  const healthcheckProvider = useCallback(async () => {
    setIsHealthcheckLoading(true);
    await dispatch(healthcheckProviderByName(apiConfig, name));
    setIsHealthcheckLoading(false);
  }, [apiConfig, dispatch, name, setIsHealthcheckLoading]);

  const {
    app: { updateCollapsibleIsOpen },
  } = useStoreActions();

  const toggle = useCallback(() => {
    updateCollapsibleIsOpen('proxyProvider', name, !isOpen);
  }, [isOpen, updateCollapsibleIsOpen, name]);

  const timeAgo = formatDistance(new Date(updatedAt), new Date());
  const total = subscriptionInfo ? formatBytes(subscriptionInfo.Total) : 0;
  const used = subscriptionInfo
    ? formatBytes(subscriptionInfo.Download + subscriptionInfo.Upload)
    : 0;
  const percentage = subscriptionInfo
    ? (
        ((subscriptionInfo.Download + subscriptionInfo.Upload) / subscriptionInfo.Total) *
        100
      ).toFixed(2)
    : 0;
  const expireStr = () => {
    if (subscriptionInfo.Expire === 0) {
      return 'Null';
    }
    const expire = new Date(subscriptionInfo.Expire * 1000);
    const getYear = expire.getFullYear() + '-';
    const getMonth =
      (expire.getMonth() + 1 < 10 ? '0' + (expire.getMonth() + 1) : expire.getMonth() + 1) + '-';
    const getDate = (expire.getDate() < 10 ? '0' + expire.getDate() : expire.getDate()) + ' ';
    return getYear + getMonth + getDate;
  };
  return (
    <div className={s.body}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <CollapsibleSectionHeader
          name={name}
          toggle={toggle}
          type={vehicleType}
          isOpen={isOpen}
          qty={proxies.length}
        />
        <div style={{ display: 'flex' }}>
          <Button
            kind="minimal"
            onClick={toggle}
            className={s0.btn}
            title="Toggle collapsible section"
          >
            <span className={cx(s0.arrow, { [s0.isOpen]: isOpen })}>
              <ChevronDown size={20} />
            </span>
          </Button>
          <Button kind="minimal" start={<Refresh />} onClick={updateProvider} />
          <Button
            kind="minimal"
            start={<Zap size={16} />}
            onClick={healthcheckProvider}
            isLoading={isHealthcheckLoading}
          />
        </div>
      </div>
      <div className={s.updatedAt}>
        {subscriptionInfo && (
          <small>
            {used} / {total} ( {percentage}% ) &nbsp;&nbsp; Expire: {expireStr()}{' '}
          </small>
        )}
        <br />
        <small>Updated {timeAgo} ago</small>
      </div>
      <Collapsible isOpen={isOpen}>
        <ProxyList
          all={proxies}
          proxies={proxyMapping}
          delay={delay}
          httpsLatencyTest={httpsLatencyTest}
          apiConfig={apiConfig}
          dispatch={dispatch}
        />
        <div className={s.actionFooter}>
          <Button text="Update" start={<Refresh />} onClick={updateProvider} />
          <Button
            text="Health Check"
            start={<Zap size={16} />}
            onClick={healthcheckProvider}
            isLoading={isHealthcheckLoading}
          />
        </div>
      </Collapsible>
      <Collapsible isOpen={!isOpen}>
        <ProxyListSummaryView
          all={proxies}
          proxies={proxyMapping}
          delay={delay}
          httpsLatencyTest={httpsLatencyTest}
          apiConfig={apiConfig}
          dispatch={dispatch}
        />
      </Collapsible>
    </div>
  );
});

const button = {
  rest: { scale: 1 },
  pressed: { scale: 0.95 },
};
const arrow = {
  rest: { rotate: 0 },
  hover: { rotate: 360, transition: { duration: 0.3 } },
};

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
function Refresh() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={s.refresh}
        variants={button}
        initial="rest"
        whileHover="hover"
        whileTap="pressed"
      >
        <m.div className="flexCenter" variants={arrow}>
          <RotateCw size={16} />
        </m.div>
      </m.div>
    </LazyMotion>
  );
}
