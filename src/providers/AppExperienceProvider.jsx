import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";

let scrollTriggerRegistered = false;

export function AppExperienceProvider({ children }) {
  useEffect(() => {
    let mounted = true;
    let rafId = 0;
    let lenisInstance = null;
    let scrollTriggerApi = null;

    async function setup() {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!scrollTriggerRegistered) {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);
        scrollTriggerRegistered = true;
        scrollTriggerApi = ScrollTrigger;
      } else {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        scrollTriggerApi = ScrollTrigger;
      }

      if (!mounted || prefersReducedMotion) {
        document.documentElement.dataset.scrollMode = prefersReducedMotion ? "native-reduced" : "native";
        return;
      }

      lenisInstance = new Lenis({
        autoRaf: false,
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false
      });

      document.documentElement.dataset.scrollMode = "lenis";

      const onScroll = () => {
        if (scrollTriggerApi?.update) {
          scrollTriggerApi.update();
        }
      };

      lenisInstance.on("scroll", onScroll);

      const loop = (time) => {
        lenisInstance.raf(time);
        rafId = window.requestAnimationFrame(loop);
      };

      rafId = window.requestAnimationFrame(loop);
    }

    setup();

    return () => {
      mounted = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      if (lenisInstance) {
        lenisInstance.destroy();
      }
      document.documentElement.dataset.scrollMode = "native";
    };
  }, []);

  return children;
}
