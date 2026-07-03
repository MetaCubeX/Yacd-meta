import React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/Button';
import Input from '~/components/Input';
import BaseModal from '~/components/shared/BaseModal';

import s from './ModalSourceIP.module.scss';

export default function ModalSourceIP({ isOpen, onRequestClose, sourceMap, setSourceMap }) {
  const { t } = useTranslation();
  const setSource = (key, index, val) => {
    setSourceMap((prev) =>
      prev.map((source, currentIndex) =>
        currentIndex === index ? { ...source, [key]: val } : source
      )
    );
  };

  const removeSource = (index) => {
    setSourceMap((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const addSource = () => {
    setSourceMap((prev) => [...prev, { reg: '', name: '' }]);
  };

  return (
    <BaseModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <table className={s.sourceipTable}>
        <thead>
          <tr>
            <th>{t('c_source')}</th>
            <th>{t('device_name')}</th>
          </tr>
        </thead>
        <tbody>
          {sourceMap.map((source, index) => (
            <tr key={`${index}`}>
              <td>
                <Input
                  type="text"
                  name="reg"
                  autoComplete="off"
                  value={source.reg}
                  onChange={(e) => setSource('reg', index, e.target.value)}
                />
              </td>
              <td>
                <Input
                  type="text"
                  name="name"
                  autoComplete="off"
                  value={source.name}
                  onChange={(e) => setSource('name', index, e.target.value)}
                />
              </td>
              <td>
                <Button onClick={() => removeSource(index)}>{t('delete')}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <div className={s.iptableTipContainer}>{t('sourceip_tip')}</div>
        <Button onClick={addSource}>{t('add_tag')}</Button>
      </div>
    </BaseModal>
  );
}
