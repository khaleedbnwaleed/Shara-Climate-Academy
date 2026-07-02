'use client'

import { useState, useEffect } from 'react'
import { Menu, X, ChevronRight, Leaf, BookOpen, Globe, Trophy, Users, Zap, Sprout, TrendingUp, Heart, ArrowRight, Search, Award, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'

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
    if (!certificateId.trim()) {
      setSearchResult({ found: false, message: 'Please enter a certificate ID' })
      return
    }

    setSearching(true)
    setSearchResult(null)

    try {
      // Search through all localStorage certificates
      let foundCertificate = null
      let foundUserName = null
      
      // Search through localStorage for any certificate with matching ID
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('certificate_')) {
          try {
            const certData = JSON.parse(localStorage.getItem(key) || '{}')
            if (certData.certificateId === certificateId || 
                certData.certificateId?.replace(/-/g, '') === certificateId) {
              foundCertificate = certData
              // Try to get user name from the key or store
              const userId = key.split('_')[1]
              if (userId) {
                foundUserName = `Learner ${userId.slice(0, 8)}`
              }
              break
            }
          } catch (e) {
            console.error('Error parsing certificate:', e)
          }
        }
      }
      
      // Also check for certificates in any other format
      if (!foundCertificate) {
        // Try to find in certificates store
        const allCertificates = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('certificate') || key.includes('completed'))) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}')
              if (data.certificateId === certificateId) {
                foundCertificate = data
                break
              }
            } catch (e) {}
          }
        }
      }
      
      if (foundCertificate) {
        setSearchResult({
          found: true,
          name: foundCertificate.studentName || foundCertificate.userName || foundUserName || 'Verified Learner',
          course: foundCertificate.courseTitle || foundCertificate.courseName || 'Climate Course',
          date: foundCertificate.completedDate || foundCertificate.completionDate || new Date().toLocaleDateString()
        })
      } else {
        setSearchResult({ 
          found: false, 
          message: `Certificate "${certificateId}" not found in our records. Please check the ID and try again.` 
        })
      }
      
    } catch (error) {
      console.error('Error verifying certificate:', error)
      setSearchResult({ found: false, message: 'Unable to verify certificate. Please try again later.' })
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out ${
          isScrolled ? 'bg-white/95 shadow-lg backdrop-blur-xl border-b border-border/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-2 md:py-0">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Image
                src="/Logo.png"
                alt="Shara Climate Academy"
                width={48}
                height={48}
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-28 md:w-28 object-contain"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex flex-1 items-center justify-center gap-4 lg:gap-6 xl:gap-8">
              <button onClick={() => scrollToSection('courses')} className="text-foreground hover:text-primary font-medium text-sm lg:text-base">
                Courses
              </button>
              <button onClick={() => scrollToSection('about')} className="text-foreground hover:text-primary font-medium text-sm lg:text-base">
                About
              </button>
              <button onClick={() => scrollToSection('impact')} className="text-foreground hover:text-primary font-medium text-sm lg:text-base">
                Impact
              </button>
              <button onClick={() => scrollToSection('contact')} className="text-foreground hover:text-primary font-medium text-sm lg:text-base">
                Contact
              </button>
            </div>

            {/* CTA Button */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" className="rounded-full px-4 py-2 text-sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 py-2 text-sm">
                  Start Learning
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-full text-foreground hover:bg-muted/50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div id="mobile-menu" className="md:hidden bg-white border-t border-border shadow-sm">
              <div className="px-3 py-3 space-y-2">
                {[
                  { label: 'Courses', section: 'courses' },
                  { label: 'About', section: 'about' },
                  { label: 'Impact', section: 'impact' },
                  { label: 'Contact', section: 'contact' },
                ].map((item) => (
                  <button
                    key={item.section}
                    onClick={() => scrollToSection(item.section)}
                    className="block w-full text-left rounded-xl px-4 py-3 text-foreground hover:bg-muted transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pt-2 border-t border-border">
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full rounded-full py-3 text-sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="block mt-2">
                    <Button className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-sm">
                      Start Learning
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-28 md:pt-32 pb-12 md:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-4xl md:text-6xl">🍃</div>
          <div className="absolute bottom-20 right-10 text-3xl md:text-5xl">🌱</div>
          <div className="absolute top-40 right-20 text-5xl md:text-7xl">🌍</div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-4 md:mb-6">
                Learn. Act. Lead the Climate Revolution.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto lg:mx-0 mb-6 md:mb-8">
                Shara Climate Academy equips individuals and organisations worldwide with the knowledge and skills to tackle the climate crisis — at their own pace, online.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start">
                <Button
                  onClick={() => scrollToSection('featured-courses')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-semibold"
                >
                  Explore Courses <ChevronRight className="ml-2" size={18} />
                </Button>
                <Button
                  onClick={() => scrollToSection('how-it-works')}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 rounded-full px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-semibold"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md mx-auto lg:max-w-none">
              <Carousel className="relative overflow-hidden rounded-2xl lg:rounded-3xl border border-border bg-slate-950/5 shadow-2xl">
                <CarouselContent>
                  {['/H1.png', '/H2.png'].map((src, index) => (
                    <CarouselItem key={src}>
                      <div className="relative h-64 sm:h-80 md:h-96">
                        <Image
                          src={src}
                          alt={`Featured slide ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious variant="outline" className="bg-white/90 text-foreground shadow-lg left-2" />
                <CarouselNext variant="outline" className="bg-white/90 text-foreground shadow-lg right-2" />
              </Carousel>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary text-primary-foreground py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="text-center">
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">10,000+</div>
              <div className="text-xs md:text-sm lg:text-base opacity-90">Learners Worldwide</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">50+</div>
              <div className="text-xs md:text-sm lg:text-base opacity-90">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">30+</div>
              <div className="text-xs md:text-sm lg:text-base opacity-90">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">100%</div>
              <div className="text-xs md:text-sm lg:text-base opacity-90">Expert-led</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-3 md:mb-4">
              Everything You Need to Understand Climate Change
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive courses covering all aspects of climate science and solutions
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {[
              { icon: Globe, title: 'Climate Science Fundamentals', desc: 'Master the science behind our changing climate' },
              { icon: Zap, title: 'Renewable Energy & Clean Tech', desc: 'Explore sustainable energy solutions and technologies' },
              { icon: Users, title: 'Climate Policy & Governance', desc: 'Understand policy frameworks driving climate action' },
              { icon: Sprout, title: 'Sustainable Agriculture', desc: 'Learn regenerative farming and land use practices' },
              { icon: TrendingUp, title: 'Carbon Markets & Green Finance', desc: 'Navigate climate finance and carbon pricing' },
              { icon: Heart, title: 'Community & Grassroots Action', desc: 'Build movements for local climate change' },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-4 md:p-6 lg:p-8 rounded-xl bg-card border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                  <feature.icon className="text-primary" size={20} />
                </div>
                <h3 className="text-base md:text-lg lg:text-xl font-bold text-foreground mb-1 md:mb-2">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section id="featured-courses" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-3 md:mb-4">
              Start With Our Most Popular Courses
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Choose from beginner-friendly introductions to advanced professional certifications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: 'Climate Change 101 — Understanding the Basics',
                level: 'Beginner',
                price: 'Free',
                image: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500&h=300&fit=crop',
              },
              {
                title: 'Introduction to SDGs Goals',
                level: 'Beginer',
                price: 'Free',
                image: '/SDGs.jpeg'
              },
              {
                title: 'Climate Finance & Carbon Credits',
                level: 'Advanced',
                price: '₦12,000',
                image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=300&fit=crop',
              },
            ].map((course, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-card border border-border hover:shadow-xl transition-all duration-300 group">
                <div className="relative overflow-hidden h-48 md:h-56">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 md:top-4 right-3 md:right-4 bg-primary/90 text-primary-foreground px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                    {course.level}
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-bold text-foreground mb-3 md:mb-4 line-clamp-2 text-sm md:text-base">{course.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-bold text-base md:text-lg">{course.price}</span>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm md:text-base">
                      Enroll Now <ArrowRight size={14} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary">
              Learn at Your Own Pace, Anywhere in the World
            </h2>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12 lg:gap-16">
            {[
              { step: '1', title: 'Create your free account', icon: Users },
              { step: '2', title: 'Choose your course or learning path', icon: BookOpen },
              { step: '3', title: 'Learn, get certified, and make impact', icon: Trophy },
            ].map((item, i) => (
              <div key={i} className="relative text-center flex-1 max-w-xs">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="text-primary" size={28} />
                </div>
                <h3 className="text-sm md:text-base lg:text-lg font-bold text-foreground mb-1 md:mb-2">{item.title}</h3>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 -right-6 lg:-right-8 w-12 lg:w-16 h-0.5 bg-primary/20">
                    <div className="absolute right-0 w-2 h-2 bg-primary rounded-full transform -translate-y-1/2 top-1/2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact/Testimonials */}
      <section id="impact" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary">
              Our Learners Are Changing the World
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                name: 'Muhammad sabir babangida',
                state: 'jigawa state, Nigeria',
                quote: 'The course gave me the knowledge to launch my renewable energy startup. Life-changing!',
              },
              {
                name: 'Ahmad Abubakar muhammad',
                state: 'Kano state, Nigeria',
                quote: 'I&apos;ve never felt more empowered to advocate for climate policy. Shara changed my career path.',
              },
              {
                name: 'Maryam Ahmad',
                state: 'Bauchi state, Nigeria',
                quote: 'The practical skills from carbon markets course helped our company reduce emissions by 40%.',
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-card rounded-xl p-6 md:p-8 border border-border">
                <p className="text-muted-foreground mb-4 italic text-sm md:text-base">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm md:text-base">{testimonial.name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{testimonial.country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificate Verification Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <Award className="h-12 w-12 md:h-16 md:w-16 text-primary mx-auto mb-3 md:mb-4" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2 md:mb-3">
              Verify a Certificate
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Enter a certificate ID to verify the learner's information
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 md:p-8 border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCertificateSearch()}
                  placeholder="Enter certificate ID (e.g., A6sUZhRv-U72jhSHk)"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base"
                />
              </div>
              <Button
                onClick={handleCertificateSearch}
                disabled={searching}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 md:px-8 py-3 text-sm md:text-base whitespace-nowrap"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" /> Verify Certificate
                  </>
                )}
              </Button>
            </div>

            {/* Search Result */}
            {searchResult && (
              <div className={`mt-4 md:mt-6 p-4 rounded-lg ${searchResult.found ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {searchResult.found ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-700 text-sm md:text-base">Certificate Verified!</span>
                    </div>
                    <div className="space-y-2 text-sm md:text-base">
                      <p><strong className="text-foreground">Issued to:</strong> <span className="text-muted-foreground">{searchResult.name}</span></p>
                      <p><strong className="text-foreground">Course:</strong> <span className="text-muted-foreground">{searchResult.course}</span></p>
                      <p><strong className="text-foreground">Completion Date:</strong> <span className="text-muted-foreground">{searchResult.date}</span></p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-green-600">✓ This is a valid certificate issued by Shara Climate Academy</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-700 text-sm md:text-base">Certificate Not Found</span>
                    </div>
                    <p className="text-sm md:text-base text-red-600">{searchResult.message}</p>
                    <p className="text-xs text-red-500 mt-2">Please check the certificate ID and try again.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section id="audiences" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary">
              Shara Climate Academy Is for Everyone
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'Students & Youth', icon: BookOpen, desc: 'Start your climate career early' },
              { title: 'Working Professionals', icon: Users, desc: 'Upgrade your skills and knowledge' },
              { title: 'NGOs & Civil Society', icon: Heart, desc: 'Strengthen your climate impact' },
              { title: 'Government & Policy Makers', icon: Globe, desc: 'Lead evidence-based climate policy' },
            ].map((audience, i) => (
              <div key={i} className="text-center p-4 md:p-6 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <audience.icon className="text-primary" size={20} />
                </div>
                <h3 className="font-bold text-foreground text-sm md:text-base mb-1 md:mb-2">{audience.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{audience.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
            Ready to Be Part of the Solution?
          </h2>
          <p className="text-sm md:text-base lg:text-lg mb-6 md:mb-8 opacity-95 px-4">
            Join thousands of learners already taking action on climate change.
          </p>
          <Link href="/register">
            <Button className="bg-white hover:bg-white/90 text-primary rounded-full px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-semibold">
              Join Shara Climate Academy — It's Free <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-foreground text-white py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8 md:mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Leaf size={24} />
                <span className="font-bold text-lg">Shara</span>
              </div>
              <p className="text-white/70 text-sm">Empowering climate action through education.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Courses</h4>
              <ul className="space-y-2 text-white/70 text-xs md:text-sm">
                <li><button onClick={() => scrollToSection('featured-courses')} className="hover:text-white">All Courses</button></li>
                <li><button className="hover:text-white">For Students</button></li>
                <li><button className="hover:text-white">For Professionals</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">About Us</h4>
              <ul className="space-y-2 text-white/70 text-xs md:text-sm">
                <li><button className="hover:text-white">Our Mission</button></li>
                <li><button className="hover:text-white">Team</button></li>
                <li><button className="hover:text-white">Impact Report</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Resources</h4>
              <ul className="space-y-2 text-white/70 text-xs md:text-sm">
                <li><button className="hover:text-white">Blog</button></li>
                <li><button className="hover:text-white">Newsletter</button></li>
                <li><button className="hover:text-white">Contact</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 md:pt-8 text-center text-white/60 text-xs md:text-sm">
            <p>© 2026 Shara Climate Academy. All rights reserved. | <button className="hover:text-white">Privacy Policy</button> | <button className="hover:text-white">Terms</button></p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {isScrolled && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 w-10 h-10 md:w-12 md:h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center z-40"
          aria-label="Back to top"
        >
          <ChevronRight size={20} className="rotate-90" />
        </button>
      )}
    </div>
  )
}