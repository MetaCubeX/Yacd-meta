import { TooltipPopup, useTooltip } from '@reach/tooltip';
import cx from 'clsx';
import * as React from 'react';

import { keyCodes } from '~/misc/keycode';
import {
  getLatencyTestUrl,
} from '~/store/app';
import { ProxyItem } from '~/store/types';

import { getDelay, getProxies, NonProxyTypes } from '../../store/proxies';
import { connect } from '../StateProvider';
import s0 from './Proxy.module.scss';
import { ProxyLatency } from './ProxyLatency';

const { useMemo } = React;

const colorMap = {
  // green
  good: '#67c23a',
  // yellow
  normal: '#d4b75c',
  // orange
  bad: '#e67f3c',
  // bad: '#F56C6C',
  na: '#909399',
};

function getLabelColor({
  number,
}: {
  number?: number;
} = {},
  httpsTest: boolean) {
  const delayMap = {
    good: httpsTest ? 800 : 200,
    normal: httpsTest ? 1500 : 500,
  };
  if (number === 0) {
    return colorMap.na;
  } else if (number < delayMap.good) {
    return colorMap.good;
  } else if (number < delayMap.normal) {
    return colorMap.normal;
  } else if (typeof number === 'number') {
    return colorMap.bad;
  }
  return colorMap.na;
}

function getProxyDotBackgroundColor(
  latency: {
    number?: number;
  },
  proxyType: string,
  httpsTest: boolean,
) {
  if (NonProxyTypes.indexOf(proxyType) > -1) {
    return 'linear-gradient(135deg, white 15%, #999 15% 30%, white 30% 45%, #999 45% 60%, white 60% 75%, #999 75% 90%, white 90% 100%)';
  }
  return getLabelColor(latency, httpsTest);
}

type ProxyProps = {
  name: string;
  now?: boolean;
  proxy: ProxyItem;
  latency: any;
  httpsLatencyTest: boolean,
  isSelectable?: boolean;
  udp: boolean;
  tfo: boolean;
  onClick?: (proxyName: string) => unknown;
};

function ProxySmallImpl({ now, name, proxy, latency, httpsLatencyTest, isSelectable, onClick }: ProxyProps) {
  const color = useMemo(() => getProxyDotBackgroundColor(latency, proxy.type, httpsLatencyTest), [latency, proxy]);
  const title = useMemo(() => {
    let ret = name;
    if (latency && typeof latency.number === 'number') {
      ret += ' ' + latency.number + ' ms';
    }
    return ret;
  }, [name, latency]);

  const doSelect = React.useCallback(() => {
    isSelectable && onClick && onClick(name);
  }, [name, onClick, isSelectable]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.keyCode === keyCodes.Enter) {
        doSelect();
      }
    },
    [doSelect]
  );

  return (
    <div
      title={title}
      className={cx(s0.proxySmall, {
        [s0.selectable]: isSelectable,
      })}
      style={{ background: color, scale: now ? '1.6' : '1' }}
      onClick={doSelect}
      onKeyDown={handleKeyDown}
      role={isSelectable ? 'menuitem' : ''}
    >
      {now && <div className={s0.now} />}
    </div>
  );
}

function formatProxyType(t: string) {
  if (t === 'Shadowsocks') return 'SS';
  return t;
}

const positionProxyNameTooltip = (triggerRect: { left: number; top: number }) => {
  return {
    left: triggerRect.left + window.scrollX - 5,
    top: triggerRect.top + window.scrollY - 38,
  };
};

function ProxyNameTooltip({ children, label, 'aria-label': ariaLabel }) {
  const [trigger, tooltip] = useTooltip();
  return (
    <>
      {React.cloneElement(children, trigger)}
      <TooltipPopup
        {...tooltip}
        label={label}
        aria-label={ariaLabel}
        position={positionProxyNameTooltip}
      />
    </>
  );
}

function ProxyImpl({ now, name, proxy, latency, httpsLatencyTest, isSelectable, onClick }: ProxyProps) {
  const color = useMemo(() => getLabelColor(latency, httpsLatencyTest), [latency]);
  const doSelect = React.useCallback(() => {
    isSelectable && onClick && onClick(name);
  }, [name, onClick, isSelectable]);
  function formatUdpType(udp: boolean, xudp?: boolean) {
    if (!udp) return '';
    return xudp ? 'XUDP' : 'UDP';
  }
  function formatTfo(t: boolean) {
    if (!t) return '';
    return (
      <svg
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="2962"
        width="10"
        height="10"
      >
        <path
          d="M648.093513 719.209284l-1.492609-40.940127 31.046263-26.739021c202.73892-174.805813 284.022131-385.860697 255.70521-561.306199-176.938111-28.786027-389.698834 51.857494-563.907604 254.511123l-26.31256 30.619803-40.38573-0.938211c-60.557271-1.407317-111.903014 12.79379-162.822297 47.0385l189.561318 127.084977-37.95491 68.489421c-9.126237 16.461343-0.554398 53.307457 29.084549 82.818465 29.5963 29.511008 67.380626 38.381369 83.287571 29.852176l68.318836-36.760822 127.639376 191.267156c36.163779-52.11337 50.450177-103.629696 48.189941-165.039887zM994.336107 16.105249l10.490908 2.686696 2.64405 10.405615c47.46496 178.089552-1.023503 451.492838-274.170913 686.898568 4.051367 111.263324-35.396151 200.222809-127.255561 291.741051l-15.779008 15.693715-145.934494-218.731157c-51.217805 27.59194-128.790816 10.405616-183.93205-44.522388-55.226525-55.013296-72.41285-132.287785-43.498885-184.529093L0.002773 430.325513l15.736362-15.65107c89.300652-88.959484 178.64395-128.108481 289.011709-125.549722C539.730114 15.806727 815.56422-31.061189 994.336107 16.105249zM214.93844 805.098259c28.572797 28.572797 22.346486 79.49208-12.537914 114.376479C156.428175 965.489735 34.034254 986.002445 34.034254 986.002445s25.331704-127.084978 66.612998-168.323627c34.8844-34.8844 85.633099-41.281295 114.291188-12.580559zM661.01524 298.549479a63.968948 63.968948 0 1 0 0 127.937897 63.968948 63.968948 0 0 0 0-127.937897z"
          p-id="2963"
        />
      </svg>
    );
  }
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.keyCode === keyCodes.Enter) {
        doSelect();
      }
    },
    [doSelect]
  );
  const className = useMemo(() => {
    return cx(s0.proxy, {
      [s0.now]: now,
      [s0.error]: latency && latency.error,
      [s0.selectable]: isSelectable,
    });
  }, [isSelectable, now, latency]);

  const latencyNumber = latency?.number ?? proxy.history[proxy.history.length - 1]?.delay;

  return (
    <div
      tabIndex={0}
      className={className}
      onClick={doSelect}
      onKeyDown={handleKeyDown}
      role={isSelectable ? 'menuitem' : ''}
    >
      <div className={cx(s0.proxyName, s0.row)}>
        <ProxyNameTooltip label={name} aria-label={`proxy name: ${name}`}>
          <span>{name}</span>
        </ProxyNameTooltip>
        <span className={s0.proxyType} style={{ paddingLeft: 4, opacity: now ? 0.6 : 0.2 }}>
          {formatUdpType(proxy.udp, proxy.xudp)}
        </span>
      </div>

      <div className={s0.row}>
        <div className={s0.row}>
          <span className={s0.proxyType} style={{ paddingRight: 4, opacity: now ? 0.6 : 0.2 }}>
            {formatProxyType(proxy.type)}
          </span>

          {formatTfo(proxy.tfo)}
        </div>

        {latencyNumber ? <ProxyLatency number={latencyNumber} color={color} /> : null}
      </div>
    </div>
  );
}

const mapState = (s: any, { name }) => {
  const proxies = getProxies(s);
  const delay = getDelay(s);
  const latencyTestUrl = getLatencyTestUrl(s);
  return {
    proxy: proxies[name],
    latency: delay[name],
    httpsLatencyTest: latencyTestUrl.startsWith('https://'),
  };
};

export const Proxy = connect(mapState)(ProxyImpl);
export const ProxySmall = connect(mapState)(ProxySmallImpl);
