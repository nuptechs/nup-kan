import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BoardSelection from "@/pages/BoardSelection";
import KanbanPage from "@/pages/kanban";
import UserSettingsPage from "@/pages/user-settings";
import PermissionsHub from "@/pages/PermissionsHub";
import TaskStatusPage from "@/pages/task-status";
import TaskPriorityPage from "@/pages/task-priority";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={BoardSelection} />
      <Route path="/kanban/:boardId" component={KanbanPage} />
      <Route path="/settings" component={UserSettingsPage} />
      <Route path="/admin/permissions" component={PermissionsHub} />
      <Route path="/admin/task-status" component={TaskStatusPage} />
      <Route path="/admin/task-priority" component={TaskPriorityPage} />
      <Route component={NotFound} />
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
