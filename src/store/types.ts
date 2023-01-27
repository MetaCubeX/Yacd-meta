import type { ClashAPIConfig } from '~/types';

export type ClashAPIConfigWithAddedAt = ClashAPIConfig & { addedAt?: number };
export type StateApp = {
  selectedClashAPIConfigIndex: number;
  clashAPIConfigs: ClashAPIConfigWithAddedAt[];

  latencyTestUrl: string;
  selectedChartStyleIndex: number;
  theme: string;

  collapsibleIsOpen: Record<string, boolean>;
  proxySortBy: string;
  hideUnavailableProxies: boolean;
  autoCloseOldConns: boolean;
  logStreamingPaused: boolean;
};

export type ClashTunConfig = {
  enable: boolean;
  device?: string;
  stack: string;
  'dns-hijack': string[];
  'auto-route': boolean;
};

export type ClashGeneralConfig = {
  port: number;
  'socks-port': number;
  'mixed-port': number;
  'redir-port': number;
  'tproxy-port': number;
  'mitm-port'?: number;
  'allow-lan': boolean;
  'interface-name'?: string;
  mode: string;
  'log-level': string;
  sniffing?: boolean;
  tun?: ClashTunConfig;
};

export type TunPartial<T> = {
  [P in keyof T]?: T[P] extends ClashTunConfig ? TunPartial<T[P]> : T[P];
};

///// store.proxies

type LatencyHistory = Array<{ time: string; delay: number }>;
type PrimitiveProxyType = 'Shadowsocks' | 'Snell' | 'Socks5' | 'Http' | 'Vmess';

export type SubscriptionInfo = {
  Download?: number;
  Upload?: number;
  Total?: number;
  Expire?: number;
};
export type ProxyItem = {
  name: string;
  type: PrimitiveProxyType;
  udp: boolean;
  xudp?: boolean;
  tfo: boolean;
  history: LatencyHistory;
  all?: string[];
  now?: string;
};
export type ProxiesMapping = Record<string, ProxyItem>;
export type DelayMapping = Record<string, { number?: number }>;

export type ProxyProvider = {
  name: string;
  type: 'Proxy';
  updatedAt: string;
  vehicleType: 'HTTP' | 'File' | 'Compatible';
  proxies: Array<ProxyItem>;
  subscriptionInfo?: SubscriptionInfo;
};

export type FormattedProxyProvider = Omit<ProxyProvider, 'proxies'> & {
  proxies: string[];
};

export type SwitchProxyCtxItem = { groupName: string; itemName: string };
type SwitchProxyCtx = {
  to: SwitchProxyCtxItem;
};
export type StateProxies = {
  proxies: ProxiesMapping;
  delay: DelayMapping;
  groupNames: string[];
  proxyProviders?: FormattedProxyProvider[];
  dangleProxyNames?: string[];

  showModalClosePrevConns: boolean;
  switchProxyCtx?: SwitchProxyCtx;
};

///// store.logs

export type Log = {
  time: string;
  even: boolean;
  payload: string;
  type: string;
  id: string;
};

export type StateLogs = {
  searchText: string;
  logs: Log[];
  tail: number;
};

///// store.configs

export type StateConfigs = {
  configs: ClashGeneralConfig;
  haveFetchedConfig: boolean;
};

///// store.modals

export type StateModals = {
  apiConfig: boolean;
};

//////

export type State = {
  app: StateApp;
  configs: StateConfigs;
  proxies: StateProxies;
  logs: StateLogs;
  modals: StateModals;
};

export type GetStateFn = () => State;
export interface DispatchFn {
  (msg: string, change: (s: State) => void): void;
  (action: (dispatch: DispatchFn, getState: GetStateFn) => Promise<void>): ReturnType<
    typeof action
  >;
  (action: (dispatch: DispatchFn, getState: GetStateFn) => void): ReturnType<typeof action>;
}
