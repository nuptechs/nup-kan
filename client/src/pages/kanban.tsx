import React, { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SettingsPanel } from "@/components/kanban/settings-panel";
import { BoardSharingDialog } from "@/components/kanban/board-sharing-dialog";
import { UserProfileIndicator } from "@/components/user-profile-indicator";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Shield, User, ArrowLeft, Share2, Search, X, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { Link, useParams } from "wouter";
import { useProfileMode } from "@/hooks/useProfileMode";
import type { Board } from "@shared/schema";

export default function KanbanPage() {
  const params = useParams();
  const boardId = params.boardId;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { canManageProfiles } = usePermissions();
  const { mode, isReadOnly, canCreate, canEdit } = useProfileMode();

  // Load board data
  const { data: board, isLoading: isLoadingBoard } = useQuery<Board>({
    queryKey: ["/api/boards", boardId],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
    staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar stale
    refetchInterval: 5 * 60 * 1000, // Refresh apenas a cada 5 minutos
    refetchOnWindowFocus: false, // Evitar requests desnecessários
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

  // Check if board is inactive
  const isBoardInactive = board.isActive === "false";

  // Show inactive board warning
  if (isBoardInactive) {
    return (
      <div className="h-screen overflow-hidden bg-bg-main relative" data-testid="kanban-page">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
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
              <div className="w-2 h-8 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full flex-shrink-0"></div>
              <h1 className="text-2xl font-semibold text-gray-600" data-testid="page-title" title={board.name}>
                {board.name}
              </h1>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Inativo
              </Badge>
            </div>
          </div>
        </header>

        {/* Inactive Board Message */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <PowerOff className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Board Inativo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Este board está temporariamente inativo e não pode ser modificado. 
              Entre em contato com o administrador para reativar o board.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                <strong>Nome:</strong> {board.name}
              </p>
              {board.description && (
                <p className="text-sm text-gray-500">
                  <strong>Descrição:</strong> {board.description}
                </p>
              )}
            </div>
            <div className="mt-8">
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar aos Boards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-bg-main relative" data-testid="kanban-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full flex-shrink-0"></div>
            <h1 className="text-2xl font-semibold text-gray-900 truncate" data-testid="page-title" title={board.name}>
              {board.name}
            </h1>
            
            {/* Search Input */}
            <div className="relative w-48 ml-4">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                id="kanban-search"
                name="kanban-search"
                type="text"
                placeholder="tarefa ou responsável..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-8 text-sm border-gray-200 focus:border-blue-300 focus:ring-blue-200 focus:ring-1 placeholder:text-xs"
                data-testid="header-search-input"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  data-testid="clear-header-search-btn"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500 whitespace-nowrap">
              <Users className="w-4 h-4" />
              <span data-testid="team-count">{boardMemberCount?.count || 0} membros</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Share Board Button - só para quem pode compartilhar */}
            {!isReadOnly && (
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
            )}

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


            {/* Settings Button - só para quem pode configurar */}
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Kanban Board */}
      <main className="flex-1 overflow-hidden" data-testid="main-content">
        <KanbanBoard boardId={boardId} isReadOnly={isReadOnly} profileMode={mode} searchQuery={searchQuery} />
      </main>

      {/* User Profile Indicator - Fixed Bottom Left */}
      <div className="fixed bottom-4 left-4 z-10">
        <UserProfileIndicator />
      </div>

      {/* Settings Panel - só para quem não é read-only */}
      {!isReadOnly && (
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          boardId={boardId}
        />
      )}

      {/* Board Sharing Dialog - só para quem não é read-only */}
      {board && !isReadOnly && (
        <BoardSharingDialog
          board={board}
          open={isSharingOpen}
          onOpenChange={setIsSharingOpen}
        />
      )}

    </div>
  );
}
