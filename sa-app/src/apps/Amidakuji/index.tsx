import { useState } from 'react';
import Setup from './Setup';
import AmidakujiBoard from './AmidakujiBoard';
import type { GroupConfig } from './types';

export default function Amidakuji() {
  const [mode, setMode] = useState<'setup' | 'board'>('setup');
  const [members, setMembers] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);

  const handleCreate = (newMembers: string[], newGroups: GroupConfig[]) => {
    setMembers(newMembers);
    setGroups(newGroups);
    setMode('board');
  };

  const handleReset = () => {
    setMode('setup');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {mode === 'setup' ? (
        <Setup onCreate={handleCreate} />
      ) : (
        <AmidakujiBoard 
          members={members} 
          groups={groups} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
}
