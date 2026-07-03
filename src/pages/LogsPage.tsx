import Logs from '~/components/logs/Logs';
import { connect } from '~/components/StateProvider';
import { getClashAPIConfig, getLogStreamingPaused } from '~/store/app';
import { getLogLevel } from '~/store/configs';
import { getLogsForDisplay } from '~/store/logs';
import { State } from '~/store/types';

const mapState = (state: State) => ({
  logs: getLogsForDisplay(state),
  logLevel: getLogLevel(state),
  apiConfig: getClashAPIConfig(state),
  logStreamingPaused: getLogStreamingPaused(state),
});

export default connect(mapState)(Logs);
