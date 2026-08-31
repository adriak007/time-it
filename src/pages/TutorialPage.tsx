import { useState } from 'react';
import { Button, Screen } from '../components/ui';
import { T } from '../config/strings';

interface TutorialPageProps {
  onComplete: () => void;
}

const SLIDES = T.tutorial.slides;

/**
 * Four beats, shown once on first launch and replayable from Settings.
 * Deliberately short — the game explains itself in one sentence.
 */
export const TutorialPage = ({ onComplete }: TutorialPageProps) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <div key={index} className="anim-fade-up flex flex-col items-center gap-4">
          <span className="text-[0.7rem] font-bold tracking-[0.3em] text-ink-faint">
            {slide.kicker}
          </span>

          <div
            className={`tabular text-[clamp(2.6rem,15vmin,4.5rem)] leading-none font-extrabold tracking-tight ${
              slide.accent ? 'text-brand' : 'text-ink'
            }`}
          >
            {slide.headline}
          </div>

          <p className="max-w-[16rem] text-sm leading-relaxed text-ink-soft">{slide.body}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-8 pb-9">
        <div className="flex justify-center gap-2" aria-hidden>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? '1.5rem' : '0.375rem',
                background: i === index ? 'var(--color-brand)' : 'var(--color-surface-3)',
              }}
            />
          ))}
        </div>

        <Button
          size="lg"
          onClick={() => (isLast ? onComplete() : setIndex((i) => i + 1))}
          className="w-full"
        >
          {isLast ? T.tutorial.start : T.tutorial.next}
        </Button>

        {!isLast && (
          <button
            type="button"
            onClick={onComplete}
            className="text-xs font-bold tracking-[0.2em] text-ink-faint"
          >
            {T.tutorial.skip}
          </button>
        )}
      </div>
    </Screen>
  );
};
