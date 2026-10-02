import Image from 'next/image'
import { Quote } from 'lucide-react'

interface TestimonialCardProps {
  quote: string
  name: string
  role: string
  organisation?: string
  image?: string
}

export function TestimonialCard({
  quote,
  name,
  role,
  organisation,
  image,
}: TestimonialCardProps) {
  return (
    <article className="h-full rounded-[28px] border border-border/80 bg-card p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
      <div className="mb-5 flex items-center justify-between text-[#1d7555]">
        <Quote className="h-8 w-8" />
        <span className="rounded-full bg-[#edf7ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1d7555]">
          Learner story
        </span>
      </div>

      <p className="text-base leading-7 text-foreground/90">“{quote}”</p>

      <div className="mt-6 flex items-center gap-3 border-t border-border/80 pt-5">
        <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border bg-muted">
          {image ? (
            <Image src={image} alt={name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#edf7ef] text-sm font-semibold text-[#1d7555]">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            {role}
            {organisation ? ` • ${organisation}` : ''}
          </p>
        </div>
      </div>
    </article>
  )
}
