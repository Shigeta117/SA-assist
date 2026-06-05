import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Users, PieChart, Sparkles, UserPlus } from 'lucide-react';
import type { GroupConfig } from './types';

const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

interface SetupProps {
  onCreate: (members: string[], groups: GroupConfig[]) => void;
}

interface MemberInput {
  id: string;
  name: string;
}

export default function Setup({ onCreate }: SetupProps) {
  const [members, setMembers] = useState<MemberInput[]>([
    { id: '1', name: 'メンバー1' },
    { id: '2', name: 'メンバー2' },
    { id: '3', name: 'メンバー3' },
    { id: '4', name: 'メンバー4' },
    { id: '5', name: 'メンバー5' },
  ]);

  const [groups, setGroups] = useState<GroupConfig[]>([
    { id: '1', count: 3, color: COLORS[0] },
    { id: '2', count: 1, color: COLORS[1] },
    { id: '3', count: 1, color: COLORS[2] },
  ]);

  const validMembers = members.filter(m => m.name.trim() !== '');
  const memberCount = validMembers.length;
  const currentTotal = groups.reduce((acc, g) => acc + g.count, 0);

  useEffect(() => {
    if (memberCount > 0 && groups.length === 0) {
      setGroups([{ id: Date.now().toString(), count: memberCount, color: COLORS[0] }]);
    }
  }, [memberCount]);

  const handleAddMember = () => {
    setMembers([...members, { id: Date.now().toString(), name: `メンバー${members.length + 1}` }]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const handleUpdateMember = (id: string, name: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, name } : m));
  };

  const handleAddGroup = () => {
    const nextColorIndex = groups.length % COLORS.length;
    setGroups([
      ...groups,
      {
        id: Date.now().toString(),
        count: 1,
        color: COLORS[nextColorIndex],
      }
    ]);
  };

  const handleRemoveGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
  };

  const handleUpdateGroupCount = (id: string, count: number) => {
    setGroups(groups.map(g => g.id === id ? { ...g, count } : g));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberCount === 0 || currentTotal !== memberCount) return;
    onCreate(validMembers.map(m => m.name.trim()), groups);
  };

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            あみだくじ作成
          </h1>
          <p className="mt-2 text-gray-500">メンバーを入力し、割り振る人数の比率を設定してください</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Members Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">メンバー入力</h2>
              <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                有効: {memberCount} 人
              </span>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {members.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-2 shadow-sm"
                  >
                    <div className="w-8 flex-none text-center text-sm font-bold text-gray-400">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => handleUpdateMember(member.id, e.target.value)}
                      placeholder="メンバー名"
                      className="flex-1 px-4 py-2.5 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-none"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleAddMember}
              className="mt-6 flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50 w-full justify-center border border-dashed border-blue-200"
            >
              <UserPlus className="w-4 h-4" />
              メンバーを追加
            </button>
          </div>

          {/* Groups Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">グループ割り当て</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-sm px-2 py-1 rounded-md font-medium transition-colors ${
                  currentTotal === memberCount ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  割り当て: {currentTotal} / {memberCount || 1} 人
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-3 pl-2">
                      <div 
                        className="w-4 h-4 rounded-full shadow-inner flex-none" 
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="font-bold text-gray-700">
                        グループ {String.fromCharCode(65 + index)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 pr-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateGroupCount(group.id, Math.max(1, group.count - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-lg text-gray-800">
                        {group.count}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateGroupCount(group.id, Math.min(Math.max(memberCount, 1), group.count + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      
                      <div className="w-px h-6 bg-gray-200 mx-2" />
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(group.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-none"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleAddGroup}
              className="mt-6 flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 transition-colors px-4 py-2 rounded-lg hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              グループを追加
            </button>
          </div>
          </div>

          <button
            type="submit"
            disabled={memberCount === 0 || currentTotal !== memberCount}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
          >
            あみだくじを生成
          </button>
        </form>
      </div>
    </div>
  );
}
