import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Leaf, 
  Camera, 
  Trophy, 
  Users, 
  Target, 
  Zap, 
  TrendingUp,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: Camera,
    title: 'AI Meal Scanner',
    description: 'Simply take a photo of your meal and our AI instantly identifies foods and calculates nutritional values.',
  },
  {
    icon: Target,
    title: 'Smart Goal Tracking',
    description: 'Set personalized calorie and macro goals based on your body metrics and fitness objectives.',
  },
  {
    icon: Trophy,
    title: 'Leaderboards',
    description: 'Compete with friends and the community to stay motivated and accountable on your journey.',
  },
  {
    icon: Users,
    title: 'Friends System',
    description: 'Connect with friends, share progress, and support each other in achieving health goals.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Visual insights into your nutrition habits with detailed charts and weekly summaries.',
  },
  {
    icon: Zap,
    title: 'Health Calculator',
    description: 'Calculate BMI, BMR, and get personalized daily calorie recommendations.',
  },
]

const benefits = [
  'Track unlimited meals per day',
  'AI-powered food recognition',
  'Detailed macro breakdown',
  'Weekly progress reports',
  'Community challenges',
  'Meal history & patterns',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">NutriRace</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            AI-Powered Nutrition Tracking
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance leading-tight">
            Track Calories. Race Friends.{' '}
            <span className="text-primary">Win Your Health.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            The smartest way to track your nutrition. Snap a photo, get instant calorie counts, 
            and compete with friends on weekly leaderboards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-base px-8">
              <Link href="/auth/sign-up">
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="#features">See How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
            <div className="text-sm text-muted-foreground mt-1">Active Users</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">500K+</div>
            <div className="text-sm text-muted-foreground mt-1">Meals Tracked</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
            <div className="text-sm text-muted-foreground mt-1">AI Accuracy</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make nutrition tracking effortless and fun.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Choose NutriRace?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We combine cutting-edge AI technology with social features to make 
                healthy eating a fun, competitive experience.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-background rounded-2xl p-6 shadow-xl border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Lunch Detected</div>
                    <div className="text-sm text-muted-foreground">3 items identified</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-foreground">Grilled Chicken</span>
                    <span className="text-muted-foreground">280 cal</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-foreground">Brown Rice</span>
                    <span className="text-muted-foreground">215 cal</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-foreground">Mixed Vegetables</span>
                    <span className="text-muted-foreground">85 cal</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">580 cal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Health?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who have already started their nutrition journey with NutriRace.
          </p>
          <Button size="lg" asChild className="text-base px-8">
            <Link href="/auth/sign-up">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">NutriRace</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Made with care for your health journey
          </div>
        </div>
      </footer>
    </div>
  )
}
