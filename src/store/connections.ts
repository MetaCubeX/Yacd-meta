import { atom } from 'jotai';

export type FormattedConn = {
  id: string;
  upload: number;
  download: number;
  start: number;
  startTime: number;
  /** 简写代理链：「策略组 -> 末端节点」 */
  chains: string;
  /** 末端出站节点 */
  chainNode: string;
  /** 最外层策略组，单跳时为空 */
  chainGroup: string;
  /** 完整代理链，由外向内每一跳 */
  chainsFull: string;
  /** Direct / Proxy / Reject */
  outboundType: string;
  rule: string;
  destinationPort: string;
  destinationIP: string;
  remoteDestination: string;
  sourceIP: string;
  sourcePort: string;
  source: string;
  host: string;
  sniffHost: string;
  type: string;
  network: string;
  process?: string;
  downloadSpeedCurr: number;
  uploadSpeedCurr: number;
};

// 当前活跃连接
export const connectionsState = atom<FormattedConn[]>([]);

// 已关闭连接
export const closedConnectionsState = atom<FormattedConn[]>([]);

// 是否已收到过 /connections 的首条消息。之前 connectionsState 的空数组只是初始值，
// 不能当成「没有连接」显示空态
export const connectionsReceivedState = atom<boolean>(false);

// 连接刷新暂停状态
export const isRefreshPausedState = atom<boolean>(false);

// 核心启动以来的累计流量，由 /connections 的 WebSocket 消息直接给出
export const connectionsTotalState = atom<{ download: number; upload: number }>({
  download: 0,
  upload: 0,
});

// 最大已关闭连接数量限制
export const MAX_CLOSED_CONNECTIONS = 100;
