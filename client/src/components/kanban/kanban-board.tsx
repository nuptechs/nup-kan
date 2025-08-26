import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { KanbanColumn } from "./kanban-column";
import { TaskDetailsDialog } from "./task-details-dialog";
import { AddTaskDialog } from "./add-task-dialog";
import { ColumnManagementDialog } from "./column-management-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import type { Task, Column } from "@shared/schema";

interface KanbanBoardProps {
  boardId?: string;
  isReadOnly?: boolean;
  profileMode?: "read-only" | "full-access" | "admin";
}

// Utility function to map column titles to task status values
const getStatusFromColumnTitle = (columnTitle: string): string | null => {
  const statusMap: Record<string, string> = {
    "Backlog": "backlog",
    "To Do": "todo", 
    "In Progress": "inprogress",
    "Review": "review",
    "Done": "done"
  };
  
  // If direct mapping exists, use it
  if (statusMap[columnTitle]) {
    return statusMap[columnTitle];
  }
  
  // Otherwise, convert column title to lowercase status format
  // This allows custom column names to work
  return columnTitle.toLowerCase().replace(/\s+/g, '');
};

export function KanbanBoard({ boardId, isReadOnly = false, profileMode = "full-access" }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canCreateTasks, canEditTasks, canManageColumns } = usePermissions();

  // Use board-specific endpoints if boardId is provided
  const tasksEndpoint = boardId ? `/api/boards/${boardId}/tasks` : "/api/tasks";
  const columnsEndpoint = boardId ? `/api/boards/${boardId}/columns` : "/api/columns";

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [tasksEndpoint],
  });

  const { data: columns = [], isLoading: columnsLoading } = useQuery<Column[]>({
    queryKey: [columnsEndpoint],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      // Invalidate board-specific queries
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/tasks`] });
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const response = await apiRequest("DELETE", `/api/columns/${columnId}`);
      // DELETE returns 204 No Content, so don't try to parse JSON
      if (response.ok) {
        return { success: true };
      }
      throw new Error(`Failed to delete column: ${response.status}`);
    },
    onSuccess: () => {
      // Just show success message - UI already updated optimistically
      toast({
        title: "Coluna excluída",
        description: "A coluna foi removida com sucesso.",
        duration: 2500,
      });
      
      // Refresh data in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      queryClient.invalidateQueries({ queryKey: [columnsEndpoint] });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
    },
    onError: (error: any, columnId) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: [columnsEndpoint] });
      
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        toast({
          title: "Coluna já foi excluída",
          description: "A coluna já não existe mais.",
          duration: 2500,
        });
      } else {
        toast({
          title: "Erro ao excluir coluna",
          description: "Não foi possível excluir a coluna. Tente novamente.",
          variant: "destructive",
          duration: 2500,
        });
      }
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: async (reorderedColumns: Column[]) => {
      const updatePromises = reorderedColumns.map((column, index) =>
        apiRequest("PATCH", `/api/columns/${column.id}`, { position: index })
      );
      await Promise.all(updatePromises);
      return reorderedColumns;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      // Invalidate board-specific queries
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao reordenar colunas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    // Block drag and drop in read-only mode
    if (isReadOnly) return;
    
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Handle column reordering
    if (type === 'COLUMN') {
      const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
      const reorderedColumns = Array.from(sortedColumns);
      const [reorderedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, reorderedColumn);
      
      // Update positions
      const columnsWithNewPositions = reorderedColumns.map((column, index) => ({
        ...column,
        position: index,
      }));
      
      reorderColumnsMutation.mutate(columnsWithNewPositions);
      return;
    }

    // Handle task movement
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    // Check WIP limits - only count if this is a different task or moving to different column
    const destColumn = columns.find((c) => c.id === destination.droppableId);
    if (destColumn?.wipLimit) {
      // Need to check actual status instead of column ID for WIP limits
      const expectedStatus = getStatusFromColumnTitle(destColumn.title);
      if (expectedStatus) {
        const tasksInDestination = tasks.filter((t) => t.status === expectedStatus && t.id !== draggableId);
        if (tasksInDestination.length >= destColumn.wipLimit) {
          toast({
            title: "Limite WIP Excedido",
            description: `A coluna ${destColumn.title} já atingiu o limite de ${destColumn.wipLimit} tarefas.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Update task status - convert column ID to correct status
    const destinationColumn = columns.find(col => col.id === destination.droppableId);
    if (!destinationColumn) return;
    
    const newStatus = getStatusFromColumnTitle(destinationColumn.title);
    if (!newStatus) return;
    
    updateTaskMutation.mutate({
      taskId: draggableId,
      updates: { status: newStatus },
    });
  };

  // Advanced search function
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase().trim();
    
    return tasks.filter((task) => {
      // Search in title
      if (task.title?.toLowerCase().includes(query)) return true;
      
      // Search in description
      if (task.description?.toLowerCase().includes(query)) return true;
      
      // Search in assignee name
      if (task.assigneeName?.toLowerCase().includes(query)) return true;
      
      // Search in priority
      if (task.priority?.toLowerCase().includes(query)) return true;
      
      // Search in status
      if (task.status?.toLowerCase().includes(query)) return true;
      
      // Search in tags
      if (task.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
      
      // Search by task ID (partial match)
      if (task.id?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [tasks, searchQuery]);

  const getTasksByColumn = (columnId: string) => {
    // Find the column to get its title
    const column = columns.find(col => col.id === columnId);
    if (!column) return [];
    
    const expectedStatus = getStatusFromColumnTitle(column.title);
    if (!expectedStatus) return [];
    
    // Use filtered tasks instead of all tasks
    return filteredTasks.filter((task) => task.status === expectedStatus);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsOpen(true);
  };

  const handleAddTask = () => {
    setIsAddTaskOpen(true);
  };

  const handleCloseTaskDetails = () => {
    setIsTaskDetailsOpen(false);
    setSelectedTask(null);
  };

  const handleManageColumns = () => {
    setIsColumnManagementOpen(true);
  };

  const handleEditColumn = (column: Column) => {
    setEditingColumn(column);
    setIsColumnManagementOpen(true);
  };

  const handleDeleteColumn = async (columnId: string) => {
    setColumnToDelete(columnId);
  };

  const confirmDeleteColumn = () => {
    if (columnToDelete && !deleteColumnMutation.isPending) {
      // Optimistically remove from UI immediately
      queryClient.setQueryData([columnsEndpoint], (oldColumns: Column[] | undefined) => {
        if (!oldColumns) return oldColumns;
        return oldColumns.filter(col => col.id !== columnToDelete);
      });
      
      deleteColumnMutation.mutate(columnToDelete);
      setColumnToDelete(null);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const handleSearchToggle = () => {
    if (isSearchOpen && searchQuery.trim()) {
      setSearchQuery("");
    }
    setIsSearchOpen(!isSearchOpen);
  };

  if (tasksLoading || columnsLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full p-6 space-x-6 min-w-max">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-80">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col animate-pulse">
                  <div className="p-4 border-b border-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-24 bg-gray-100 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const validColumns = columns
    .filter(column => column.id && column.id.trim() !== '')
    .sort((a, b) => a.position - b.position);

  // Get search results count
  const totalTasks = tasks.length;
  const filteredTasksCount = filteredTasks.length;
  const hasSearchResults = searchQuery.trim() && filteredTasksCount !== totalTasks;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white" data-testid="kanban-board">
      {/* Subtle Search Bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-2">
            {!isSearchOpen ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchToggle}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                data-testid="search-toggle-btn"
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar tarefas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-8 h-8 text-sm border-gray-200 focus:border-blue-300 focus:ring-blue-200 focus:ring-1"
                    data-testid="search-input"
                    autoFocus
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      data-testid="clear-search-btn"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchToggle}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                  data-testid="close-search-btn"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Search Results Info */}
          {hasSearchResults && (
            <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-md">
              {filteredTasksCount} de {totalTasks} tarefas encontradas
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex h-full p-4 space-x-4 min-w-max"
              >
                {validColumns.map((column, index) => (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(columnProvided, columnSnapshot) => (
                      <div
                        ref={columnProvided.innerRef}
                        {...columnProvided.draggableProps}
                        className={`flex-shrink-0 w-72 sm:w-80 md:w-72 lg:w-80 transition-all duration-200 ${
                          columnSnapshot.isDragging ? 'rotate-1 scale-105 shadow-xl' : ''
                        }`}
                      >
                        <div {...columnProvided.dragHandleProps}>
                          <Droppable droppableId={column.id} type="TASK">
                            {(taskProvided, taskSnapshot) => (
                              <div
                                ref={taskProvided.innerRef}
                                {...taskProvided.droppableProps}
                                className="h-full"
                              >
                                <KanbanColumn
                                  column={column}
                                  tasks={getTasksByColumn(column.id)}
                                  isDragOver={taskSnapshot.isDraggingOver}
                                  onTaskClick={handleTaskClick}
                                  onAddTask={handleAddTask}
                                  onManageColumns={handleManageColumns}
                                  onEditColumn={handleEditColumn}
                                  onDeleteColumn={handleDeleteColumn}
                                  isReadOnly={isReadOnly}
                                  profileMode={profileMode}
                                />
                                {taskProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                
                {/* Add Column Button - só para quem não é read-only */}
                {!isReadOnly && (
                  <div className="flex-shrink-0 w-72 sm:w-80 md:w-72 lg:w-80">
                    <button
                      onClick={handleManageColumns}
                      className="w-full h-12 border border-dashed border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-200 flex items-center justify-center group bg-white/50 backdrop-blur-sm"
                      data-testid="button-add-column"
                    >
                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 mr-2" />
                      <span className="text-sm text-gray-500 group-hover:text-indigo-600">
                        Adicionar Coluna
                      </span>
                    </button>
                  </div>
                )}
                
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        task={selectedTask}
        isOpen={isTaskDetailsOpen}
        onClose={handleCloseTaskDetails}
        boardId={boardId}
        isReadOnly={isReadOnly}
      />

      {/* Add Task Dialog - só para quem não é read-only */}
      {!isReadOnly && (
        <AddTaskDialog
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          boardId={boardId}
        />
      )}
      
      {/* Column Management Dialog - só para quem não é read-only */}
      {boardId && !isReadOnly && (
        <ColumnManagementDialog
          isOpen={isColumnManagementOpen}
          onClose={() => {
            setIsColumnManagementOpen(false);
            setEditingColumn(null);
          }}
          boardId={boardId}
          editingColumn={editingColumn}
        />
      )}

      {/* Delete Column Confirmation Dialog */}
      <AlertDialog open={!!columnToDelete} onOpenChange={() => setColumnToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-column-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A coluna e todas as suas tarefas serão permanentemente excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-column">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteColumn}
              disabled={deleteColumnMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-column"
            >
              {deleteColumnMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
