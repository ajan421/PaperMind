import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResearchAssistant from "@/pages/research-assistant";
import PodcastGenerator from "@/pages/podcast-generator";
import GapAnalyzer from "@/pages/gap-analyzer";
import SystematicReview from "@/pages/systematic-review";
import CAGSystem from "@/pages/cag-system";
import ResearchInsights from "@/pages/research-insights";
import Footer from "./components/layout/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/research-assistant" component={ResearchAssistant} />
      <Route path="/podcast-generator" component={PodcastGenerator} />
      <Route path="/gap-analyzer" component={GapAnalyzer} />
      <Route path="/systematic-review" component={SystematicReview} />
      <Route path="/cag-system" component={CAGSystem} />
      <Route path="/research-insights" component={ResearchInsights} />
      <Route component={NotFound} />
      
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="papermind-theme">
        <TooltipProvider>
          <AppShell>
            <Router />
          </AppShell>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
