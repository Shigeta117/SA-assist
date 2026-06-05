import { useState } from 'react';
import { Layout } from './components/Layout';
import type { AppMode } from './components/Sidebar';
import Timekeeper from './apps/Timekeeper';
import WorkLog from './apps/WorkLog';
import Settings from './apps/Settings';
import { useSettings } from './hooks/useSettings';
import { Loader2 } from 'lucide-react';

function App() {
  const [activeApp, setActiveApp] = useState<AppMode>('timekeeper');
  const { settings, loading, saveSettings } = useSettings();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium">Loading settings...</p>
      </div>
    );
  }

  // We proceed even if there's an error (e.g., missing Firebase config), using the default fallback settings
  return (
    <Layout activeApp={activeApp} onAppSelect={setActiveApp}>
      {activeApp === 'timekeeper' && <Timekeeper settings={settings.timekeeper} />}
      {activeApp === 'worklog' && <WorkLog settings={settings.workLog} />}
      {activeApp === 'settings' && <Settings settings={settings} onSave={saveSettings} />}
    </Layout>
  );
}

export default App;
