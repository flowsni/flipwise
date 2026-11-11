import { parseMarked } from './prompt'

/** Renders [[marked]] words as <mark>; model output is always treated as text, never HTML. */
export function Marked({ text }: { text: string }) {
  return (
    <>
      {parseMarked(text).map((seg, i) =>
        seg.mark ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static segments
          <mark key={i} className="font-semibold">
            {seg.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static segments
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}
