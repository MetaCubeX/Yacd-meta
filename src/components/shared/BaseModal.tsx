import cx from 'clsx';
import * as React from 'react';

import Modal from '../Modal';
import modalStyle from '../Modal.module.scss';

import s from './BaseModal.module.scss';

const { useMemo } = React;

type BaseModalProps = {
  isOpen: boolean;
  onRequestClose: (...args: any[]) => unknown;
  children: React.ReactNode;
};

export default function BaseModal({ isOpen, onRequestClose, children }: BaseModalProps) {
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
      className={className}
      overlayClassName={cx(modalStyle.overlay, s.overlay)}
    >
      {children}
    </Modal>
  );
}
