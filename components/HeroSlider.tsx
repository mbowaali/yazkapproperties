"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Slide = {
  src: string;
  alt: string;
  badge: string;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
};

const SLIDES: Slide[] = [
  {
    src: "/slides/building.svg",
    alt: "Valencia Laundry Building on Electra Street, Abu Dhabi",
    badge: "📍 302 Electra Street · Abu Dhabi",
    title: "Welcome to Yazkap Properties",
    subtitle: "Clean, secure and affordable living in the heart of the city — Valencia Laundry Building.",
  },
  {
    src: "/slides/studio.svg",
    alt: "Bright private studio room with a large window and bed",
    badge: "🏠 Private Studios",
    title: "Your own space, your own rules",
    subtitle: "Fully private studios with natural light — from AED 1,100/month.",
    cta: { label: "Register as Tenant →", href: "/register" },
  },
  {
    src: "/slides/partition.svg",
    alt: "Partitioned room with a privacy curtain divider",
    badge: "🚪 Smart Partitions",
    title: "Privacy that fits your budget",
    subtitle: "Curtain-partitioned rooms — shared convenience, personal space.",
    cta: { label: "Register as Tenant →", href: "/register" },
  },
  {
    src: "/slides/bedspace.svg",
    alt: "Bunk bed arrangement in a bright shared room",
    badge: "🛏 Bedspace & Shared",
    title: "The smartest deal in Abu Dhabi",
    subtitle: "Bedspaces and shared rooms for two — move in today, pay monthly.",
  },
  {
    src: "/slides/big-hall.svg",
    alt: "Spacious hall with tall windows and seating",
    badge: "🏛 Big Halls",
    title: "Room to breathe, room to live",
    subtitle: "Large shared halls for groups — flexible terms for teams.",
  },
];

const AUTOPLAY_MS = 5500;

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const go = useCallback((i: number) => {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  // Preload images for smooth transitions
  useEffect(() => {
    SLIDES.forEach((s) => {
      const img = new window.Image();
      img.src = s.src;
    });
  }, []);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured rooms and property"
      className="relative h-[72vh] min-h-[440px] w-full overflow-hidden bg-primary-dark sm:h-[78vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((s, i) => (
          <div key={s.src} className="relative h-full w-full shrink-0 grow-0 basis-full" aria-hidden={i !== index}>
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              draggable={false}
            />
            {/* Legibility overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/85 via-primary-dark/25 to-primary-dark/10" />
          </div>
        ))}
      </div>

      {/* Caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="container-page pb-6 sm:pb-10">
          <div key={index} className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent ring-1 ring-white/25 backdrop-blur sm:text-xs">
              {SLIDES[index].badge}
            </span>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
              {SLIDES[index].title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              {SLIDES[index].subtitle}
            </p>

            {/* Persistent CTAs */}
            <div className="pointer-events-auto mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row">
              <Link href="/register" className="btn-accent w-full sm:w-auto">Tenant Registration →</Link>
              <a
                href="https://wa.me/97150512276"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20 sm:w-auto"
              >
                💬 Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Controls row: dots + arrows */}
          <div className="pointer-events-auto mt-5 flex items-center justify-between sm:mt-6">
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {SLIDES.map((s, i) => (
                <button
                  key={s.src}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${s.alt}`}
                  onClick={() => go(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-7 bg-accent" : "w-2.5 bg-white/45 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => go(index - 1)}
                aria-label="Previous slide"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => go(index + 1)}
                aria-label="Next slide"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
