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
    loop: false,
    onComplete: () => {
      setHasCompletedOneLoop(true);
    }
  });

  useEffect(() => {
    if (isSettingsLoaded && hasCompletedOneLoop) {
      onFinish();
    }
  }, [isSettingsLoaded, hasCompletedOneLoop, onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
    >
      <div className="w-64 h-64 md:w-96 md:h-96">
        {View}
      </div>
    </motion.div>
  );
};
