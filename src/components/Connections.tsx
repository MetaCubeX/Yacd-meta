import './Connections.css';

import React from 'react';
import { Pause, Play, X as IconClose } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';

import { ConnectionItem } from '~/api/connections';
import { State } from '~/store/types';

import * as connAPI from '../api/connections';
import useRemainingViewPortHeight from '../hooks/useRemainingViewPortHeight';
import { getClashAPIConfig } from '../store/app';
import Button from './Button';
import s from './Connections.module.scss';
import ConnectionTable from './ConnectionTable';
import ContentHeader from './ContentHeader';
import ModalCloseAllConnections from './ModalCloseAllConnections';
import { Action, Fab, position as fabPosition } from './shared/Fab';
import { connect } from './StateProvider';
import SvgYacd from './SvgYacd';

const { useEffect, useState, useRef, useCallback } = React;

const paddingBottom = 30;

function arrayToIdKv<T extends { id: string }>(items: T[]) {
  const o = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    o[item.id] = item;
  }
  return o;
}

type FormattedConn = {
  id: string;
  upload: number;
  download: number;
  start: number;
  chains: string;
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
  downloadSpeedCurr?: number;
  uploadSpeedCurr?: number;
};

function hasSubstring(s: string, pat: string) {
  return s.toLowerCase().includes(pat.toLowerCase());
}

function filterConnIps(conns: FormattedConn[], ipStr: string) {
  return conns.filter((each) => each.sourceIP === ipStr);
}

function filterConns(conns: FormattedConn[], keyword: string, sourceIp: string) {
  let result = conns;
  if (keyword !== '') {
    result = conns.filter((conn) =>
      [
        conn.host,
        conn.sourceIP,
        conn.sourcePort,
        conn.destinationIP,
        conn.chains,
        conn.rule,
        conn.type,
        conn.network,
        conn.process,
      ].some((field) => {
        return hasSubstring(field, keyword);
      })
    );
  }
  if (sourceIp !== '') {
    result = filterConnIps(result, sourceIp);
  }

  return result;
}

function getConnIpList(conns: FormattedConn[]) {
  return Array.from(new Set(conns.map((x) => x.sourceIP))).sort();
}

function formatConnectionDataItem(
  i: ConnectionItem,
  prevKv: Record<string, { upload: number; download: number }>,
  now: number
): FormattedConn {
  const { id, metadata, upload, download, start, chains, rule, rulePayload } = i;
  const {
    host,
    destinationPort,
    destinationIP,
    remoteDestination,
    network,
    type,
    sourceIP,
    sourcePort,
    process,
    sniffHost,
  } = metadata;
  // host could be an empty string if it's direct IP connection
  let host2 = host;
  if (host2 === '') host2 = destinationIP;
  const prev = prevKv[id];
  const ret = {
    id,
    upload,
    download,
    start: now - new Date(start).valueOf(),
    chains: modifyChains(chains),
    rule: !rulePayload ? rule : `${rule} :: ${rulePayload}`,
    ...metadata,
    host: `${host2}:${destinationPort}`,
    sniffHost: sniffHost ? sniffHost : '-',
    type: `${type}(${network})`,
    source: `${sourceIP}:${sourcePort}`,
    downloadSpeedCurr: download - (prev ? prev.download : 0),
    uploadSpeedCurr: upload - (prev ? prev.upload : 0),
    process: process ? process : '-',
    destinationIP: remoteDestination || destinationIP || host,
  };
  return ret;
}
function modifyChains(chains: string[]): string {
  if (!Array.isArray(chains) || chains.length === 0) {
    return '';
  }

  if (chains.length === 1) {
    return chains[0];
  }

  //倒序
  if (chains.length === 2) {
    return chains[1] + ' / ' + chains[0];
  }

  const first = chains.pop();
  const last = chains.shift();
  return `${first} / ${last}`;
}

function renderTableOrPlaceholder(conns: FormattedConn[]) {
  return conns.length > 0 ? (
    <ConnectionTable data={conns} />
  ) : (
    <div className={s.placeHolder}>
      <SvgYacd width={200} height={200} c1="var(--color-text)" />
    </div>
  );
}

function ConnQty({ qty }) {
  return qty < 100 ? '' + qty : '99+';
}

function Conn({ apiConfig }) {
  const [refContainer, containerHeight] = useRemainingViewPortHeight();

  const [conns, setConns] = useState([]);
  const [closedConns, setClosedConns] = useState([]);

  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterSourceIpStr, setFilterSourceIpStr] = useState('');

  const filteredConns = filterConns(conns, filterKeyword, filterSourceIpStr);
  const filteredClosedConns = filterConns(closedConns, filterKeyword, filterSourceIpStr);

  const connIpSet = getConnIpList(conns);
  const ClosedConnIpSet = getConnIpList(closedConns);

  const [isCloseAllModalOpen, setIsCloseAllModalOpen] = useState(false);
  const openCloseAllModal = useCallback(() => setIsCloseAllModalOpen(true), []);
  const closeCloseAllModal = useCallback(() => setIsCloseAllModalOpen(false), []);
  const [isRefreshPaused, setIsRefreshPaused] = useState(false);
  const toggleIsRefreshPaused = useCallback(() => {
    setIsRefreshPaused((x) => !x);
  }, []);
  const closeAllConnections = useCallback(() => {
    connAPI.closeAllConnections(apiConfig);
    closeCloseAllModal();
  }, [apiConfig, closeCloseAllModal]);
  const prevConnsRef = useRef(conns);
  const read = useCallback(
    ({ connections }) => {
      const prevConnsKv = arrayToIdKv(prevConnsRef.current);
      const now = Date.now();
      const x = connections.map((c: ConnectionItem) =>
        formatConnectionDataItem(c, prevConnsKv, now)
      );
      const closed = [];
      for (const c of prevConnsRef.current) {
        const idx = x.findIndex((conn: ConnectionItem) => conn.id === c.id);
        if (idx < 0) closed.push(c);
      }
      setClosedConns((prev) => {
        // keep max 100 entries
        return [...closed, ...prev].slice(0, 101);
      });
      // if previous connections and current connections are both empty
      // arrays, we wont update state to avaoid rerender
      if (x && (x.length !== 0 || prevConnsRef.current.length !== 0) && !isRefreshPaused) {
        prevConnsRef.current = x;
        setConns(x);
      } else {
        prevConnsRef.current = x;
      }
    },
    [setConns, isRefreshPaused]
  );
  const [reConnectCount, setReConnectCount] = useState(0);

  useEffect(() => {
    return connAPI.fetchData(apiConfig, read, () => {
      setTimeout(() => {
        setReConnectCount((prev) => prev + 1);
      }, 1000);
    });
  }, [apiConfig, read, reConnectCount, setReConnectCount]);

  const { t } = useTranslation();

  return (
    <div>
      <ContentHeader title={t('Connections')} />
      <Tabs>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <TabList>
            <Tab>
              <span>{t('Active')}</span>
              <span className={s.connQty}>
                {/* @ts-expect-error ts-migrate(2786) FIXME: 'ConnQty' cannot be used as a JSX component. */}
                <ConnQty qty={filteredConns.length} />
              </span>
            </Tab>
            <Tab>
              <span>{t('Closed')}</span>
              <span className={s.connQty}>
                {/* @ts-expect-error ts-migrate(2786) FIXME: 'ConnQty' cannot be used as a JSX component. */}
                <ConnQty qty={filteredClosedConns.length} />
              </span>
            </Tab>
          </TabList>
          <div className={s.inputWrapper}>
            <input
              type="text"
              name="filter"
              autoComplete="off"
              className={s.input}
              placeholder={t('Search')}
              onChange={(e) => setFilterKeyword(e.target.value)}
            />
          </div>
        </div>
        <div ref={refContainer} style={{ padding: 30, paddingBottom, paddingTop: 0 }}>
          <div
            style={{
              height: containerHeight - paddingBottom,
              overflow: 'auto',
            }}
          >
            <TabPanel>
              <Button onClick={() => setFilterSourceIpStr('')} kind="minimal">
                {t('All')}
              </Button>
              {connIpSet.map((value, k) => {
                return (
                  <Button key={k} onClick={() => setFilterSourceIpStr(value)} kind="minimal">
                    {value}
                  </Button>
                );
              })}
              {renderTableOrPlaceholder(filteredConns)}
              <Fab
                icon={isRefreshPaused ? <Play size={16} /> : <Pause size={16} />}
                mainButtonStyles={isRefreshPaused ? { background: '#e74c3c' } : {}}
                style={fabPosition}
                text={isRefreshPaused ? t('Resume Refresh') : t('Pause Refresh')}
                onClick={toggleIsRefreshPaused}
              >
                <Action text={t('close_all_connections')} onClick={openCloseAllModal}>
                  <IconClose size={10} />
                </Action>
              </Fab>
            </TabPanel>
            <TabPanel>
              <Button onClick={() => setFilterSourceIpStr('')} kind="minimal">
                {t('All')}
              </Button>
              {ClosedConnIpSet.map((value, k) => {
                return (
                  <Button key={k} onClick={() => setFilterSourceIpStr(value)} kind="minimal">
                    {value}
                  </Button>
                );
              })}
              {renderTableOrPlaceholder(filteredClosedConns)}
            </TabPanel>
          </div>
        </div>
        <ModalCloseAllConnections
          isOpen={isCloseAllModalOpen}
          primaryButtonOnTap={closeAllConnections}
          onRequestClose={closeCloseAllModal}
        />
      </Tabs>
    </div>
  );
}

const mapState = (s: State) => ({
  apiConfig: getClashAPIConfig(s),
});

export default connect(mapState)(Conn);
