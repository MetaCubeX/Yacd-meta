import cx from 'clsx';
import { formatDistance } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import React from 'react';
import { useTranslation } from 'react-i18next';


import { FormattedConn } from '~/store/connections';

import prettyBytes from '../misc/pretty-bytes';

import Modal from './Modal';
import modalStyle from './Modal.module.scss';
import s from './ModalConnectionDetails.module.scss';

type Props = {
  isOpen: boolean;
  onRequestClose: () => void;
  connection?: FormattedConn;
};

export default function ModalConnectionDetails({ isOpen, onRequestClose, connection }: Props) {
  const { t, i18n } = useTranslation();

  let locale = enUS;
  if (i18n.language === 'zh-CN') {
    locale = zhCN;
  } else if (i18n.language === 'zh-TW') {
    locale = zhTW;
  }

  if (!connection) return null;

  const rows = [
    { label: 'ID', value: connection.id },
    { label: 'Host', value: connection.host },
    { label: 'Sniff Host', value: connection.sniffHost },
    { label: 'Process', value: connection.process },
    { label: 'Destination', value: `${connection.destinationIP}:${connection.destinationPort}` },
    { label: 'Remote Destination', value: connection.remoteDestination },
    { label: 'Rule', value: connection.rule },
    { label: 'Chains', value: connection.chains },
    { label: 'Type', value: connection.type },
    { label: 'Network', value: connection.network },
    { label: 'Source', value: `${connection.sourceIP}:${connection.sourcePort}` },
    { label: 'Upload', value: prettyBytes(connection.upload) },
    { label: 'Download', value: prettyBytes(connection.download) },
    {
      label: 'Start Time',
      value: formatDistance(connection.start, 0, { locale }),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className={cx(modalStyle.content, s.content)}
      overlayClassName={cx(modalStyle.overlay, s.overlay)}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      <div className={s.header}>{t('Connection Details')}</div>
      <div className={s.details}>
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <div className={s.label}>{row.label}:</div>
            <div className={s.value}>{row.value || '-'}</div>
          </React.Fragment>
        ))}
      </div>
    </Modal>
  );
}
