import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import "../../styles/pages/landing.css";

const zhixuAssets = {
  horizontal: "/brand/zhixu/decision-orbit-lockup-horizontal.svg",
  markInk: "/brand/zhixu/decision-orbit-mark-ink.svg"
};

const heroCards = [
  {
    id: "tsinghua",
    name: "清华大学",
    city: "北京",
    image: "/hero-universities/optimized/tsinghua-gate.webp",
    className: "landing-card-tsinghua",
    depthX: 0.24,
    depthY: 0.18
  },
  {
    id: "fudan",
    name: "复旦大学",
    city: "上海",
    image: "/hero-universities/optimized/fudan-xianghui.webp",
    className: "landing-card-fudan",
    depthX: 0.12,
    depthY: -0.1
  },
  {
    id: "sysu",
    name: "中山大学",
    city: "广州",
    image: "/hero-universities/optimized/sysu-library.webp",
    className: "landing-card-sysu",
    depthX: 0.08,
    depthY: 0.08
  },
  {
    id: "pku",
    name: "北京大学",
    city: "北京",
    image: "/hero-universities/optimized/pku-hall.webp",
    className: "landing-card-pku",
    depthX: -0.14,
    depthY: 0.15
  },
  {
    id: "whu",
    name: "武汉大学",
    city: "武汉",
    image: "/hero-universities/optimized/whu-aerial.webp",
    className: "landing-card-whu",
    depthX: -0.18,
    depthY: -0.18
  },
  {
    id: "shuimu",
    name: "清华大学",
    city: "北京",
    image: "/hero-universities/optimized/tsinghua-shuimu.webp",
    className: "landing-card-shuimu",
    depthX: 0.16,
    depthY: -0.08
  }
];

const ambientCards = [
  {
    id: "ambient-1",
    image: "/hero-universities/optimized/sysu-campus.webp",
    className: "landing-ambient-card landing-ambient-card-a"
  },
  {
    id: "ambient-2",
    image: "/hero-universities/optimized/pku-hall.webp",
    className: "landing-ambient-card landing-ambient-card-b"
  },
  {
    id: "ambient-3",
    image: "/hero-universities/optimized/fudan-aerial.webp",
    className: "landing-ambient-card landing-ambient-card-c"
  },
  {
    id: "ambient-4",
    image: "/hero-universities/optimized/whu-aerial.webp",
    className: "landing-ambient-card landing-ambient-card-d"
  },
  {
    id: "ambient-5",
    image: "/hero-universities/optimized/tsinghua-shuimu.webp",
    className: "landing-ambient-card landing-ambient-card-e"
  },
  {
    id: "ambient-6",
    image: "/hero-universities/optimized/sysu-library.webp",
    className: "landing-ambient-card landing-ambient-card-f"
  },
  {
    id: "ambient-7",
    image: "/hero-universities/optimized/pku-hall.webp",
    className: "landing-ambient-card landing-ambient-card-g"
  },
  {
    id: "ambient-8",
    image: "/hero-universities/optimized/fudan-xianghui.webp",
    className: "landing-ambient-card landing-ambient-card-h"
  }
];

const trailImages = [
  "/hero-universities/optimized/tsinghua-shuimu.webp",
  "/hero-universities/optimized/pku-hall.webp",
  "/hero-universities/optimized/fudan-aerial.webp",
  "/hero-universities/optimized/sysu-campus.webp",
  "/hero-universities/optimized/whu-aerial.webp",
  "/hero-universities/optimized/fudan-xianghui.webp",
  "/hero-universities/optimized/sysu-library.webp"
];

const stats = [
  {
    id: "coverage",
    value: "2800+",
    label: "高校数据覆盖",
    icon: <CampusIcon />
  },
  {
    id: "plans",
    value: "1127W+",
    label: "志愿方案生成",
    icon: <ChartIcon />
  },
  {
    id: "risk",
    value: "98.7%",
    label: "录取概率预测",
    icon: <ShieldIcon />
  },
  {
    id: "advisor",
    value: "AI 智能",
    label: "7×24 小时顾问",
    icon: <SparkleIcon className="landing-stat-icon-spark" />
  }
];

function SparkleIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2.8 13.9 8l5.3 1.9-5.3 1.9L12 17l-1.9-5.2L4.8 9.9 10.1 8 12 2.8Z"
        fill="currentColor"
      />
      <path d="m18.6 3.9.8 2.1 2.1.8-2.1.7-.8 2.1-.7-2.1-2.1-.7 2.1-.8.7-2.1Z" fill="currentColor" />
      <path d="m18.1 14.8.6 1.6 1.7.6-1.7.6-.6 1.7-.6-1.7-1.6-.6 1.6-.6.6-1.6Z" fill="currentColor" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21.2c-3.8-4-6-7.1-6-10.1a6 6 0 1 1 12 0c0 3-2.2 6.1-6 10.1Zm0-8.1a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CampusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 9.1 12 4l9 5.1v1.6h-1.8v7.8h2.1V20H2.7v-1.5h2.1v-7.8H3V9.1Zm3.6 1.6v7.8h2.3v-7.8H6.6Zm4.2 0v7.8h2.4v-7.8h-2.4Zm4.3 0v7.8h2.3v-7.8h-2.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Zm1 11.7h2.3v-4.1H6v4.1Zm4 0h2.3V8.9H10v7.3Zm4 0h2.3v-2.8H14v2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3.2 19 5v5.6c0 4.7-2.6 8.3-7 10.2-4.4-1.9-7-5.5-7-10.2V5l7-1.8Zm-1.1 11.7 5-5-1.4-1.4-3.6 3.6-1.8-1.8-1.4 1.4 3.2 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function buildCardMotion(index, prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
      transition: undefined
    };
  }

  return {
    initial: { opacity: 0, y: 28, scale: 0.96 },
    animate: {
      opacity: 1,
      y: [0, index % 2 === 0 ? -11 : 10, 0],
      rotate: [0, index % 2 === 0 ? -1.4 : 1.25, 0]
    },
    transition: {
      opacity: { duration: 0.5, delay: index * 0.06 },
      y: {
        duration: 8.6 + index,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay: index * 0.14
      },
      rotate: {
        duration: 11.2 + index,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay: index * 0.1
      }
    }
  };
}

export function LandingScreen({ onPrimaryAction, onGuestAction }) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredCardId, setHoveredCardId] = useState("");
  const [trailCards, setTrailCards] = useState([]);
  const heroRef = useRef(null);
  const rafRef = useRef(0);
  const trailTimeoutsRef = useRef([]);
  const trailCooldownRef = useRef(0);
  const trailIndexRef = useRef(0);
  const nextPointRef = useRef({ x: 0, y: 0, lightX: "50%", lightY: "26%" });

  useEffect(
    () => () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }

      trailTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    },
    []
  );

  const cardsWithState = useMemo(
    () =>
      heroCards.map((card, index) => ({
        ...card,
        motion: buildCardMotion(index, prefersReducedMotion),
        dimmed: Boolean(hoveredCardId) && hoveredCardId !== card.id
      })),
    [hoveredCardId, prefersReducedMotion]
  );

  function flushParallax() {
    rafRef.current = 0;

    if (!heroRef.current) {
      return;
    }

    const { x, y, lightX, lightY } = nextPointRef.current;
    heroRef.current.style.setProperty("--landing-parallax-x", `${x}px`);
    heroRef.current.style.setProperty("--landing-parallax-y", `${y}px`);
    heroRef.current.style.setProperty("--landing-light-x", lightX);
    heroRef.current.style.setProperty("--landing-light-y", lightY);
  }

  function queueParallaxUpdate(clientX, clientY, currentTarget) {
    const rect = currentTarget.getBoundingClientRect();
    const relativeX = (clientX - rect.left) / rect.width - 0.5;
    const relativeY = (clientY - rect.top) / rect.height - 0.5;

    nextPointRef.current = {
      x: relativeX * 34,
      y: relativeY * 28,
      lightX: `${((clientX - rect.left) / rect.width) * 100}%`,
      lightY: `${((clientY - rect.top) / rect.height) * 100}%`
    };

    if (!rafRef.current) {
      rafRef.current = window.requestAnimationFrame(flushParallax);
    }
  }

  function spawnTrailCard(clientX, clientY, currentTarget) {
    if (prefersReducedMotion) {
      return;
    }

    const now = performance.now();
    if (now - trailCooldownRef.current < 92) {
      return;
    }

    trailCooldownRef.current = now;

    const rect = currentTarget.getBoundingClientRect();
    let localX = clientX - rect.left;
    let localY = clientY - rect.top;
    const relativeX = localX / rect.width;
    const relativeY = localY / rect.height;
    const isCompactViewport = window.innerWidth <= 768;
    const isCoarsePointer =
      isCompactViewport ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches);

    const inHeadlineSafeZone =
      relativeX > (isCoarsePointer ? 0.34 : 0.22) &&
      relativeX < (isCoarsePointer ? 0.68 : 0.8) &&
      relativeY > (isCoarsePointer ? 0.48 : 0.38) &&
      relativeY < (isCoarsePointer ? 0.68 : 0.8);

    if (inHeadlineSafeZone) {
      if (!isCoarsePointer) {
        return;
      }

      const horizontalBias = relativeX < 0.5 ? -1 : 1;
      const verticalBias = relativeY < 0.58 ? -1 : 1;
      localX = Math.min(
        Math.max(localX + horizontalBias * rect.width * 0.15, 28),
        rect.width - 28
      );
      localY = Math.min(
        Math.max(localY + verticalBias * rect.height * 0.18, 28),
        rect.height - 28
      );
    }

    const imageIndex = trailIndexRef.current % trailImages.length;
    trailIndexRef.current += 1;

    const trailId = `${Math.round(now)}-${imageIndex}`;
    const sizeBase = isCoarsePointer ? 64 : 86;
    const sizeRange = isCoarsePointer ? 24 : 48;
    const size = sizeBase + ((trailIndexRef.current * 17) % sizeRange);
    const offsetX = ((trailIndexRef.current % 5) - 2) * (isCoarsePointer ? 7 : 10);
    const offsetY = ((trailIndexRef.current % 4) - 1.5) * (isCoarsePointer ? 7 : 10);
    const rotation = ((trailIndexRef.current % 7) - 3) * 4.5;

    setTrailCards((current) => [
      ...current.slice(-(isCoarsePointer ? 6 : 8)),
      {
        id: trailId,
        image: trailImages[imageIndex],
        x: localX + offsetX,
        y: localY + offsetY,
        size,
        rotation
      }
    ]);

    const timeoutId = window.setTimeout(() => {
      setTrailCards((current) => current.filter((item) => item.id !== trailId));
      trailTimeoutsRef.current = trailTimeoutsRef.current.filter((item) => item !== timeoutId);
    }, 920);

    trailTimeoutsRef.current.push(timeoutId);
  }

  function resetParallax() {
    nextPointRef.current = {
      x: 0,
      y: 0,
      lightX: "50%",
      lightY: "26%"
    };

    if (!rafRef.current) {
      rafRef.current = window.requestAnimationFrame(flushParallax);
    }
  }

  function handlePointerMove(event) {
    if (prefersReducedMotion) {
      return;
    }

    queueParallaxUpdate(event.clientX, event.clientY, event.currentTarget);
    spawnTrailCard(event.clientX, event.clientY, event.currentTarget);
  }

  function handleTouchMove(event) {
    if (prefersReducedMotion) {
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    queueParallaxUpdate(touch.clientX, touch.clientY, event.currentTarget);
    spawnTrailCard(touch.clientX, touch.clientY, event.currentTarget);
  }

  return (
    <div className="landing-shell brand-shell">
      <section
        ref={heroRef}
        className="landing-editorial-hero"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          resetParallax();
          setHoveredCardId("");
        }}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          resetParallax();
          setHoveredCardId("");
        }}
      >
        <div className="landing-soft-cloud landing-soft-cloud-a" aria-hidden="true" />
        <div className="landing-soft-cloud landing-soft-cloud-b" aria-hidden="true" />
        <div className="landing-soft-cloud landing-soft-cloud-c" aria-hidden="true" />
        <div className="landing-soft-noise" aria-hidden="true" />
        <div className="landing-pointer-light" aria-hidden="true" />

        <header className="landing-topbar">
          <div className="landing-brand-lockup">
            <img
              className="landing-brand-lockup-image"
              src={zhixuAssets.horizontal}
              alt="志序 ZHIXU AI"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <span className="landing-brand-mark" aria-hidden="true">
              <SparkleIcon />
            </span>
            <div className="landing-brand-copy">
              <strong>高考志愿顾问</strong>
              <span>ZHIXU AI</span>
            </div>
          </div>
        </header>

        <div className="landing-content-stage">
          <div className="landing-gallery" aria-label="全国高校校园影像">
            {trailCards.map((card) => (
              <span
                key={card.id}
                className="landing-pointer-trail"
                style={{
                  left: `${card.x}px`,
                  top: `${card.y}px`,
                  width: `${card.size}px`,
                  "--landing-trail-rotate": `${card.rotation}deg`
                }}
                aria-hidden="true"
              >
                <img src={card.image} alt="" loading="lazy" decoding="async" />
              </span>
            ))}

            {ambientCards.map((card, index) => (
              <motion.div
                key={card.id}
                className={card.className}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        opacity: { duration: 0.36, delay: 0.05 * index },
                        y: {
                          duration: 9.2 + index,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: index * 0.08
                        }
                      }
                }
                aria-hidden="true"
              >
                <img src={card.image} alt="" loading="lazy" decoding="async" />
              </motion.div>
            ))}

            {cardsWithState.map((card) => (
              <motion.figure
                key={card.id}
                className={`landing-gallery-card ${card.className} ${
                  card.dimmed ? "is-dimmed" : ""
                } ${hoveredCardId === card.id ? "is-focused" : ""}`}
                style={{
                  "--landing-depth-x": card.depthX,
                  "--landing-depth-y": card.depthY
                }}
                initial={card.motion.initial}
                animate={card.motion.animate}
                transition={card.motion.transition}
                onPointerEnter={() => setHoveredCardId(card.id)}
                onPointerLeave={() => setHoveredCardId("")}
                onFocus={() => setHoveredCardId(card.id)}
                onBlur={() => setHoveredCardId("")}
                onTouchStart={() => setHoveredCardId(card.id)}
              >
                <div className="landing-gallery-card-surface">
                  <img
                    src={card.image}
                    alt={card.name}
                    loading={card.id === "tsinghua" || card.id === "sysu" ? "eager" : "lazy"}
                    fetchPriority={card.id === "tsinghua" || card.id === "sysu" ? "high" : "auto"}
                    decoding="async"
                  />
                  <div className="landing-gallery-card-overlay" />
                  <figcaption>
                    <strong>{card.name}</strong>
                    <span>
                      <LocationIcon />
                      {card.city}
                    </span>
                  </figcaption>
                </div>
              </motion.figure>
            ))}
          </div>

          <motion.div
            className="landing-hero-copy"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
          >
            <div className="landing-kicker">
              <img className="landing-kicker-mark" src={zhixuAssets.markInk} alt="" aria-hidden="true" />
              <span className="landing-kicker-dot" aria-hidden="true" />
              <span>ZHIXU AI</span>
              <span className="landing-kicker-line" aria-hidden="true" />
            </div>

            <h1>高考志愿不该靠运气</h1>
            <h2>Place every point where it belongs.</h2>
            <p>以分数、位次、偏好与风险，排出真正能落地的志愿方案。</p>

            <div className="landing-hero-actions">
              <button className="landing-enter-btn" type="button" onClick={onPrimaryAction}>
                立即进入
              </button>
            </div>
          </motion.div>
        </div>

        <footer className="landing-stats-bar">
          {stats.map((item) => (
            <article key={item.id} className="landing-stat-card">
              <span className="landing-stat-icon" aria-hidden="true">
                {item.icon}
              </span>
              <div>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            </article>
          ))}
        </footer>
      </section>
    </div>
  );
}
