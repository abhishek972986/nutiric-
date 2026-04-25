import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>Something went wrong during authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            There was a problem signing you in. Please try again or contact support if the issue persists.
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/auth/login">Try Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
