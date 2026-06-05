import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FastForward, CheckCircle2, MousePointer2 } from 'lucide-react';
import type { GroupConfig } from './types';

interface AmidakujiBoardProps {
  members: string[];
  groups: GroupConfig[];
  onReset: () => void;
}

interface PathNode {
  x: number;
  y: number;
}

interface AnimationState {
  status: 'idle' | 'animating' | 'finished';
  path: string;
  resultColor: string;
  resultIndex: number;
}

export default function AmidakujiBoard({ members, groups, onReset }: AmidakujiBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardDimensions, setBoardDimensions] = useState({ width: 800, height: 600 });
  const [animationStates, setAnimationStates] = useState<Record<number, AnimationState>>({});
  const [isSkipped, setIsSkipped] = useState(false);

  // Generate the bottom assignments
  const bottomAssignments = useMemo(() => {
    const assignments: { color: string, groupName: string }[] = [];
    groups.forEach((g, idx) => {
      for (let i = 0; i < g.count; i++) {
        assignments.push({ color: g.color, groupName: `グループ ${String.fromCharCode(65 + idx)}` });
      }
    });
    // Shuffle
    for (let i = assignments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
    }
    return assignments;
  }, [groups]);

  // Generate the grid
  const { grid, steps } = useMemo(() => {
    const colCount = members.length;
    // more steps for more members, min 12
    const stepsCount = Math.max(12, colCount * 2); 
    
    // Create an empty grid [stepsCount][colCount - 1]
    const g: boolean[][] = Array.from({ length: stepsCount }, () => Array(colCount - 1).fill(false));
    
    // Randomly place horizontal lines
    for (let s = 1; s < stepsCount - 1; s++) {
      for (let c = 0; c < colCount - 1; c++) {
        // Probability to add line
        if (Math.random() < 0.4) {
          // ensure no adjacent line on the same step
          if (c > 0 && g[s][c - 1]) continue;
          g[s][c] = true;
        }
      }
    }

    // Ensure every vertical line has at least some horizontal lines to avoid straight drops
    for (let c = 0; c < colCount - 1; c++) {
      let hasLine = false;
      for (let s = 1; s < stepsCount - 1; s++) {
        if (g[s][c]) hasLine = true;
      }
      if (!hasLine) {
        // force add one
        const randomStep = Math.floor(Math.random() * (stepsCount - 2)) + 1;
        // make sure left is empty
        if (c === 0 || !g[randomStep][c - 1]) {
          g[randomStep][c] = true;
        } else {
          // if left is occupied, clear left and put here
          g[randomStep][c - 1] = false;
          g[randomStep][c] = true;
        }
      }
    }

    return { grid: g, steps: stepsCount };
  }, [members.length]);

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setBoardDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute Layout
  const { width, height } = boardDimensions;
  const paddingX = 60;
  const paddingTop = 80;
  const paddingBottom = 100;
  const drawWidth = width - paddingX * 2;
  const drawHeight = height - paddingTop - paddingBottom;
  
  const colSpacing = drawWidth / Math.max(1, (members.length - 1));
  const stepSpacing = drawHeight / (steps - 1);

  const getX = (col: number) => paddingX + col * colSpacing;
  const getY = (step: number) => paddingTop + step * stepSpacing;

  // Path generator for a specific member
  const generatePath = (startIndex: number) => {
    const pathNodes: PathNode[] = [];
    let currentCol = startIndex;
    
    pathNodes.push({ x: getX(currentCol), y: getY(0) });

    for (let s = 1; s < steps - 1; s++) {
      pathNodes.push({ x: getX(currentCol), y: getY(s) });
      
      // Check if there's a line to the right
      if (currentCol < members.length - 1 && grid[s][currentCol]) {
        currentCol++;
        pathNodes.push({ x: getX(currentCol), y: getY(s) });
      }
      // Check if there's a line to the left
      else if (currentCol > 0 && grid[s][currentCol - 1]) {
        currentCol--;
        pathNodes.push({ x: getX(currentCol), y: getY(s) });
      }
    }

    pathNodes.push({ x: getX(currentCol), y: getY(steps - 1) });
    
    // Create SVG Path string
    const d = `M ${pathNodes.map(p => `${p.x},${p.y}`).join(' L ')}`;
    return { pathString: d, endCol: currentCol };
  };

  const handleStartAnimation = (index: number) => {
    if (animationStates[index]?.status === 'animating' || isSkipped) return;

    const { pathString, endCol } = generatePath(index);
    const result = bottomAssignments[endCol];

    setAnimationStates(prev => ({
      ...prev,
      [index]: {
        status: 'animating',
        path: pathString,
        resultColor: result.color,
        resultIndex: endCol
      }
    }));

    // Auto-finish after animation duration (path length varies, let's use a fixed time 2.5s)
    setTimeout(() => {
      setAnimationStates(prev => {
        if (!prev[index] || prev[index].status === 'finished') return prev;
        return {
          ...prev,
          [index]: { ...prev[index], status: 'finished' }
        };
      });
    }, 2500);
  };

  const handleSkip = () => {
    setIsSkipped(true);
    const newStates: Record<number, AnimationState> = {};
    members.forEach((_, idx) => {
      const { pathString, endCol } = generatePath(idx);
      const result = bottomAssignments[endCol];
      newStates[idx] = {
        status: 'finished',
        path: pathString,
        resultColor: result.color,
        resultIndex: endCol
      };
    });
    setAnimationStates(newStates);
  };

  const allFinished = members.every((_, i) => animationStates[i]?.status === 'finished');

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex-none p-4 pl-20 border-b border-gray-100 flex items-center justify-between z-10 bg-white/80 backdrop-blur-md">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>設定に戻る</span>
        </button>
        
        <div className="flex items-center gap-4">
          {!allFinished && (
            <button
              onClick={handleSkip}
              disabled={isSkipped}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
            >
              <FastForward className="w-4 h-4" />
              <span>結果をスキップ表示</span>
            </button>
          )}
          {allFinished && (
            <div className="flex items-center gap-2 text-green-600 font-bold px-4 py-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span>全員の結果が出ました！</span>
            </div>
          )}
        </div>
      </div>

      {/* Board Container */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Base grid lines (vertical) */}
          {members.map((_, col) => (
            <line
              key={`v-${col}`}
              x1={getX(col)}
              y1={getY(0)}
              x2={getX(col)}
              y2={getY(steps - 1)}
              stroke="#e5e7eb"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}

          {/* Base grid lines (horizontal) */}
          {grid.map((row, s) =>
            row.map((hasLine, col) => {
              if (!hasLine) return null;
              return (
                <line
                  key={`h-${s}-${col}`}
                  x1={getX(col)}
                  y1={getY(s)}
                  x2={getX(col + 1)}
                  y2={getY(s)}
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              );
            })
          )}

          {/* Animated Paths */}
          {members.map((_, i) => {
            const state = animationStates[i];
            if (!state) return null;
            const isFinished = state.status === 'finished';
            const strokeColor = isFinished ? state.resultColor : '#4f46e5'; // Indigo during animation
            
            return (
              <motion.path
                key={`path-${i}`}
                d={state.path}
                stroke={strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={isSkipped ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={isSkipped ? { duration: 0 } : { duration: 2.5, ease: "linear" }}
                className={isFinished ? "drop-shadow-md z-10" : "drop-shadow-lg z-20"}
              />
            );
          })}
        </svg>

        {/* Top Nodes (Members) */}
        {members.map((name, i) => {
          const state = animationStates[i];
          const isFinished = state?.status === 'finished';
          const isAnimating = state?.status === 'animating';
          const canStart = !isFinished && !isAnimating && !allFinished;

          return (
            <div
              key={`member-${i}`}
              className="absolute transform -translate-x-1/2 flex flex-col items-center z-30"
              style={{ left: getX(i), top: getY(0) - 40 }}
            >
              <button
                onClick={() => canStart && handleStartAnimation(i)}
                disabled={!canStart}
                className={`
                  relative px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all border-2 whitespace-nowrap mb-1
                  ${isFinished 
                    ? 'bg-white scale-100 cursor-default' 
                    : isAnimating
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 scale-95 cursor-wait'
                      : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 hover:scale-105 hover:shadow-lg cursor-pointer'
                  }
                `}
                style={isFinished ? { borderColor: state.resultColor, color: state.resultColor } : {}}
              >
                {name}
                
                {/* Pointer Hint */}
                {canStart && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-indigo-500 animate-bounce flex flex-col items-center pointer-events-none">
                    <span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700 whitespace-nowrap mb-1">Click!</span>
                    <MousePointer2 className="w-4 h-4 fill-current" />
                  </div>
                )}
              </button>
              {/* Peg to clarify the start point of the line */}
              <div className="w-3 h-3 rounded-full bg-gray-400 shadow-inner z-10" />
            </div>
          );
        })}

        {/* Bottom Nodes (Groups/Colors) */}
        {bottomAssignments.map((assignment, i) => {
          // find who ended up here
          const winnerIndex = members.findIndex(
            (_, memberIdx) => animationStates[memberIdx]?.status === 'finished' && animationStates[memberIdx]?.resultIndex === i
          );
          const hasWinner = winnerIndex !== -1;

          return (
            <div
              key={`bottom-${i}`}
              className="absolute transform -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: getX(i), top: getY(steps - 1) - 4 }}
            >
              {/* Peg to clarify the end point of the line */}
              <div className="w-3 h-3 rounded-full bg-gray-400 shadow-inner z-10 mb-2" />
              
              {/* Group Name Label */}
              <div 
                className="text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm whitespace-nowrap border-2"
                style={{ backgroundColor: '#fff', borderColor: assignment.color, color: assignment.color }}
              >
                {assignment.groupName}
              </div>

              {/* Winner Result */}
              <div 
                className={`text-sm font-bold whitespace-nowrap px-4 py-2 rounded-xl transition-all ${
                  hasWinner ? 'opacity-100 scale-100 shadow-lg text-white' : 'opacity-0 scale-90'
                }`}
                style={hasWinner ? { backgroundColor: assignment.color } : {}}
              >
                {hasWinner ? members[winnerIndex] : '???'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
