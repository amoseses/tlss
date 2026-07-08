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
import BoardsPage from "@/pages/boards";
import FeedbackPage from "@/pages/feedback";
import BetaTesterSurveyPage from "@/pages/beta-tester-survey";
import SubmitProductPage from "@/pages/submit-product";
import AccountPage from "@/pages/account";
import AdminPage from "@/pages/admin";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const isLanding = location === "/";

  return (
    <div className="flex min-h-screen flex-col">
      {!isLanding && <SiteHeader />}
      <main className="flex-1">
        <Switch>
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
          <Route path="/boards" component={BoardsPage} />
          <Route path="/feedback" component={FeedbackPage} />
          <Route path="/beta-tester-survey" component={BetaTesterSurveyPage} />
          <Route path="/submit-product" component={SubmitProductPage} />
          <Route path="/account" component={AccountPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isLanding && <SiteFooter />}
      {!isLanding && <LoginPrompt />}
      {!isLanding && <BetaFeedbackWidget />}
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
