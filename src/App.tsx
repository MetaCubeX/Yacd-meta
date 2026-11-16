import { AppProviders } from '~/app/providers';
import { AppRouter } from '~/app/router';
import { useApplyFontSettings } from '~/modules/fonts/hooks';

const App = () => {
  useApplyFontSettings();
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};

export default App;
