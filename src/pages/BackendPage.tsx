import * as React from 'react';
import { useLocation } from 'react-router-dom';

import APIConfig from '~/components/backend/APIConfig';
import {
  addClashAPIConfig,
  getClashAPIConfigs,
  getSelectedClashAPIConfigIndex,
  removeClashAPIConfig,
  selectClashAPIConfig,
  updateClashAPIConfig,
} from '~/store/app';
import { connect } from '~/store/StateProvider';
import type { ClashAPIConfigWithAddedAt, DispatchFn, State } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

const { useCallback } = React;

type Props = {
  dispatch: DispatchFn;
  apiConfigs: ClashAPIConfigWithAddedAt[];
  selectedClashAPIConfigIndex: number;
};

function BackendPage({ dispatch, apiConfigs, selectedClashAPIConfigIndex }: Props) {
  const handleAddConfig = useCallback(
    (config: ClashAPIConfig) => {
      dispatch(addClashAPIConfig(config));
    },
    [dispatch],
  );

  const handleRemoveConfig = useCallback(
    (config: ClashAPIConfig) => {
      dispatch(removeClashAPIConfig(config));
    },
    [dispatch],
  );

  // /backend 是面板之外的独立路由，选好后端要回到面板，否则 reload 后还停在这页。
  // 同一组件也嵌在面板里的「连接到后端」弹窗中，那时留在原路由
  const isStandalone = useLocation().pathname === '/backend';
  const handleSelectConfig = useCallback(
    (config: ClashAPIConfig) => {
      dispatch(selectClashAPIConfig(config, isStandalone ? '#/' : undefined));
    },
    [dispatch, isStandalone],
  );

  const handleUpdateConfig = useCallback(
    (prev: ClashAPIConfig, next: ClashAPIConfig) => {
      dispatch(updateClashAPIConfig(prev, next));
    },
    [dispatch],
  );

  return (
    <APIConfig
      apiConfigs={apiConfigs}
      selectedClashAPIConfigIndex={selectedClashAPIConfigIndex}
      onAddConfig={handleAddConfig}
      onRemoveConfig={handleRemoveConfig}
      onSelectConfig={handleSelectConfig}
      onUpdateConfig={handleUpdateConfig}
    />
  );
}

const mapState = (state: State) => ({
  apiConfigs: getClashAPIConfigs(state),
  selectedClashAPIConfigIndex: getSelectedClashAPIConfigIndex(state),
});

export default connect(mapState)(BackendPage);
