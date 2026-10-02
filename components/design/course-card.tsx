import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpenText, Clock3, Star, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CourseCardProps {
  course: {
    id?: string
    title?: string
    description?: string
    category?: string
    level?: string
    duration?: number | string
    lessonCount?: number
    instructorName?: string
    rating?: number
    price?: number | string
    imageUrl?: string
    totalStudents?: number
  }
  className?: string
}

export function CourseCard({ course, className }: CourseCardProps) {
  const courseId = course.id || course.title?.toLowerCase().replace(/\s+/g, '-') || 'course'
  const level = String(course.level || 'Beginner')
  const priceValue = Number(course.price ?? 0)
  const priceLabel = priceValue > 0 ? `₦${priceValue.toLocaleString()}` : 'Free'

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-[28px] border border-border/80 bg-card text-left shadow-[0_18px_60px_-38px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_65px_-35px_rgba(23,79,57,0.35)]',
        className,
      )}
    >
      <Link href={`/courses/${courseId}`} className="block">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={course.imageUrl || '/H2.webp'}
            alt={course.title || 'Climate course'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/70 via-[#0f172a]/10 to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Badge className="rounded-full border-white/30 bg-white/15 text-white backdrop-blur-sm">
              {course.category || 'Climate Action'}
            </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
            <Badge
              variant={
                level.toLowerCase() === 'advanced'
                  ? 'outline'
                  : level.toLowerCase() === 'intermediate'
                    ? 'secondary'
                    : 'default'
              }
              className="rounded-full"
            >
              {level}
            </Badge>
            <span className="rounded-full bg-[#f7f3eb] px-3 py-1 text-sm font-semibold text-[#1b3a2d]">
              {priceLabel}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {course.duration || '4'} weeks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenText className="h-3.5 w-3.5" />
              {course.lessonCount || 8} lessons
            </span>
          </div>

          <div>
            <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-foreground">
              {course.title || 'Climate Leadership Essentials'}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {course.description || 'Build the practical knowledge you need to lead local climate action.'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1d7555]" />
              <span>{course.totalStudents || 1200} learners</span>
            </div>
            <div className="inline-flex items-center gap-1.5 font-medium text-[#1d7555]">
              <Star className="h-4 w-4 fill-[#f5b942] text-[#f5b942]" />
              {course.rating || 4.9}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-sm text-muted-foreground">
              {course.instructorName || 'Shara Faculty'}
            </span>
            <Button size="sm" className="rounded-full px-3 py-2">
              Enroll
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Link>
    </div>
  )
}
