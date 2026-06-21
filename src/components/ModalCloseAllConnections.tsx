import cx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Button from './Button';
import Modal from './Modal';
import modalStyle from './Modal.module.scss';
import s from './ModalCloseAllConnections.module.scss';

const { useRef, useCallback, useMemo } = React;

type Props = {
  confirm?: string;
  isOpen: boolean;
  onRequestClose: () => void;
  primaryButtonOnTap: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
};

export default function Comp({
  confirm = 'close_all_confirm',
  isOpen,
  onRequestClose,
  primaryButtonOnTap,
}: Props) {
  const { t } = useTranslation();
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const onAfterOpen = useCallback(() => {
    if (primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, []);
  const className = useMemo(
    () => ({
      base: cx(modalStyle.content, s.cnt),
      afterOpen: s.afterOpen,
      beforeClose: '',
    }),
    []
  );
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      onAfterOpen={onAfterOpen}
      className={className}
      overlayClassName={cx(modalStyle.overlay, s.overlay)}
    >
      <p>{t(confirm)}</p>
      <div className={s.btngrp}>
        <Button onClick={primaryButtonOnTap} ref={primaryButtonRef}>
          {t('close_all_confirm_yes')}
        </Button>
        <div style={{ width: 20 }} />
        <Button onClick={onRequestClose}>{t('close_all_confirm_no')}</Button>
      </div>
    </Modal>
  );
}
