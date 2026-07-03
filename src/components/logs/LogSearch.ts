import Search from '~/components/Search';
import { connect } from '~/components/StateProvider';
import { getSearchText, updateSearchText } from '~/store/logs';

const mapState = (s) => ({ searchText: getSearchText(s), updateSearchText });
export default connect(mapState)(Search);
