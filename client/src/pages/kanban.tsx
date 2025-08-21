import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SettingsPanel } from "@/components/kanban/settings-panel";
import { AddTaskDialog } from "@/components/kanban/add-task-dialog";
import { useQuery } from "@tanstack/react-query";
import { Settings, Plus, Users, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KanbanPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
  });

  return (
    <div className="h-screen overflow-hidden bg-bg-main" data-testid="kanban-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between" data-testid="header">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">Kanban Flow</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span data-testid="team-count">{teamMembers?.length || 0} membros</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Metrics Display */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Tempo Médio:</span>
              <span className="font-medium text-gray-900" data-testid="average-cycle-time">
                {analytics?.averageCycleTime || 0} dias
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Throughput:</span>
              <span className="font-medium text-gray-900" data-testid="throughput">
                {analytics?.throughput || 0}/semana
              </span>
            </div>
          </div>
          
          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Kanban Board */}
      <main className="flex-1 overflow-hidden" data-testid="main-content">
        <KanbanBoard />
      </main>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Add Task Dialog */}
      <AddTaskDialog
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40" data-testid="fab-container">
        <Button
          onClick={() => setIsAddTaskOpen(true)}
          className="bg-indigo-500 text-white rounded-full p-4 shadow-lg hover:bg-indigo-600 hover:shadow-xl transition-all duration-200 group"
          data-testid="button-add-task"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  );
}
