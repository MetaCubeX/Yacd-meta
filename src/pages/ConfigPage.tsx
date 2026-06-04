import Config from '~/components/Config';
import { connect } from '~/components/StateProvider';
import { getClashAPIConfig, getSelectedChartStyleIndex } from '~/store/app';
import { getConfigs } from '~/store/configs';
import { State } from '~/store/types';

const mapState = (state: State) => ({
  configs: getConfigs(state),
  selectedChartStyleIndex: getSelectedChartStyleIndex(state),
  apiConfig: getClashAPIConfig(state),
});

export default connect(mapState)(Config);
