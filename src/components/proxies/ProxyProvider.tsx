import { formatDistance } from 'date-fns';
import * as React from 'react';
import { RotateCw, Zap } from 'react-feather';

import Button from '~/components/Button';
import Collapsible from '~/components/Collapsible';
import CollapsibleSectionHeader from '~/components/CollapsibleSectionHeader';
import { useUpdateProviderItem } from '~/components/proxies/proxies.hooks';
import { connect, useStoreActions } from '~/components/StateProvider';
import { framerMotionResouce } from '~/misc/motion';
import {
  getClashAPIConfig,
  getCollapsibleIsOpen,
  getHideUnavailableProxies,
  getProxySortBy,
} from '~/store/app';
import { getDelay, healthcheckProviderByName } from '~/store/proxies';
import { DelayMapping, SubscriptionInfo } from '~/store/types';

import { useFilteredAndSorted } from './hooks';
import { ProxyList, ProxyListSummaryView } from './ProxyList';
import s from './ProxyProvider.module.scss';

const { useState, useCallback } = React;

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
  dispatch: (x: any) => Promise<any>;
  isOpen: boolean;
  apiConfig: any;
};

function ProxyProviderImpl({
  name,
  proxies: all,
  delay,
  hideUnavailableProxies,
  proxySortBy,
  vehicleType,
  updatedAt,
  subscriptionInfo,
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
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <CollapsibleSectionHeader
          name={name}
          toggle={toggle}
          type={vehicleType}
          isOpen={isOpen}
          qty={proxies.length}
        />
        <Button kind="minimal" start={<Refresh />} onClick={updateProvider} />
        <Button
          kind="minimal"
          start={<Zap size={16} />}
          onClick={healthcheckProvider}
          isLoading={isHealthcheckLoading}
        />
      </div>
      {subscriptionInfo && (
        <div className={s.updatedAt}>
          <small>
            {used} / {total} ( {percentage}% ) &nbsp;&nbsp; Expire: {expireStr()}{' '}
          </small>
        </div>
      )}
      <div className={s.updatedAt}>
        <small>Updated {timeAgo} ago</small>
      </div>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element[]; isOpen: boolean; }' i... Remove this comment to see the full error message */}
      <Collapsible isOpen={isOpen}>
        <ProxyList all={proxies} />
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
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element; isOpen: boolean; }' is ... Remove this comment to see the full error message */}
      <Collapsible isOpen={!isOpen}>
        <ProxyListSummaryView all={proxies} />
      </Collapsible>
    </div>
  );
}

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
  const module = framerMotionResouce.read();
  const motion = module.motion;
  return (
    <motion.div
      className={s.refresh}
      variants={button}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      <motion.div className="flexCenter" variants={arrow}>
        <RotateCw size={16} />
      </motion.div>
    </motion.div>
  );
}

const mapState = (s, { proxies, name }) => {
  const hideUnavailableProxies = getHideUnavailableProxies(s);
  const delay = getDelay(s);
  const collapsibleIsOpen = getCollapsibleIsOpen(s);
  const apiConfig = getClashAPIConfig(s);

  const proxySortBy = getProxySortBy(s);

  return {
    apiConfig,
    proxies,
    delay,
    hideUnavailableProxies,
    proxySortBy,
    isOpen: collapsibleIsOpen[`proxyProvider:${name}`],
  };
};

export const ProxyProvider = connect(mapState)(ProxyProviderImpl);
