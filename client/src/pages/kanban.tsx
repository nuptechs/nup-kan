import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SettingsPanel } from "@/components/kanban/settings-panel";
import { UserProfileIndicator } from "@/components/user-profile-indicator";
import { useQuery } from "@tanstack/react-query";
import { Settings, Plus, Users, Clock, TrendingUp, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import logoImage from "@assets/Slogan N_1755824338969.png";

export default function KanbanPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { canManageProfiles } = usePermissions();

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
  });

  return (
    <div className="h-screen overflow-hidden bg-bg-main relative" data-testid="kanban-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between" data-testid="header">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img 
              src={logoImage} 
              alt="Logo uP"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">uP - Kan</h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span data-testid="team-count">{(teamMembers as any)?.length || 0} membros</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          
          {/* Admin Permissions Button */}
          {canManageProfiles && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/admin/permissions"}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              data-testid="button-admin-permissions"
              title="Gerenciar Permissões"
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}

          {/* User Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/settings"}
            className="p-2 text-gray-400 hover:text-gray-600"
            data-testid="button-user-settings"
            title="Configurações do Usuário"
          >
            <User className="w-4 h-4" />
          </Button>

          
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
      <main className="flex-1 overflow-hidden h-full" data-testid="main-content">
        <KanbanBoard />
      </main>

      {/* User Profile Indicator - Fixed Bottom Left */}
      <div className="fixed bottom-4 left-4 z-10">
        <UserProfileIndicator />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
