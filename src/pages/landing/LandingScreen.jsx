import { useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { revealUp, revealUpLarge, transitionGentle, transitionHero } from "../../motion/presets.js";
import { universityProfiles } from "../../universityProfiles.js";

gsap.registerPlugin(ScrollTrigger);

const storySteps = [
  {
    eyebrow: "Step One",
    title: "先看位次",
    subtitle: "别先追名气"
  },
  {
    eyebrow: "Step Two",
    title: "再做取舍",
    subtitle: "城市专业一起判断"
  },
  {
    eyebrow: "Step Three",
    title: "最后排序",
    subtitle: "顺序决定结果"
  }
];

const caseStories = [
  {
    label: "广东物理",
    title: "先保出口",
    subtitle: "稳住未来四年"
  },
  {
    label: "省内优先",
    title: "再谈城市",
    subtitle: "把取舍放到台面上"
  },
  {
    label: "冲稳保",
    title: "把顺序排准",
    subtitle: "方案才真正能落地"
  }
];

export function LandingScreen({ onPrimaryAction, onGuestAction }) {
  const landingRef = useRef(null);
  const storyRef = useRef(null);
  const heroCards = useMemo(() => universityProfiles.slice(0, 6), []);
  const wallRows = useMemo(
    () => [
      universityProfiles.slice(0, 8),
      universityProfiles.slice(8, 16),
      universityProfiles.slice(16, 24)
    ],
    []
  );
  const pointerX = useMotionValue(320);
  const pointerY = useMotionValue(220);
  const glowX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.6 });
  const glowY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.6 });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from(".landing-hero-copy > *", {
        opacity: 0,
        y: 42,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08
      });

      gsap.from(".landing-hero-card", {
        opacity: 0,
        y: 54,
        scale: 0.94,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.08,
        delay: 0.12
      });

      gsap.to(".landing-spotlight-shell", {
        yPercent: -10,
        rotate: 2,
        ease: "none",
        scrollTrigger: {
          trigger: storyRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });

      gsap.utils.toArray(".landing-story-step").forEach((step, index) => {
        gsap.fromTo(
          step,
          {
            opacity: 0.28,
            y: 64
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: step,
              start: "top 78%",
              end: "top 42%",
              scrub: true
            },
            delay: index * 0.05
          }
        );
      });

      gsap.from(".landing-case-card", {
        opacity: 0,
        y: 48,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: ".landing-case-stage",
          start: "top 75%"
        }
      });
    }, landingRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - bounds.left - 180);
    pointerY.set(event.clientY - bounds.top - 180);
  }

  function handlePointerLeave() {
    pointerX.set(320);
    pointerY.set(220);
  }

  return (
    <div ref={landingRef} className="landing-shell brand-shell">
      <section
        className="landing-premium-hero"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <motion.div className="landing-cursor-glow" style={{ x: glowX, y: glowY }} />
        <div className="landing-premium-grid">
          <motion.div
            className="landing-hero-copy"
            initial="hidden"
            animate="visible"
            variants={revealUpLarge}
            transition={transitionHero}
          >
            <span className="brand-kicker">AI Admission Strategist</span>
            <h1>
              高考志愿
              <br />
              不该靠运气
            </h1>
            <p>让选择先于冲动</p>
            <div className="landing-hero-actions">
              <button className="primary-btn magnetic-btn" type="button" onClick={onPrimaryAction}>
                立即进入
              </button>
              <button className="text-link-btn" type="button" onClick={onGuestAction}>
                游客体验
              </button>
            </div>
          </motion.div>

          <motion.div
            className="landing-hero-stage"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...transitionHero, delay: 0.08 }}
          >
            <div className="landing-hero-orbit orbit-a" />
            <div className="landing-hero-orbit orbit-b" />
            <div className="landing-hero-orbit orbit-c" />

            {heroCards.map((school, index) => (
              <motion.article
                key={school.name}
                className={`landing-hero-card landing-hero-card-${index + 1}`}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: [0, index % 2 === 0 ? -16 : 16, 0],
                        rotate: [0, index % 2 === 0 ? -1.6 : 1.6, 0]
                      }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: 11 + index,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut"
                      }
                }
              >
                <img src={school.image} alt={school.name} loading="lazy" />
                <div className="landing-hero-card-copy">
                  <span>{school.city}</span>
                  <strong>{school.name}</strong>
                </div>
              </motion.article>
            ))}

            <div className="landing-stage-mark">
              <span>AI 高考志愿战略顾问</span>
              <strong>从分数判断到志愿排序</strong>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="landing-photo-wall" aria-label="全国高校影像墙">
        {wallRows.map((row, rowIndex) => (
          <div key={`wall-row-${rowIndex}`} className="landing-wall-row">
            <div className={`landing-wall-track ${rowIndex % 2 === 1 ? "reverse" : ""}`}>
              {[...row, ...row].map((school, index) => (
                <article key={`${school.name}-${rowIndex}-${index}`} className="landing-wall-frame">
                  <img src={school.image} alt={school.name} loading="lazy" />
                  <div>
                    <span>{school.city}</span>
                    <strong>{school.name}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section ref={storyRef} className="landing-storyworld">
        <div className="landing-story-visual">
          <div className="landing-spotlight-shell">
            <span className="landing-spotlight-kicker">Strategic View</span>
            <h2>不是选学校</h2>
            <p>是替未来四年做排序</p>

            <div className="landing-spotlight-stack">
              {heroCards.slice(0, 3).map((school) => (
                <article key={`spotlight-${school.name}`} className="landing-spotlight-card">
                  <img src={school.image} alt={school.name} loading="lazy" />
                  <strong>{school.name}</strong>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-story-rail">
          {storySteps.map((step) => (
            <motion.article
              key={step.title}
              className="landing-story-step"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={revealUp}
              transition={transitionGentle}
            >
              <span>{step.eyebrow}</span>
              <h2>{step.title}</h2>
              <p>{step.subtitle}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-case-stage">
        <motion.div
          className="landing-case-head"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          variants={revealUp}
          transition={transitionGentle}
        >
          <span className="brand-kicker">Case Rhythm</span>
          <h2>方案要能落地</h2>
          <p>别把好运当策略</p>
        </motion.div>

        <div className="landing-case-grid">
          {caseStories.map((story) => (
            <article key={story.title} className="landing-case-card">
              <span>{story.label}</span>
              <strong>{story.title}</strong>
              <p>{story.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <motion.section
        className="landing-exit-stage"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={revealUp}
        transition={transitionGentle}
      >
        <span className="brand-kicker">Start Now</span>
        <h2>把你的志愿表排对</h2>
        <p>现在开始体验</p>
        <button className="primary-btn magnetic-btn" type="button" onClick={onPrimaryAction}>
          进入工作台
        </button>
      </motion.section>
    </div>
  );
}
