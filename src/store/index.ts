import {
  initialState as app,
  removeClashAPIConfig,
  selectChartStyleIndex,
  selectClashAPIConfig,
  updateAppConfig,
  updateCollapsibleIsOpen,
  updateCollapsibleIsOpenBulk,
} from './app';
import { initialState as configs } from './configs';
import { initialState as modals } from './modals';

export const initialState = {
  app: app(),
  modals,
  configs,
};

export const actions = {
  selectChartStyleIndex,
  updateAppConfig,

  app: {
    updateCollapsibleIsOpen,
    updateCollapsibleIsOpenBulk,
    updateAppConfig,
    removeClashAPIConfig,
    selectClashAPIConfig,
  },
};
