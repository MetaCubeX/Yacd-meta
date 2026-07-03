import * as React from 'react';

import APIConfig from '~/components/backend/APIConfig';
import { connect } from '~/components/StateProvider';
import {
  addClashAPIConfig,
  getClashAPIConfigs,
  getSelectedClashAPIConfigIndex,
  removeClashAPIConfig,
  selectClashAPIConfig,
} from '~/store/app';
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
    [dispatch]
  );

  const handleRemoveConfig = useCallback(
    (config: ClashAPIConfig) => {
      dispatch(removeClashAPIConfig(config));
    },
    [dispatch]
  );

  const handleSelectConfig = useCallback(
    (config: ClashAPIConfig) => {
      dispatch(selectClashAPIConfig(config));
    },
    [dispatch]
  );

  return (
    <APIConfig
      apiConfigs={apiConfigs}
      selectedClashAPIConfigIndex={selectedClashAPIConfigIndex}
      onAddConfig={handleAddConfig}
      onRemoveConfig={handleRemoveConfig}
      onSelectConfig={handleSelectConfig}
    />
  );
}

const mapState = (state: State) => ({
  apiConfigs: getClashAPIConfigs(state),
  selectedClashAPIConfigIndex: getSelectedClashAPIConfigIndex(state),
});

export default connect(mapState)(BackendPage);
