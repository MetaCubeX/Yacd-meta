import Config from '~/components/config/Config';
import { getClashAPIConfig, getSelectedChartStyleIndex, getTabTitle } from '~/store/app';
import { getConfigs, getHaveFetched } from '~/store/configs';
import { connect } from '~/store/StateProvider';
import { State } from '~/store/types';

const mapState = (state: State) => ({
  configs: getConfigs(state),
  haveFetchedConfig: getHaveFetched(state),
  selectedChartStyleIndex: getSelectedChartStyleIndex(state),
  apiConfig: getClashAPIConfig(state),
  tabTitle: getTabTitle(state),
});

export default connect(mapState)(Config);
