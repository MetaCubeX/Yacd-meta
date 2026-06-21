import './Connections.css';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';

import { Pause, Play, RefreshCcw, Settings, Tag, X as IconClose } from '~/components/shared/FeatherIcons';
import Select from '~/components/shared/Select';
import {
  useConnectionColumns,
  useConnectionFilters,
  useConnectionsStream,
  useSourceMapState,
} from '~/modules/connections/hooks';
import { CONNECTIONS_PADDING_BOTTOM } from '~/modules/connections/utils';
import { FormattedConn } from '~/store/connections';
import { ClashAPIConfig } from '~/types';

import * as connAPI from '../api/connections';
import useRemainingViewPortHeight from '../hooks/useRemainingViewPortHeight';

import s from './Connections.module.scss';
import ConnectionTable from './ConnectionTable';
import ContentHeader from './ContentHeader';
import Input from './Input';
import ModalCloseAllConnections from './ModalCloseAllConnections';
import ModalManageConnectionColumns from './ModalManageConnectionColumns';
import ModalSourceIP from './ModalSourceIP';
import { Fab, position as fabPosition } from './shared/Fab';
import SvgYacd from './SvgYacd';

const { useState, useCallback } = React;

function renderTableOrPlaceholder(
  columns,
  hiddenColumns,
  conns: FormattedConn[],
  height: number,
  apiConfig: ClashAPIConfig
) {
  return conns.length > 0 ? (
    <ConnectionTable
      data={conns}
      columns={columns}
      hiddenColumns={hiddenColumns}
      height={height}
      apiConfig={apiConfig}
    />
  ) : (
    <div className={s.placeHolder}>
      <SvgYacd width={200} height={200} c1="var(--color-text)" />
    </div>
  );
}

function ConnQty({ qty }) {
  return qty < 100 ? '' + qty : '99+';
}

type Props = {
  apiConfig: ClashAPIConfig;
};

export default function Connections({ apiConfig }: Props) {
  const { t } = useTranslation();
  const [showModalColumn, setModalColumn] = useState(false);
  const { hiddenColumns, setHiddenColumns, columns, setColumns, resetColumns } =
    useConnectionColumns();

  const closeModalColumn = () => {
    setModalColumn(false);
  };

  const { sourceMapModal, sourceMap, setSourceMap, openModalSource, closeModalSource } =
    useSourceMapState();
  const [refContainer, containerHeight] = useRemainingViewPortHeight();
  const { conns, closedConns, isRefreshPaused, toggleIsRefreshPaused, closeAllConnections } =
    useConnectionsStream(apiConfig, sourceMap);
  const {
    filterKeyword,
    setFilterKeyword,
    filterSourceIpStr,
    setFilterSourceIpStr,
    filteredConns,
    filteredClosedConns,
    connIpSet,
  } = useConnectionFilters({ conns, closedConns, sourceMap, t });

  const [isCloseFilterModalOpen, setIsCloseFilterModalOpen] = useState(false);
  const openCloseFilterModal = useCallback(() => setIsCloseFilterModalOpen(true), []);
  const closeCloseFilterModal = useCallback(() => setIsCloseFilterModalOpen(false), []);

  const closeFilterConnections = useCallback(async () => {
    for (const connection of filteredConns) {
      await connAPI.closeConnById(apiConfig, connection.id);
    }
    closeCloseFilterModal();
  }, [apiConfig, filteredConns, closeCloseFilterModal]);
  const [isCloseAllModalOpen, setIsCloseAllModalOpen] = useState(false);
  const openCloseAllModal = useCallback(() => setIsCloseAllModalOpen(true), []);
  const closeCloseAllModal = useCallback(() => setIsCloseAllModalOpen(false), []);
  const handleCloseAllConnections = useCallback(() => {
    closeAllConnections();
    closeCloseAllModal();
  }, [closeAllConnections, closeCloseAllModal]);

  return (
    <div>
      <Tabs>
        <ContentHeader>
          <div className={s.controls}>
            <div className={s.tabGroup}>
              <TabList className={s.tabList}>
                <Tab>
                  <span>{t('Active')}</span>
                  <span className={s.connQty}>
                    <ConnQty qty={filteredConns.length} />
                  </span>
                </Tab>
                <Tab>
                  <span>{t('Closed')}</span>
                  <span className={s.connQty}>
                    <ConnQty qty={filteredClosedConns.length} />
                  </span>
                </Tab>
              </TabList>
              <Select
                options={connIpSet}
                selected={filterSourceIpStr}
                className={s.sourceSelect}
                onChange={(e) => setFilterSourceIpStr(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} />
            <div className={s.inputWrapper}>
              <Input
                type="text"
                name="filter"
                autoComplete="off"
                className={s.input}
                value={filterKeyword}
                placeholder={t('Search')}
                onChange={(e) => setFilterKeyword(e.target.value)}
              />
            </div>
            <div className={s.toolbar}>
              <button
                className={s.toolbarBtn}
                onClick={openCloseAllModal}
                title={t('close_all_connections')}
              >
                <IconClose size={15} />
              </button>
              <button
                className={s.toolbarBtn}
                onClick={openCloseFilterModal}
                title={t('close_filter_connections')}
              >
                <IconClose size={13} />
                <span className={s.toolbarBtnBadge}>F</span>
              </button>
              <span className={s.toolbarDivider} />
              <button
                className={s.toolbarBtn}
                onClick={() => setModalColumn(true)}
                title={t('manage_column')}
              >
                <Settings size={15} />
              </button>
              <button className={s.toolbarBtn} onClick={resetColumns} title={t('reset_column')}>
                <RefreshCcw size={15} />
              </button>
              <button className={s.toolbarBtn} onClick={openModalSource} title={t('client_tag')}>
                <Tag size={15} />
              </button>
            </div>
          </div>
        </ContentHeader>
        <div ref={refContainer} className={s.contentWrapper}>
          <div
            className={s.scrollArea}
            style={{
              height: containerHeight - CONNECTIONS_PADDING_BOTTOM,
            }}
          >
            <TabPanel>
              {renderTableOrPlaceholder(
                columns,
                hiddenColumns,
                filteredConns,
                containerHeight - CONNECTIONS_PADDING_BOTTOM,
                apiConfig
              )}
              <Fab
                icon={isRefreshPaused ? <Play size={16} /> : <Pause size={16} />}
                mainButtonStyles={isRefreshPaused ? { background: '#e74c3c' } : {}}
                style={fabPosition}
                text={isRefreshPaused ? t('Resume Refresh') : t('Pause Refresh')}
                onClick={toggleIsRefreshPaused}
              />
            </TabPanel>
            <TabPanel>
              {renderTableOrPlaceholder(
                columns,
                hiddenColumns,
                filteredClosedConns,
                containerHeight - CONNECTIONS_PADDING_BOTTOM,
                apiConfig
              )}
            </TabPanel>
          </div>
        </div>
        <ModalCloseAllConnections
          isOpen={isCloseAllModalOpen}
          primaryButtonOnTap={handleCloseAllConnections}
          onRequestClose={closeCloseAllModal}
        />
        <ModalCloseAllConnections
          confirm={'close_filter_connections'}
          isOpen={isCloseFilterModalOpen}
          primaryButtonOnTap={closeFilterConnections}
          onRequestClose={closeCloseFilterModal}
        />
        <ModalManageConnectionColumns
          isOpen={showModalColumn}
          onRequestClose={closeModalColumn}
          columns={columns}
          hiddenColumns={hiddenColumns}
          setColumns={setColumns}
          setHiddenColumns={setHiddenColumns}
        />
        <ModalSourceIP
          isOpen={sourceMapModal}
          onRequestClose={closeModalSource}
          sourceMap={sourceMap}
          setSourceMap={setSourceMap}
        />
      </Tabs>
    </div>
  );
}
