import React from 'react';
import { useTranslation } from 'react-i18next';

import BaseModal from '~/components/shared/BaseModal';

import Button from './Button';
import Input from './Input';
import s from './ModalSourceIP.module.scss';

export default function ModalSourceIP({ isOpen, onRequestClose, sourceMap, setSourceMap }) {
  const { t } = useTranslation();
  const setSource = (key, index, val) => {
    sourceMap[index][key] = val;
    setSourceMap(Array.from(sourceMap));
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
                <Button onClick={() => sourceMap.splice(index, 1)}>{t('delete')}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <div className={s.iptableTipContainer}>{t('sourceip_tip')}</div>
        <Button onClick={() => sourceMap.push({ reg: '', name: '' })}>{t('add_tag')}</Button>
      </div>
    </BaseModal>
  );
}
