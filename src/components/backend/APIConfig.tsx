import * as React from 'react';

import Button from '~/components/Button';
import Field from '~/components/Field';
import SvgYacd from '~/components/SvgYacd';
import { useBackendConfigForm } from '~/modules/backend/hooks';
import type { ClashAPIConfigWithAddedAt } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

import s0 from './APIConfig.module.scss';
import { BackendList } from './BackendList';

type Props = {
  apiConfigs: ClashAPIConfigWithAddedAt[];
  selectedClashAPIConfigIndex: number;
  onAddConfig: (config: ClashAPIConfig) => void;
  onRemoveConfig: (config: ClashAPIConfig) => void;
  onSelectConfig: (config: ClashAPIConfig) => void;
};

const { useRef } = React;

export default function APIConfig({
  apiConfigs,
  selectedClashAPIConfigIndex,
  onAddConfig,
  onRemoveConfig,
  onSelectConfig,
}: Props) {
  const contentEl = useRef(null);
  const { baseURL, secret, errMsg, handleInputOnChange, handleContentOnKeyDown, onConfirm } =
    useBackendConfigForm({ onAddConfig });

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={s0.root} ref={contentEl} onKeyDown={handleContentOnKeyDown}>
      <div className={s0.header}>
        <div className={s0.icon}>
          <SvgYacd width={160} height={160} stroke="var(--stroke)" />
        </div>
      </div>
      <div className={s0.body}>
        <div className={s0.hostnamePort}>
          <Field
            id="baseURL"
            name="baseURL"
            label="API Base URL"
            type="text"
            placeholder="http://127.0.0.1:9090"
            value={baseURL}
            onChange={handleInputOnChange}
          />
          <Field
            id="secret"
            name="secret"
            label="Secret(optional)"
            value={secret}
            type="text"
            onChange={handleInputOnChange}
          />
        </div>
      </div>
      <div className={s0.error}>{errMsg ? errMsg : null}</div>
      <div className={s0.footer}>
        <Button label="Add" onClick={onConfirm} />
      </div>
      <div style={{ height: 20 }} />
      <BackendList
        apiConfigs={apiConfigs}
        selectedClashAPIConfigIndex={selectedClashAPIConfigIndex}
        onRemove={onRemoveConfig}
        onSelect={onSelectConfig}
      />
    </div>
  );
}
