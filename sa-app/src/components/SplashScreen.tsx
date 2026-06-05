import React, { useEffect, useState } from 'react';
import { useLottie } from 'lottie-react';
import { motion } from 'framer-motion';
import logoAnimation from '../assets/logo.json';
import loadingAnimation from '../assets/loading.json';

interface Props {
  isSettingsLoaded: boolean;
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ isSettingsLoaded, onFinish }) => {
  const [hasCompletedOneLoop, setHasCompletedOneLoop] = useState(false);

  const { View: LogoView } = useLottie({
    animationData: logoAnimation,
    loop: false,
    onComplete: () => {
      setHasCompletedOneLoop(true);
    }
  });

  const { View: LoadingView } = useLottie({
    animationData: loadingAnimation,
    loop: true,
  });

  useEffect(() => {
    if (isSettingsLoaded && hasCompletedOneLoop) {
      onFinish();
    }
  }, [isSettingsLoaded, hasCompletedOneLoop, onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200"
    >
      <div className="flex flex-col items-center justify-center space-y-8 p-12 bg-white/30 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/50">
        <div className="w-48 h-48 md:w-72 md:h-72 drop-shadow-xl">
          {LogoView}
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-black tracking-widest text-slate-800 drop-shadow-sm">
            SA-assist
          </h1>
          
          <div className="flex items-center space-x-3 opacity-60">
            <div className="w-8 h-8">
              {LoadingView}
            </div>
            <span className="text-sm md:text-base font-bold tracking-wider text-slate-600">
              起動しています...
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
