"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-6xl font-bold text-foreground">Error</h1>
        <h2 className="text-2xl font-semibold text-foreground">
          Something went wrong!
        </h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error has occurred. Please try again.
        </p>
        <div className="pt-4">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
