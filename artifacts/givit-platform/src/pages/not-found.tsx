import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-givit-page">
      <Card className="w-full max-w-md mx-4 bg-card">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-givit-ember/10">
            <Compass className="h-7 w-7 text-givit-ember" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <Button asChild className="mt-6 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Link href="/">Back to GIVIT</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
