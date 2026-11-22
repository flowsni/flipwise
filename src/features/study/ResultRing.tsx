import { CountUp, Ring } from '@/design'

/** The big percentage ring of a results screen; `value` is 0–1. */
export function ResultRing({
  value,
  size,
  stroke,
  color,
  track,
}: {
  value: number
  size: number
  stroke: number
  color: string
  track?: string
}) {
  return (
    <Ring value={value} size={size} stroke={stroke} color={color} track={track} animateFromZero>
      <span className="text-4xl font-bold">
        <CountUp to={Math.round(value * 100)} suffix="%" />
      </span>
    </Ring>
  )
}
