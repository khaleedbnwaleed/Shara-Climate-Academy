'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Globe,
  Heart,
  Leaf,
  Menu,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'

const topicCards = [
  {
    title: 'Climate Science Fundamentals',
    description: 'Master the science behind our changing climate.',
    icon: Leaf,
  },
  {
    title: 'Renewable Energy & Clean Tech',
    description: 'Explore sustainable energy solutions and technologies.',
    icon: TrendingUp,
  },
  {
    title: 'Sustainable Agriculture',
    description: 'Learn regenerative farming and land-use practices.',
    icon: BookOpen,
  },
  {
    title: 'Climate Policy & Governance',
    description: 'Understand the frameworks shaping climate action.',
    icon: Globe,
  },
  {
    title: 'Carbon Markets & Green Finance',
    description: 'Navigate climate finance and carbon pricing.',
    icon: Users,
  },
  {
    title: 'Community & Grassroots Action',
    description: 'Build movements for meaningful local climate action.',
    icon: Heart,
  },
]

const featuredCourses = [
  {
    title: 'Climate Change 101 — Understanding the Basics',
    level: 'Beginner',
    price: 'Free',
    image: '/H1.webp',
  },
  {
    title: 'Introduction to SDGs Goals',
    level: 'Beginner',
    price: 'Free',
    image: '/SDGs.jpeg',
  },
  {
    title: 'Climate Finance & Carbon Credits',
    level: 'Advanced',
    price: '₦12,000',
    image: '/H2.webp',
  },
]

const testimonials = [
  {
    quote: 'The course gave me the knowledge to launch my renewable energy startup. Life-changing!',
    name: 'Muhammad Sabir Babangida',
    location: 'Jigawa State, Nigeria',
  },
  {
    quote: 'I have never felt more empowered to advocate for climate policy. Shara changed my career path.',
    name: 'Ahmad Abubakar Muhammad',
    location: 'Kano State, Nigeria',
  },
  {
    quote: 'The practical skills from the carbon markets course helped our company reduce emissions by 40%.',
    name: 'Maryam Ahmad',
    location: 'Bauchi State, Nigeria',
  },
]

const whoItsFor = [
  {
    title: 'Students & Youth',
    icon: BookOpen,
    description: 'Start your climate career early.',
  },
  {
    title: 'Working Professionals',
    icon: Users,
    description: 'Upgrade your skills and knowledge.',
  },
  {
    title: 'NGOs & Civil Society',
    icon: Heart,
    description: 'Strengthen your climate impact.',
  },
  {
    title: 'Government & Policy',
    icon: Trophy,
    description: 'Lead evidence-based climate policy.',
  },
]

export default function Home() {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [certificateId, setCertificateId] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<{
    found: boolean
    name?: string
    course?: string
    date?: string
    message?: string
  } | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false)
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCertificateSearch = async () => {
    const enteredId = certificateId.trim()
    if (!enteredId) {
      setSearchResult({ found: false, message: 'Please enter a certificate ID' })
      return
    }

    setSearching(true)
    setSearchResult(null)

    try {
      const normalizeId = (value: string) => value.trim().replace(/-/g, '')
      const requestedId = normalizeId(enteredId)
      let matchedCertificate: Record<string, string> | null = null
      let matchedOwnerId: string | null = null
      let matchedKey: string | null = null

      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index)
        if (!key?.startsWith('certificate_')) continue

        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, string>
          if (typeof data.certificateId === 'string' && normalizeId(data.certificateId) === requestedId) {
            matchedCertificate = data
            matchedOwnerId = key.slice('certificate_'.length).split('_')[0] || null
            matchedKey = key
            break
          }
        } catch (error) {
          console.error('Unable to read a saved certificate record:', error)
        }
      }

      if (matchedCertificate) {
        let studentName = matchedCertificate.studentName || matchedCertificate.userName

        if (!studentName && matchedOwnerId === user?.uid) {
          studentName = user.name
        }

        if (studentName && matchedKey && !matchedCertificate.studentName) {
          matchedCertificate.studentName = studentName
          localStorage.setItem(matchedKey, JSON.stringify(matchedCertificate))
        }

        setSearchResult({
          found: true,
          name: studentName || 'Name unavailable',
          course: matchedCertificate.courseTitle || matchedCertificate.courseName || 'Course title not recorded',
          date: matchedCertificate.completedDate || matchedCertificate.completionDate || 'Completion date not recorded',
        })
      } else {
        setSearchResult({
          found: false,
          message: 'No matching certificate record was found in this browser. Certificates stored on another device cannot be checked online yet.',
        })
      }
    } catch (error) {
      console.error('Error checking saved certificates:', error)
      setSearchResult({ found: false, message: 'Unable to read saved certificate records in this browser.' })
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          isScrolled
            ? 'border-border bg-background'
            : 'border-transparent bg-background'
        }`}
      >
        <div className="container-shell flex items-center justify-between gap-4 py-3 md:py-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 text-left"
            aria-label="Back to top"
          >
            <Image src="/Logo.png" alt="Shara Climate Academy" width={52} height={52} className="h-12 w-12 object-contain md:h-14 md:w-14" />
            <div className="hidden sm:block">
              <p className="font-display text-xl text-primary">Shara</p>
            </div>
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <button type="button" onClick={() => scrollToSection('courses')} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Courses
            </button>
            <button type="button" onClick={() => scrollToSection('about')} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              About
            </button>
            <button type="button" onClick={() => scrollToSection('impact')} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Impact
            </button>
            <button type="button" onClick={() => scrollToSection('certificate-verification')} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Verify certificate
            </button>
            <button type="button" onClick={() => scrollToSection('contact')} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Contact
            </button>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login">
              <Button variant="outline" size="sm" className="rounded-full px-4">
                Sign In
              </Button>
            </Link>
            <Link href={user ? '/dashboard' : '/login'}>
              <Button size="sm" className="rounded-full px-5">
                Start Learning
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground md:hidden"
            onClick={() => setIsMenuOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="border-t border-border bg-card md:hidden">
            <div className="container-shell space-y-2 py-4">
              {[
                { label: 'Courses', section: 'courses' },
                { label: 'About', section: 'about' },
                { label: 'Impact', section: 'impact' },
                { label: 'Verify certificate', section: 'certificate-verification' },
                { label: 'Contact', section: 'contact' },
              ].map(({ label, section }) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => scrollToSection(section)}
                  className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
                >
                  {label}
                </button>
              ))}
              <div className="grid gap-2 pt-3">
                <Link href="/login">
                  <Button variant="outline" className="w-full rounded-full">
                    Sign In
                  </Button>
                </Link>
                <Link href={user ? '/dashboard' : '/login'}>
                  <Button className="w-full rounded-full">
                    Start Learning
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </nav>

      <main>
        <section className="pt-20 md:pt-24">
          <div className="container-shell grid items-center gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center py-12 md:py-16 lg:pr-14 lg:py-20">
              <p className="mb-6 border-l-2 border-[#d59436] pl-4 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                Climate education, rooted in Africa
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
                Learn. Act. Lead the Climate Revolution.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                Shara Climate Academy equips individuals and organisations with the knowledge and skills to tackle the climate crisis, at their own pace and online.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link href="/courses">
                  <Button size="lg" className="rounded-sm px-6">
                    Explore courses
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">Self-paced · Expert-led · Online</span>
              </div>
            </div>
            <figure className="relative h-72 overflow-hidden bg-[#1b3328] sm:h-80 lg:h-105">
              <Image
                src="/H2.webp"
                alt="Young learners gathered around a laptop in their community"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center"
              />
              <figcaption className="absolute bottom-0 left-0 max-w-[85%] bg-[#173f30] px-5 py-4 text-sm leading-6 text-white sm:px-7">
                Climate learning should meet people where they are, and equip them to shape what comes next.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-y border-border bg-[#173f30] py-7 text-white">
          <div className="container-shell grid grid-cols-2 gap-y-6 md:grid-cols-4 md:gap-4">
            {[
              ['50+', 'Learners worldwide'],
              ['10+', 'Courses'],
              ['2', 'Countries'],
              ['100%', 'Expert-led'],
            ].map(([value, label]) => (
              <div key={label} className="border-l border-white/25 pl-4 md:pl-6">
                <p className="font-display text-3xl text-[#f3ca79]">{value}</p>
                <p className="mt-1 text-sm text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="courses" className="py-20 md:py-28">
          <div className="container-shell">
            <div className="grid gap-6 border-b border-border pb-8 md:grid-cols-[0.75fr_1.25fr] md:items-end">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">What you can learn</p>
              <h2 className="max-w-3xl font-display text-4xl leading-tight text-foreground sm:text-5xl">
                Practical knowledge for the climate challenges around us.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 md:gap-x-14">
              {topicCards.map(({ title, description, icon: Icon }, index) => (
                <article key={title} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-border py-6 md:gap-6">
                  <span className="pt-1 font-display text-xl text-[#b36c32]">0{index + 1}</span>
                  <div>
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" strokeWidth={1.7} />
                      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#eae7dd] py-20 dark:bg-[#182c24] md:py-28">
          <div className="container-shell">
            <div className="flex flex-col gap-5 border-b border-[#b8b7ad] pb-7 dark:border-[#465a50] md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Start learning</p>
                <h2 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">Courses to turn concern into informed action.</h2>
              </div>
              <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-foreground">
                View all courses <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-0 md:grid-cols-3 md:divide-x md:divide-[#b8b7ad] md:dark:divide-[#465a50]">
              {featuredCourses.map((course, index) => (
                <article key={course.title} className="group border-b border-[#b8b7ad] pb-7 dark:border-[#465a50] md:border-b-0 md:px-6 md:pb-0 md:first:pl-0 md:last:pr-0">
                  <Link href="/courses" className="block">
                    <div className="relative mb-5 aspect-[1.6] overflow-hidden bg-[#d8d5ca]">
                      <Image src={course.image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      <span className="absolute left-0 top-0 bg-[#173f30] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">{course.level}</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Course 0{index + 1}</p>
                    <h3 className="mt-2 min-h-14 text-xl font-semibold leading-7 text-foreground group-hover:text-primary">{course.title}</h3>
                    <div className="mt-5 flex items-center justify-between border-t border-[#b8b7ad] pt-4 dark:border-[#465a50]">
                      <span className="font-semibold text-primary">{course.price}</span>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">Explore <ArrowRight className="h-4 w-4" /></span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="py-20">
          <div className="container-shell grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <figure className="relative min-h-82.5 overflow-hidden bg-[#b9b9a3] md:min-h-120">
              <Image src="/H1.webp" alt="Community members working together in a green, rural environment" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <figcaption className="absolute bottom-0 left-0 bg-[#f0c875] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#173f30]">
                Learning starts with lived experience
              </figcaption>
            </figure>

            <div className="lg:pl-8">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">A practical way to learn</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-5xl">Learn at your own pace, anywhere in the world.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Build your knowledge step by step, then take what you learn into your work, studies and community.
              </p>
              <div className="mt-8 border-t border-border">
                {[
                  { step: '01', title: 'Create your free account', description: 'Set up your learner profile and choose where to begin.' },
                  { step: '02', title: 'Choose a course', description: 'Explore climate learning paths and find a topic that matters to you.' },
                  { step: '03', title: 'Learn and get certified', description: 'Work through lessons at your own pace and earn a certificate.' },
                ].map((item) => (
                  <div key={item.step} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-border py-5">
                    <span className="font-display text-xl text-[#b36c32]">{item.step}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="impact" className="bg-[#173f30] py-20 text-white md:py-28">
          <div className="container-shell grid gap-8 md:grid-cols-[0.4fr_1.6fr] md:items-start">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#f0c875]">Why climate education</p>
            <div>
              <h2 className="max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                The climate crisis is global. The knowledge to respond must be within everyone’s reach.
              </h2>
              <div className="mt-8 flex flex-col gap-6 border-t border-white/25 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <p className="max-w-xl text-base leading-7 text-white/80">
                  We make climate learning accessible, practical and relevant to the people and communities already shaping change.
                </p>
                <Link href="/register" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#f0c875] hover:text-white">
                  Begin learning <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container-shell">
            <div className="grid gap-6 border-b border-border pb-8 md:grid-cols-[0.75fr_1.25fr] md:items-end">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Learner voices</p>
              <h2 className="max-w-3xl font-display text-4xl leading-tight text-foreground sm:text-5xl">Knowledge becomes powerful when it travels back into the community.</h2>
            </div>

            <div className="grid md:grid-cols-3 md:divide-x md:divide-border">
              {testimonials.map((testimonial, index) => (
                <figure key={testimonial.name} className="border-b border-border py-7 md:border-b-0 md:px-6 md:first:pl-0 md:last:pr-0">
                  <span className="font-display text-4xl leading-none text-[#b36c32]">“</span>
                  <blockquote className="mt-2 text-lg leading-7 text-foreground">{testimonial.quote}</blockquote>
                  <figcaption className="mt-6 border-t border-border pt-4">
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{testimonial.location}</p>
                  </figcaption>
                  <span className="sr-only">Learner story {index + 1}</span>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#eae7dd] py-20 dark:bg-[#182c24] md:py-24">
          <div className="container-shell">
            <div className="grid gap-6 md:grid-cols-[0.75fr_1.25fr] md:items-end">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Who it’s for</p>
              <h2 className="max-w-3xl font-display text-4xl leading-tight text-foreground sm:text-5xl">Climate learning for the people shaping what comes next.</h2>
            </div>

            <div className="mt-8 grid border-t border-[#b8b7ad] dark:border-[#465a50] sm:grid-cols-2 lg:grid-cols-4">
              {whoItsFor.map(({ title, description, icon: Icon }) => (
                <article key={title} className="border-b border-[#b8b7ad] py-6 dark:border-[#465a50] sm:px-5 sm:first:pl-0 lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:dark:border-[#465a50]">
                  <Icon className="mb-5 h-5 w-5 text-primary" strokeWidth={1.7} />
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="certificate-verification" className="py-20 md:py-24">
          <div className="container-shell grid gap-8 border-y border-border py-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Certificate verification</p>
                <h2 className="mt-3 max-w-xl font-display text-4xl leading-tight text-foreground sm:text-5xl">Confirm a Shara learner’s achievement.</h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                  Enter a certificate ID to look up the learner and course details.
                </p>
              </div>

              <div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={certificateId}
                    onChange={(event) => setCertificateId(event.target.value)}
                    placeholder="Enter certificate ID"
                    aria-label="Certificate ID"
                    onKeyDown={(event) => event.key === 'Enter' && handleCertificateSearch()}
                    className="h-12 rounded-sm bg-card"
                  />
                  <Button onClick={handleCertificateSearch} disabled={searching} className="h-12 rounded-sm px-6">
                    {searching ? 'Verifying...' : 'Verify certificate'}
                  </Button>
                </div>

                {searchResult ? (
                  <div className={`mt-4 border-l-2 p-4 ${searchResult.found ? 'border-[#1d7555] bg-[#edf7ef] dark:border-[#63c48d] dark:bg-[#1a3428]' : 'border-[#b4513c] bg-[#fbefec] dark:border-[#ea7f74] dark:bg-[#3b2420]'}`} role="status" aria-live="polite">
                    {searchResult.found ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#1d7555] dark:text-[#8ed4a9]">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold">Certificate record found</span>
                        </div>
                        <p className="text-base text-foreground"><span className="font-semibold">Name:</span> {searchResult.name}</p>
                        <p className="text-base text-foreground"><span className="font-semibold">Course:</span> {searchResult.course}</p>
                        <p className="text-base text-foreground"><span className="font-semibold">Date:</span> {searchResult.date}</p>
                      </div>
                    ) : (
                      <div className="space-y-2" role="status" aria-live="polite">
                        <p className="font-semibold text-foreground">No local certificate match</p>
                        <p className="text-sm leading-6 text-foreground">{searchResult.message}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
          </div>
        </section>

        <section className="bg-[#dfe8d9] py-14 dark:bg-[#263f32] md:py-20">
          <div className="container-shell flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Take the first step</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">Make climate learning part of your next move.</h2>
            </div>
            <Link href="/register" className="shrink-0">
              <Button size="lg" className="rounded-sm px-6">
                Create your account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-white/15 bg-[#10251d] text-white">
        <div className="container-shell py-10 md:py-12">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Image src="/Logo.png" alt="Shara Climate Academy" width={52} height={52} className="h-12 w-12 object-contain" />
                <span className="font-display text-2xl text-white">Shara Climate Academy</span>
              </div>
              <p className="max-w-sm text-sm leading-6 text-white/70">Empowering climate action through education.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#f0c875]">Explore</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/75">
                <li><Link href="/courses">Courses</Link></li>
                <li><Link href={user ? '/dashboard' : '/login'}>Dashboard</Link></li>
                <li><Link href="/login">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#f0c875]">Academy</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/75">
                <li><Link href="/#about">How it works</Link></li>
                <li><Link href="/#impact">Our purpose</Link></li>
                <li><Link href="/verify-certificate">Verify certificate</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/15 pt-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Shara Climate Academy. All rights reserved.</p>
            <p>Education for climate action.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}