import { FadeIn } from "@/components/motion/reveal";

export function ProductDetailFrame({ children }: { children: React.ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
