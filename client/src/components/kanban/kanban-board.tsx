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
import type { Task, Column, TaskAssignee, User } from "@shared/schema";

interface KanbanBoardProps {
  boardId?: string;
  isReadOnly?: boolean;
  profileMode?: "read-only" | "full-access" | "admin";
  searchQuery?: string;
}

// Status is now the column ID directly - no more hardcoded mapping needed

export function KanbanBoard({ boardId, isReadOnly = false, profileMode = "full-access", searchQuery = "" }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
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

  // Fetch all assignees for all tasks to enable search
  const { data: allAssignees = {} } = useQuery<Record<string, (TaskAssignee & { user: User })[]>>({
    queryKey: ["/api/tasks/assignees/bulk", tasks.map(t => t.id)],
    enabled: tasks.length > 0,
    queryFn: async () => {
      const assigneesData: Record<string, (TaskAssignee & { user: User })[]> = {};
      
      // Fetch assignees for all tasks in parallel
      const promises = tasks.map(async (task) => {
        try {
          const response = await fetch(`/api/tasks/${task.id}/assignees`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            assigneesData[task.id] = data;
          } else {
            assigneesData[task.id] = [];
          }
        } catch (error) {
          assigneesData[task.id] = [];
        }
      });
      
      await Promise.all(promises);
      return assigneesData;
    },
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
      const columnsToReorder = reorderedColumns.map((column, index) => ({
        id: column.id,
        position: index
      }));
      
      const response = await apiRequest("POST", "/api/columns/reorder", {
        columns: columnsToReorder
      });
      return reorderedColumns;
    },
    onMutate: async (reorderedColumns) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: [columnsEndpoint] });

      // Snapshot the previous value
      const previousColumns = queryClient.getQueryData([columnsEndpoint]);

      // Optimistically update to the new value
      queryClient.setQueryData([columnsEndpoint], reorderedColumns);

      // Return a context object with the snapshotted value
      return { previousColumns };
    },
    onError: (err, newColumns, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData([columnsEndpoint], context?.previousColumns);
      
      toast({
        title: "Erro",
        description: "Falha ao reordenar colunas. Tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: async (reorderedTasks: { id: string; position: number }[]) => {
      console.log("🔄 [FRONTEND] Sending reorder request:", reorderedTasks);
      const response = await apiRequest("PATCH", "/api/tasks/reorder", {
        tasks: reorderedTasks
      });
      console.log("✅ [FRONTEND] Reorder response:", response);
      return response;
    },
    onMutate: async (reorderedTasks: { id: string; position: number }[]) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [tasksEndpoint] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData([tasksEndpoint]);

      // Optimistically update task positions
      queryClient.setQueryData([tasksEndpoint], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(task => {
          const reorderedTask = reorderedTasks.find(rt => rt.id === task.id);
          return reorderedTask ? { ...task, position: reorderedTask.position } : task;
        });
      });

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (err, newTasks, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData([tasksEndpoint], context?.previousTasks);
      
      toast({
        title: "Erro",
        description: "Falha ao reordenar tarefas. Tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
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

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destColumn) return;

    // Check if reordering within the same column
    if (source.droppableId === destination.droppableId) {
      // Reordering within the same column - use column ID directly
      
      const columnTasks = getTasksByColumn(source.droppableId);
      const reorderedTasks = Array.from(columnTasks);
      const [movedTask] = reorderedTasks.splice(source.index, 1);
      reorderedTasks.splice(destination.index, 0, movedTask);
      
      // Update positions
      const tasksWithNewPositions = reorderedTasks.map((t, index) => ({
        id: t.id,
        position: index,
      }));
      
      
      reorderTasksMutation.mutate(tasksWithNewPositions);
      return;
    }

    // Moving between different columns - check WIP limits
    if (destColumn?.wipLimit) {
      // Use column ID directly for WIP limits check
      const tasksInDestination = tasks.filter((t) => t.status === destColumn.id && t.id !== draggableId);
      if (tasksInDestination.length >= destColumn.wipLimit) {
        toast({
          title: "Limite WIP Excedido",
          description: `A coluna ${destColumn.title} já atingiu o limite de ${destColumn.wipLimit} tarefas.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Update task status - use destination column ID directly
    const newStatus = destColumn.id;
    
    // Get tasks in destination column to set proper position
    const destColumnTasks = getTasksByColumn(destination.droppableId);
    const newPosition = destination.index;
    
    // Update both status and position when moving between columns
    updateTaskMutation.mutate({
      taskId: draggableId,
      updates: { 
        status: newStatus,
        position: newPosition,
      },
    });
    
    // Also need to reorder remaining tasks in destination column
    const updatedDestTasks = [...destColumnTasks];
    updatedDestTasks.splice(destination.index, 0, task);
    
    const tasksToReorder = updatedDestTasks.map((t, index) => ({
      id: t.id,
      position: index,
    }));
    
    
    // Only reorder if there are other tasks to reorder
    if (tasksToReorder.length > 1) {
      setTimeout(() => reorderTasksMutation.mutate(tasksToReorder), 100);
    }
  };

  // Enhanced search function - title and assignee names (both legacy and new structure)
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase().trim();
    
    return tasks.filter((task) => {
      // Search in title
      if (task.title?.toLowerCase().includes(query)) return true;
      
      // Search in legacy assignee name field
      if (task.assigneeName?.toLowerCase().includes(query)) return true;
      
      // Search in new assignees structure
      const taskAssignees = allAssignees[task.id] || [];
      if (taskAssignees.some(assignee => 
        assignee.user.name?.toLowerCase().includes(query)
      )) return true;
      
      return false;
    });
  }, [tasks, searchQuery, allAssignees]);

  const getTasksByColumn = (columnId: string) => {
    // Direct mapping: task.status = column.id
    return filteredTasks
      .filter((task) => task.status === columnId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
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


  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-white" data-testid="kanban-board">
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
