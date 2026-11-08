import { useTabTitle } from '~/modules/title/hooks';
import { getClashAPIConfig, getTabTitle } from '~/store/app';
import { connect } from '~/store/StateProvider';
import type { State, TabTitleConfig } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

const mapState = (s: State) => ({
  apiConfig: getClashAPIConfig(s),
  tabTitle: getTabTitle(s),
});

/** Head writes the document title from the tab title settings. */
function HeadImpl({
  apiConfig,
  tabTitle,
}: {
  apiConfig: ClashAPIConfig;
  tabTitle: TabTitleConfig;
}) {
  useTabTitle(apiConfig, tabTitle);
  return null;
}

export const Head = connect(mapState)(HeadImpl);
