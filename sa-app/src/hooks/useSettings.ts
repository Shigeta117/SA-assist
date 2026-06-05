import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { defaultSettings } from '../types';
import type { AppSettings } from '../types';

const SETTINGS_DOC_ID = 'shared';
const COLLECTION_NAME = 'settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    
    try {
      const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
      
      // Subscribe to real-time updates
      unsubscribe = onSnapshot(docRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            setSettings(snapshot.data() as AppSettings);
          } else {
            // Document doesn't exist yet, we'll use defaults and create it when saving
            setSettings(defaultSettings);
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Firestore read error, falling back to defaults:", err);
          setError(err);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error("Failed to initialize Firestore listener:", err);
      setError(err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      // Optimistic update
      setSettings(newSettings);
      
      const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
      await setDoc(docRef, newSettings);
      return true;
    } catch (err) {
      console.error("Failed to save settings to Firestore:", err);
      // Revert is handled by the snapshot listener naturally if it's still active,
      // but if offline, it keeps local state.
      throw err;
    }
  };

  return { settings, loading, error, saveSettings };
}
