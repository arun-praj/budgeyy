import Link from 'next/link';
import { ArrowRight, PiggyBank, BarChart3, Shield, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Budgeyy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm bg-muted/50">
            <span className="text-muted-foreground">✨ Now with Nepali Calendar Support</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Master Your Finances with the{' '}
            <span className="text-primary">50/30/20 Rule</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Track your income, manage expenses, and build healthy savings habits.
            Budgeyy makes personal finance simple, visual, and actually enjoyable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                I have an account
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <PiggyBank className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">50/30/20 Budgeting</h3>
            <p className="text-muted-foreground">
              Automatically categorize spending into Needs, Wants, and Savings.
              Stay on track with visual progress bars.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border">
            <div className="mx-auto w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold">Beautiful Analytics</h3>
            <p className="text-muted-foreground">
              Interactive charts and insightful visualizations help you
              understand your spending patterns at a glance.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-2xl bg-card border">
            <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold">Secure & Private</h3>
            <p className="text-muted-foreground">
              Your financial data stays yours. End-to-end encryption and
              secure authentication keep your information safe.
            </p>
          </div>
        </div>

        {/* 50/30/20 Explanation */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The 50/30/20 Rule</h2>
            <p className="text-muted-foreground">
              A simple but powerful framework for managing your money
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-4 p-6 rounded-xl border bg-blue-500/5">
              <div className="text-4xl font-bold text-blue-500">50%</div>
              <div>
                <h4 className="font-semibold text-lg">Needs</h4>
                <p className="text-muted-foreground">Essential expenses: rent, utilities, groceries, insurance</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 rounded-xl border bg-purple-500/5">
              <div className="text-4xl font-bold text-purple-500">30%</div>
              <div>
                <h4 className="font-semibold text-lg">Wants</h4>
                <p className="text-muted-foreground">Discretionary spending: dining out, entertainment, hobbies</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 rounded-xl border bg-emerald-500/5">
              <div className="text-4xl font-bold text-emerald-500">20%</div>
              <div>
                <h4 className="font-semibold text-lg">Savings</h4>
                <p className="text-muted-foreground">Future you: emergency fund, investments, retirement</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-semibold">Budgeyy</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Budgeyy. Made with ❤️ for better finances.
          </p>
        </div>
      </footer>
    </div>
  );
}
