import React, { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SettingsPanel } from "@/components/kanban/settings-panel";
import { BoardSharingDialog } from "@/components/kanban/board-sharing-dialog";
import { UserProfileIndicator } from "@/components/user-profile-indicator";
import { useQuery } from "@tanstack/react-query";
import { Settings, Users, Shield, User, ArrowLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { Link } from "wouter";
import logoImage from "@assets/generated_images/Modern_N_logo_transparent_background_dde0f619.png";
import type { Board } from "@shared/schema";

interface KanbanPageProps {
  params: { boardId: string };
}

export default function KanbanPage({ params }: KanbanPageProps) {
  const { boardId } = params;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const { canManageProfiles } = usePermissions();

  // Load board data
  const { data: board, isLoading: isLoadingBoard } = useQuery<Board>({
    queryKey: ["/api/boards", boardId],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: boardMemberCount } = useQuery<{ count: number }>({
    queryKey: [`/api/boards/${boardId}/member-count`],
    enabled: !!boardId,
  });


  // Show loading state while board data is loading
  if (isLoadingBoard) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando board...</p>
        </div>
      </div>
    );
  }

  // Show error if board not found
  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Board não encontrado</h2>
          <p className="text-gray-600 mb-4">O board solicitado não existe ou foi removido.</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Boards
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-bg-main relative" data-testid="kanban-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between" data-testid="header">
        <div className="flex items-center space-x-4 flex-1">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              data-testid="button-back-to-boards"
              title="Voltar aos Boards"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <img 
              src={logoImage} 
              alt="Logo uP"
              className="w-8 h-8 object-contain flex-shrink-0"
            />
            <h1 className="text-2xl font-semibold text-gray-900 truncate" data-testid="page-title" title={board.name}>
              {board.name}
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 flex-shrink-0 whitespace-nowrap">
            <Users className="w-4 h-4" />
            <span data-testid="team-count">{boardMemberCount?.count || 0} membros</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          
          {/* Share Board Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSharingOpen(true)}
            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
            data-testid="button-share-board"
            title="Compartilhar Board"
          >
            <Share2 className="w-4 h-4" />
          </Button>

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
        <KanbanBoard boardId={boardId} />
      </main>

      {/* User Profile Indicator - Fixed Bottom Left */}
      <div className="fixed bottom-4 left-4 z-10">
        <UserProfileIndicator />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        boardId={boardId}
      />

      {/* Board Sharing Dialog */}
      {board && (
        <BoardSharingDialog
          board={board}
          open={isSharingOpen}
          onOpenChange={setIsSharingOpen}
        />
      )}

    </div>
  );
}
