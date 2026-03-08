import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import ScrollToTop from "@/components/ScrollToTop";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const FlashcardStudy = lazy(() => import("./pages/FlashcardStudy"));
const Mcqs = lazy(() => import("./pages/Mcqs"));
const McqStudy = lazy(() => import("./pages/McqStudy"));
const Exams = lazy(() => import("./pages/Exams"));
const ExamStart = lazy(() => import("./pages/ExamStart"));
const Essays = lazy(() => import("./pages/Essays"));
const EssayStudy = lazy(() => import("./pages/EssayStudy"));
const Stories = lazy(() => import("./pages/Stories"));
const StoryRead = lazy(() => import("./pages/StoryRead"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const YearHub = lazy(() => import("./pages/YearHub"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Navbar />
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/year/:yearNumber" element={<YearHub />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/flashcards/:id" element={<FlashcardStudy />} />
                <Route path="/mcqs" element={<Mcqs />} />
                <Route path="/mcqs/:id" element={<McqStudy />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/exams/:id/start" element={<ExamStart />} />
                <Route path="/essays" element={<Essays />} />
                <Route path="/essays/:id" element={<EssayStudy />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/stories/:id" element={<StoryRead />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SiteFooter />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

