import React, { useEffect, useState } from 'react';
import { useLottie } from 'lottie-react';
import { motion } from 'framer-motion';
import logoAnimation from '../assets/logo.json';

interface Props {
  isSettingsLoaded: boolean;
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ isSettingsLoaded, onFinish }) => {
  const [hasCompletedOneLoop, setHasCompletedOneLoop] = useState(false);

  const { View } = useLottie({
    animationData: logoAnimation,
    loop: true,
    onLoopComplete: () => {
      if (!hasCompletedOneLoop) {
        setHasCompletedOneLoop(true);
      }
    }
  });

  // When both settings are loaded and the animation has played at least once,
  // trigger onFinish to unmount the splash screen.
  useEffect(() => {
    if (isSettingsLoaded && hasCompletedOneLoop) {
      // Add a slight delay before hiding completely to make it smooth
      const timer = setTimeout(() => {
        onFinish();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSettingsLoaded, hasCompletedOneLoop, onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
    >
      <div className="w-64 h-64 md:w-96 md:h-96">
        {View}
      </div>
    </motion.div>
  );
};
