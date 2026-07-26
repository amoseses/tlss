import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/use-auth";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LoginPrompt } from "@/components/personalization/login-prompt";
import { BetaFeedbackWidget } from "@/components/feedback/beta-feedback-widget";

import LandingPage from "@/pages/landing";
import HomePage from "@/pages/home";
import ProductsPage from "@/pages/products";
import ProductDetailPage from "@/pages/product-detail";
import GiftFinderPage from "@/pages/gift";
import AutoGiftRecommendPage from "@/pages/autogift-recommend";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import ConciergePage from "@/pages/concierge";
import PeoplePage from "@/pages/people";
import BoardsPage from "@/pages/boards";
import FeedbackPage from "@/pages/feedback";
import BetaTesterSurveyPage from "@/pages/beta-tester-survey";
import SubmitProductPage from "@/pages/submit-product";
import AccountPage from "@/pages/account";
import OrdersPage from "@/pages/orders";
import AdminPage from "@/pages/admin";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Route swaps used to be an instant unmount/remount — the old page's content
// vanished and the new page's (plus its own entrance animations) popped in on
// the same frame, reading as a blink/flash rather than a navigation. This
// crossfades the swap itself: fade the outgoing page out, then swap content
// and fade the incoming page in. Plain CSS transition + state, no animation
// library, so there's nothing that can crash on a bad dependency resolution.
function usePageTransition(location: string) {
  const [displayLocation, setDisplayLocation] = useState(location);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (location === displayLocation) return;
    setOpacity(0);
    const swap = window.setTimeout(() => {
      setDisplayLocation(location);
      // Committing opacity:0 for the new content first, then flipping to 1
      // on the next frame, is what makes the browser actually animate the
      // fade-in instead of just snapping straight to visible.
      requestAnimationFrame(() => setOpacity(1));
    }, 150);
    return () => window.clearTimeout(swap);
  }, [location, displayLocation]);

  // Client-side routing never resets scroll position on its own, so
  // navigating to a shorter page (e.g. a product detail page, or the
  // Givit AI chat) while scrolled down on a taller previous page landed
  // wherever that old offset happened to fall on the new page -- often its
  // very bottom. This has to be a separate effect keyed on displayLocation
  // (not fired inline with setDisplayLocation above): calling scrollTo(0,0)
  // in the same synchronous callback that triggers the page swap runs
  // BEFORE React actually commits the new page into the DOM, and the
  // browser's own scroll-anchoring then compensates for that subsequent
  // swap by dragging the scroll position away from 0 again. Running here,
  // after displayLocation (and therefore the DOM) has already changed,
  // avoids the race entirely.
  useEffect(() => {
    // A single scrollTo(0, 0) here loses a race against something later in
    // the same navigation (borne out live: reading scrollY immediately
    // after the call already shows a nonzero value, and it settles on a
    // consistent nonzero offset a few hundred ms later regardless of which
    // page was navigated to) -- so this re-asserts across the window where
    // that late corrective scroll actually lands, instead of relying on a
    // single well-timed call to win outright.
    const resetScroll = () => window.scrollTo(0, 0);
    resetScroll();
    const raf = requestAnimationFrame(resetScroll);
    const timers = [30, 100, 250, 500, 800].map((ms) => window.setTimeout(resetScroll, ms));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [displayLocation]);

  return { displayLocation, opacity };
}

function Router() {
  const [location] = useLocation();
  const { displayLocation, opacity } = usePageTransition(location);
  const isLanding = displayLocation === "/";

  return (
    <div className="flex min-h-screen flex-col">
      {!isLanding && <SiteHeader />}
      <main className="flex-1" style={{ opacity, transition: "opacity 150ms ease-in-out" }}>
        <Switch location={displayLocation}>
          <Route path="/" component={LandingPage} />
          <Route path="/home" component={HomePage} />
          <Route path="/products" component={ProductsPage} />
          <Route path="/products/:slug" component={ProductDetailPage} />
          <Route path="/gift" component={GiftFinderPage} />
          <Route path="/autogift/recommend" component={AutoGiftRecommendPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/signup" component={SignupPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/auth-callback" component={AuthCallbackPage} />
          <Route path="/concierge" component={ConciergePage} />
          <Route path="/people" component={PeoplePage} />
          <Route path="/boards" component={BoardsPage} />
          <Route path="/feedback" component={FeedbackPage} />
          <Route path="/beta-tester-survey" component={BetaTesterSurveyPage} />
          <Route path="/submit-product" component={SubmitProductPage} />
          <Route path="/account" component={AccountPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isLanding && <SiteFooter />}
      {!isLanding && <LoginPrompt />}
      <BetaFeedbackWidget />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
