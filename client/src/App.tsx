import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/protected-route";
import LoginPage from "@/pages/login";
import BoardSelection from "@/pages/BoardSelection";
import KanbanPage from "@/pages/kanban";
import UserSettingsPage from "@/pages/user-settings";
import PermissionsHub from "@/pages/PermissionsHub";
import TaskStatusPage from "@/pages/task-status";
import TaskPriorityPage from "@/pages/task-priority";
import CustomFieldsPage from "@/pages/custom-fields";
import NotFound from "@/pages/not-found";

// Lazy loading para página de demonstração de segurança
import { lazy } from "react";
const SecurityDemoPage = lazy(() => import("@/pages/security-demo"));

function Router() {
  return (
    <Switch>
      {/* Public route - Login */}
      <Route path="/login">
        <ProtectedRoute requireAuth={false}>
          <LoginPage />
        </ProtectedRoute>
      </Route>

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <BoardSelection />
        </ProtectedRoute>
      </Route>
      
      <Route path="/boards">
        <ProtectedRoute>
          <BoardSelection />
        </ProtectedRoute>
      </Route>
      
      <Route path="/kanban/:boardId">
        <ProtectedRoute>
          <KanbanPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <UserSettingsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/permissions">
        <ProtectedRoute>
          <PermissionsHub />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/task-status">
        <ProtectedRoute>
          <TaskStatusPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/task-priority">
        <ProtectedRoute>
          <TaskPriorityPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/custom-fields">
        <ProtectedRoute>
          <CustomFieldsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/security-demo">
        <ProtectedRoute>
          <SecurityDemoPage />
        </ProtectedRoute>
      </Route>

      {/* 404 route */}
      <Route>
        <ProtectedRoute>
          <NotFound />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
