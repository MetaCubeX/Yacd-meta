import Home from '~/components/home/Home';
import { connect } from '~/components/StateProvider';
import { getClashAPIConfig, getSelectedChartStyleIndex } from '~/store/app';
import { State } from '~/store/types';

const mapState = (state: State) => ({
  apiConfig: getClashAPIConfig(state),
  selectedChartStyleIndex: getSelectedChartStyleIndex(state),
});

export default connect(mapState)(Home);
