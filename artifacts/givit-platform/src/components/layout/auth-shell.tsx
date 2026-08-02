import { FadeInHero } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12">
      <FadeInHero className={cn("w-full max-w-md", className)}>{children}</FadeInHero>
    </div>
  );
}
