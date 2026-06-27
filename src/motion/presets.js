export const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

export const revealUpLarge = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0 }
};

export const messageReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 }
};

export const transitionGentle = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1]
};

export const transitionHero = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1]
};

export const pageShellTransition = {
  initial: { opacity: 0, y: 18, filter: "blur(10px)" },
  enter: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.52,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(8px)",
    transition: {
      duration: 0.32,
      ease: [0.4, 0, 1, 1]
    }
  }
};
