import * as React from 'react';

import APIDiscovery from '~/components/backend/APIDiscovery';
import { connect } from '~/components/StateProvider';
import { useBackendDiscovery } from '~/modules/backend/hooks';
import BackendPage from '~/pages/BackendPage';
import { getClashAPIConfig } from '~/store/app';
import type { DispatchFn, State } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

type Props = {
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
  isOpen: boolean;
};

function APIDiscoveryContainer({ dispatch, apiConfig, isOpen }: Props) {
  const { closeAPIConfigModal } = useBackendDiscovery({ apiConfig, dispatch });

  return (
    <APIDiscovery isOpen={isOpen} onRequestClose={closeAPIConfigModal}>
      <BackendPage />
    </APIDiscovery>
  );
}

const mapState = (state: State) => ({
  apiConfig: getClashAPIConfig(state),
  isOpen: state.modals.apiConfig,
});

export default connect(mapState)(APIDiscoveryContainer);
