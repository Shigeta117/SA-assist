import { useState } from 'react';
import { Layout } from './components/Layout';
import type { AppMode } from './components/Sidebar';
import Timekeeper from './apps/Timekeeper';
import WorkLog from './apps/WorkLog';
import Settings from './apps/Settings';
import { useSettings } from './hooks/useSettings';
import { SplashScreen } from './components/SplashScreen';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [activeApp, setActiveApp] = useState<AppMode>('timekeeper');
  const [showSplash, setShowSplash] = useState(true);
  const { settings, loading, saveSettings } = useSettings();

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen
            key="splash"
            isSettingsLoaded={!loading}
            onFinish={() => setShowSplash(false)}
          />
        ) : (
          <Layout key="app" activeApp={activeApp} onAppSelect={setActiveApp}>
            {activeApp === 'timekeeper' && <Timekeeper settings={settings.timekeeper} />}
            {activeApp === 'worklog' && <WorkLog settings={settings.workLog} />}
            {activeApp === 'settings' && <Settings settings={settings} onSave={saveSettings} />}
          </Layout>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
