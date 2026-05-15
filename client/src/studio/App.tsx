import { Switch, Route, Redirect, Router as WouterRouter, useSearch } from "wouter";
import { memoryHook, memorySearchHook } from "@studio/lib/memory-router";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@studio/components/ui/toaster";
import { TooltipProvider } from "@studio/components/ui/tooltip";
import { useAuth } from "@studio/hooks/use-auth";
import { useStudios } from "@studio/hooks/use-studios";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@studio/components/ui/error-boundary";

const NotFound = lazy(() => import("@studio/pages/not-found"));
const Login = lazy(() => import("@studio/pages/login"));
const StudioSelect = lazy(() => import("@studio/pages/studio-select"));
const Dashboard = lazy(() => import("@studio/pages/dashboard"));
const Productions = lazy(() => import("@studio/pages/productions"));
const Sessions = lazy(() => import("@studio/pages/sessions"));
const RecordingRoom = lazy(() => import("@studio/pages/room").then(module => ({ default: module.default })));
const Staff = lazy(() => import("@studio/pages/staff"));
const Admin = lazy(() => import("@studio/pages/admin"));
const Notifications = lazy(() => import("@studio/pages/notifications"));
const Members = lazy(() => import("@studio/pages/members"));
const StudioAdmin = lazy(() => import("@studio/pages/studio-admin"));
const Takes = lazy(() => import("@studio/pages/takes"));
const Profile = lazy(() => import("@studio/pages/profile"));
const Daw = lazy(() => import("@studio/pages/daw"));

import { StudioLayout } from "@studio/components/layout/studio-layout";

function ProtectedRoute({ component: Component, requireStudio = false, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/hub-dub/login" replace />;
  }

  if (requireStudio) {
    const studioId = rest.params?.studioId as string;
    return (
      <StudioLayout studioId={studioId}>
        <ErrorBoundary>
          <Component studioId={studioId} {...rest} />
        </ErrorBoundary>
      </StudioLayout>
    );
  }

  return (
    <ErrorBoundary>
      <Component {...rest} />
    </ErrorBoundary>
  );
}

function StudioSelectRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/hub-dub/login" replace />;
  }

  return <StudioSelect />;
}

function HomeRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/hub-dub/studios" replace />;
  }

  return <Login />;
}

function DawRoute() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: studios, isLoading: isStudiosLoading } = useStudios();
  const search = useSearch();

  if (isAuthLoading || isStudiosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/hub-dub/login" replace />;
  }

  const searchParams = new URLSearchParams(search || "");
  const studioIdFromQuery = searchParams.get("studioId");
  const availableStudios = studios || [];
  const resolvedStudioId = availableStudios.find((studio) => studio.id === studioIdFromQuery)?.id || availableStudios[0]?.id;

  if (!resolvedStudioId) {
    return <Redirect to="/hub-dub/studios" replace />;
  }

  return (
    <StudioLayout studioId={resolvedStudioId}>
      <ErrorBoundary>
        <Daw studioId={resolvedStudioId} />
      </ErrorBoundary>
    </StudioLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <Switch>
        <Route path="/hub-dub" component={HomeRoute} />
        <Route path="/hub-dub/login" component={Login} />
        <Route path="/hub-dub/studios" component={StudioSelectRoute} />

        <Route path="/hub-dub/admin">
          {() => <ProtectedRoute component={Admin} />}
        </Route>

        <Route path="/hub-dub/profile">
          {() => <ProtectedRoute component={Profile} />}
        </Route>
        <Route path="/hub-dub/daw">
          {() => <DawRoute />}
        </Route>

        <Route path="/hub-dub/studio/:studioId/dashboard">
          {params => <ProtectedRoute component={Dashboard} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/productions">
          {params => <ProtectedRoute component={Productions} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/sessions">
          {params => <ProtectedRoute component={Sessions} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/staff">
          {params => <ProtectedRoute component={Staff} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/members">
          {params => <ProtectedRoute component={Members} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/notifications">
          {params => <ProtectedRoute component={Notifications} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/takes">
          {params => <ProtectedRoute component={Takes} requireStudio params={params} />}
        </Route>
        <Route path="/hub-dub/studio/:studioId/admin">
          {params => <ProtectedRoute component={StudioAdmin} requireStudio params={params} />}
        </Route>

        <Route path="/hub-dub/studio/:studioId/sessions/:sessionId/room">
          {params => <ProtectedRoute component={RecordingRoom} params={params} />}
        </Route>

        <Route path="/hub-dub/:rest*">
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <WouterRouter hook={memoryHook} searchHook={memorySearchHook}>
            <Toaster />
            <Router />
          </WouterRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
