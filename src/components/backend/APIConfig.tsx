import cx from 'clsx';
import type { TFunction } from 'i18next';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';
import { AlertCircle, CheckCircle, Eye, EyeOff } from '~/components/shared/FeatherIcons';
import { SegmentedControl } from '~/components/shared/SegmentedControl';
import SvgYacd from '~/components/shared/SvgYacd';
import { useToggle } from '~/hooks/basic';
import { useBackendConfigForm } from '~/modules/backend/hooks';
import type { ConnectionTestResult, Protocol } from '~/modules/backend/utils';
import type { ClashAPIConfigWithAddedAt } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

import s from './APIConfig.module.scss';
import { BackendList } from './BackendList';

type Props = {
  apiConfigs: ClashAPIConfigWithAddedAt[];
  selectedClashAPIConfigIndex: number;
  onAddConfig: (config: ClashAPIConfig) => void;
  onRemoveConfig: (config: ClashAPIConfig) => void;
  onSelectConfig: (config: ClashAPIConfig) => void;
  onUpdateConfig: (prev: ClashAPIConfig, next: ClashAPIConfig) => void;
};

function describeTestFailure(result: Exclude<ConnectionTestResult, { ok: true }>, t: TFunction) {
  switch (result.reason) {
    case 'unreachable':
      return t('backend_test_unreachable');
    case 'not_clash':
      return t('backend_test_not_clash');
    case 'http':
      return t('backend_test_failed', { message: result.message });
  }
}

const protocolOptions: { value: Protocol; label: string }[] = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
];

export default function APIConfig({
  apiConfigs,
  selectedClashAPIConfigIndex,
  onAddConfig,
  onRemoveConfig,
  onSelectConfig,
  onUpdateConfig,
}: Props) {
  const { t } = useTranslation();
  const [showSecret, toggleSecret] = useToggle();
  const {
    protocol,
    host,
    port,
    secret,
    errMsg,
    baseURLPreview,
    isTesting,
    testResult,
    editing,
    startEdit,
    cancelEdit,
    handleProtocolOnChange,
    handleInputOnChange,
    handleContentOnKeyDown,
    onTest,
    onConfirm,
  } = useBackendConfigForm({ onAddConfig, onUpdateConfig });

  const SecretIcon = showSecret ? EyeOff : Eye;

  return (
    <div className={s.root} onKeyDown={handleContentOnKeyDown}>
      <header className={s.hero}>
        <div className={s.logo}>
          <SvgYacd width={96} height={96} stroke="var(--stroke)" />
        </div>
        <h1 className={s.title}>
          {editing ? t('backend_form_title_edit') : t('backend_form_title')}
        </h1>
        <p className={s.desc}>{editing ? editing.baseURL : t('backend_form_desc')}</p>
      </header>

      <section className={s.card}>
        <div className={s.grid}>
          <div className={cx(s.field, s.protocol)}>
            <span className={s.label} id="backend-protocol-label">
              {t('protocol')}
            </span>
            <SegmentedControl
              options={protocolOptions}
              value={protocol}
              onChange={handleProtocolOnChange}
              label={t('protocol')}
              className={s.protocolControl}
            />
          </div>

          <div className={cx(s.field, s.host)}>
            <label className={s.label} htmlFor="backend-host">
              {t('host')}
            </label>
            <input
              className={s.input}
              id="backend-host"
              name="host"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="127.0.0.1"
              value={host}
              onChange={handleInputOnChange}
            />
          </div>

          <div className={cx(s.field, s.port)}>
            <label className={s.label} htmlFor="backend-port">
              {t('port')}
            </label>
            <input
              className={s.input}
              id="backend-port"
              name="port"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="9090"
              value={port}
              onChange={handleInputOnChange}
            />
          </div>

          <div className={cx(s.field, s.secret)}>
            <label className={s.label} htmlFor="backend-secret">
              {t('secret')}
              <span className={s.optional}>{t('optional')}</span>
            </label>
            <div className={s.inputWithAction}>
              <input
                className={s.input}
                id="backend-secret"
                name="secret"
                type={showSecret ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={secret}
                onChange={handleInputOnChange}
              />
              <button
                type="button"
                className={s.iconBtn}
                onClick={toggleSecret}
                title={showSecret ? t('hide_secret') : t('show_secret')}
                aria-label={showSecret ? t('hide_secret') : t('show_secret')}
              >
                <SecretIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className={s.actions}>
          <div className={s.status}>
            {errMsg ? (
              <span className={s.error}>
                <AlertCircle size={14} />
                {errMsg}
              </span>
            ) : testResult?.ok ? (
              <span className={s.success}>
                <CheckCircle size={14} />
                {testResult.version
                  ? t('backend_test_ok_version', { version: testResult.version })
                  : t('backend_test_ok')}
              </span>
            ) : testResult ? (
              <span className={s.error}>
                <AlertCircle size={14} />
                {describeTestFailure(testResult, t)}
              </span>
            ) : baseURLPreview ? (
              <span className={s.preview}>{baseURLPreview}</span>
            ) : null}
          </div>
          <div className={s.buttons}>
            <Button
              kind="minimal"
              label={t('test_connection')}
              onClick={onTest}
              isLoading={isTesting}
            />
            {editing ? (
              <Button kind="minimal" label={t('cancel_edit')} onClick={cancelEdit} />
            ) : null}
            <Button label={editing ? t('save_backend') : t('add_backend')} onClick={onConfirm} />
          </div>
        </div>
      </section>

      <section className={s.saved}>
        <div className={s.savedHeader}>
          <h2 className={s.savedTitle}>{t('saved_backends')}</h2>
          {apiConfigs.length > 0 ? <span className={s.count}>{apiConfigs.length}</span> : null}
        </div>
        {apiConfigs.length > 0 ? (
          <BackendList
            apiConfigs={apiConfigs}
            selectedClashAPIConfigIndex={selectedClashAPIConfigIndex}
            editing={editing}
            onRemove={onRemoveConfig}
            onSelect={onSelectConfig}
            onEdit={startEdit}
          />
        ) : (
          <p className={s.empty}>{t('no_saved_backends')}</p>
        )}
      </section>
    </div>
  );
}
