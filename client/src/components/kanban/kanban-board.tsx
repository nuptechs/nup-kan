import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanColumn } from "./kanban-column";
import { TaskDetailsDialog } from "./task-details-dialog";
import { AddTaskDialog } from "./add-task-dialog";
import { ColumnManagementDialog } from "./column-management-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, X, Columns } from "lucide-react";
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

export function KanbanBoard({ boardId, isReadOnly = false, profileMode = "full-access", searchQuery = "" }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedColumnForNewTask, setSelectedColumnForNewTask] = useState<string | null>(null);
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  
  // Native drag and drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null);
  
  // Column drag and drop state
  const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);
  
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
          console.error(`Failed to fetch assignees for task ${task.id}:`, error);
          assigneesData[task.id] = [];
        }
      });
      
      await Promise.all(promises);
      return assigneesData;
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      console.log("🔄 [FRONTEND] Updating task:", taskId, updates);
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      console.log("✅ [FRONTEND] Task updated successfully");
      queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
    },
    onError: (error) => {
      console.error("❌ [FRONTEND] Task update failed:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: async (taskUpdates: { id: string; position: number }[]) => {
      console.log("🔄 [FRONTEND] Reordering tasks:", taskUpdates);
      return await apiRequest("PATCH", "/api/tasks/reorder", { tasks: taskUpdates });
    },
    onSuccess: () => {
      console.log("✅ [FRONTEND] Tasks reordered successfully");
      queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
    },
    onError: (error) => {
      console.error("❌ [FRONTEND] Task reorder failed:", error);
      toast({
        title: "Erro",
        description: "Falha ao reordenar tarefas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateColumnPositionsMutation = useMutation({
    mutationFn: async (columnUpdates: { id: string; position: number }[]) => {
      console.log("🔄 [FRONTEND] Updating column positions:", columnUpdates);
      return await apiRequest("POST", "/api/columns/reorder", { columns: columnUpdates });
    },
    onSuccess: () => {
      console.log("✅ [FRONTEND] Column positions updated successfully");
      queryClient.invalidateQueries({ queryKey: [columnsEndpoint] });
    },
    onError: (error) => {
      console.error("❌ [FRONTEND] Column reorder failed:", error);
      toast({
        title: "Erro",
        description: "Falha ao reordenar colunas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      return await apiRequest("DELETE", `/api/columns/${columnId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir coluna. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Native drag and drop handlers
  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    console.log("🔄 [DRAG] Starting drag for task:", task.id);
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleTaskDragEnd = () => {
    console.log("🔄 [DRAG] Ending drag");
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverTaskIndex(null);
  };

  // Column drag and drop handlers
  const handleColumnDragStart = (e: React.DragEvent, column: Column) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    
    console.log("🔄 [COLUMN-DRAG] Starting drag for column:", column.title);
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragEnd = () => {
    console.log("🔄 [COLUMN-DRAG] Ending column drag");
    setDraggedColumn(null);
    setDragOverColumnIndex(null);
  };

  const handleColumnReorderDragOver = (e: React.DragEvent, columnIndex: number) => {
    if (!draggedColumn || isReadOnly) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumnIndex(columnIndex);
  };

  const handleColumnDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedColumn || isReadOnly) return;
    
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const sourceIndex = sortedColumns.findIndex(col => col.id === draggedColumn.id);
    
    if (sourceIndex === targetIndex) {
      handleColumnDragEnd();
      return;
    }
    
    console.log("🔄 [COLUMN-DRAG] Dropping column from", sourceIndex, "to", targetIndex);
    
    // Create new column order
    const newColumns = [...sortedColumns];
    const [removed] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(targetIndex, 0, removed);
    
    // Update positions
    const columnUpdates = newColumns.map((col, index) => ({
      id: col.id,
      position: index
    }));
    
    // Optimistically update UI
    queryClient.setQueryData([columnsEndpoint], (oldColumns: Column[] | undefined) => {
      if (!oldColumns) return oldColumns;
      return oldColumns.map(col => {
        const update = columnUpdates.find(u => u.id === col.id);
        return update ? { ...col, position: update.position } : col;
      });
    });
    
    updateColumnPositionsMutation.mutate(columnUpdates);
    handleColumnDragEnd();
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleTaskDrop = (e: React.DragEvent, targetColumnId: string, targetTaskIndex?: number) => {
    e.preventDefault();
    
    if (!draggedTask || isReadOnly) return;
    
    console.log("🔄 [DRAG] Dropping task", draggedTask.id, "into column", targetColumnId, "at index", targetTaskIndex);
    
    const sourceColumnId = draggedTask.status;
    const targetColumn = columns.find(col => col.id === targetColumnId);
    
    if (!targetColumn) return;
    
    // Check WIP limits for different columns
    if (sourceColumnId !== targetColumnId && targetColumn.wipLimit) {
      const tasksInTarget = tasks.filter(t => t.status === targetColumnId && t.id !== draggedTask.id);
      if (tasksInTarget.length >= targetColumn.wipLimit) {
        toast({
          title: "Limite WIP Excedido",
          description: `A coluna ${targetColumn.title} já atingiu o limite de ${targetColumn.wipLimit} tarefas.`,
          variant: "destructive",
        });
        handleTaskDragEnd();
        return;
      }
    }
    
    // If moving to same column, handle reordering
    if (sourceColumnId === targetColumnId && targetTaskIndex !== undefined) {
      const columnTasks = getTasksByColumn(targetColumnId);
      const sourceIndex = columnTasks.findIndex(t => t.id === draggedTask.id);
      
      if (sourceIndex === targetTaskIndex) {
        handleTaskDragEnd();
        return;
      }
      
      console.log("🔄 [REORDER] Reordering task from", sourceIndex, "to", targetTaskIndex);
      
      // Create new task order within the column
      const newTasks = [...columnTasks];
      const [removed] = newTasks.splice(sourceIndex, 1);
      newTasks.splice(targetTaskIndex, 0, removed);
      
      // Update positions
      const taskUpdates = newTasks.map((task, index) => ({
        id: task.id,
        position: index
      }));
      
      // Optimistically update UI
      queryClient.setQueryData([tasksEndpoint], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(task => {
          const update = taskUpdates.find(u => u.id === task.id);
          return update ? { ...task, position: update.position } : task;
        });
      });
      
      reorderTasksMutation.mutate(taskUpdates);
      handleTaskDragEnd();
      return;
    }
    
    // Moving to different column
    if (sourceColumnId !== targetColumnId) {
      updateTaskMutation.mutate({
        taskId: draggedTask.id,
        updates: { 
          status: targetColumnId,
          position: targetTaskIndex ?? 0,
        },
      });
    }
    
    handleTaskDragEnd();
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

  const handleAddTask = (columnId?: string) => {
    setSelectedColumnForNewTask(columnId || null);
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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando board...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full">

        {/* Kanban Board */}
        <div className="overflow-x-auto flex-1">
          {columns.length === 0 ? (
            /* Empty Board State */
            <div className="flex items-center justify-center min-h-96 p-8">
              <div className="text-center space-y-6 max-w-md">
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                    <Columns className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Board sem colunas
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Este board ainda não possui colunas. Crie suas primeiras colunas para começar a organizar suas tarefas.
                  </p>
                </div>
                
                {!isReadOnly && (
                  <PermissionGuard permissions={["Criar Colunas"]}>
                    <Button
                      onClick={handleManageColumns}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-create-first-columns"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiras Colunas
                    </Button>
                  </PermissionGuard>
                )}
              </div>
            </div>
          ) : (
            /* Normal Board with Columns */
            <div className="flex gap-6 min-w-max p-4">
              {columns
                .sort((a, b) => a.position - b.position)
                .map((column, index) => {
                  const columnTasks = getTasksByColumn(column.id);
                  const isWipLimitExceeded = column.wipLimit && columnTasks.length > column.wipLimit;
                  const isDragOver = dragOverColumn === column.id;
                  const isColumnDragOver = dragOverColumnIndex === index;
                  const isDraggingColumn = draggedColumn?.id === column.id;

                  return (
                    <div
                      key={column.id}
                      className={`min-w-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-2 transition-all duration-200 ${
                        isDragOver 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : isColumnDragOver 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-transparent'
                      } ${isDraggingColumn ? 'opacity-50 scale-95' : ''}`}
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleColumnDragStart(e, column)}
                      onDragEnd={handleColumnDragEnd}
                      onDragOver={(e) => {
                        // Handle task drops
                        handleColumnDragOver(e, column.id);
                        // Handle column reordering
                        handleColumnReorderDragOver(e, index);
                      }}
                      onDragLeave={handleColumnDragLeave}
                      onDrop={(e) => {
                        // Check if it's a column being dropped
                        if (draggedColumn) {
                          handleColumnDrop(e, index);
                        } else {
                          // Handle task drop
                          handleTaskDrop(e, column.id);
                        }
                      }}
                      data-testid={`column-${column.id}`}
                    >
                      <KanbanColumn
                        column={column}
                        tasks={columnTasks}
                        onTaskClick={handleTaskClick}
                        onEditColumn={handleEditColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onAddTask={handleAddTask}
                        isReadOnly={isReadOnly}
                        onTaskDragStart={handleTaskDragStart}
                        onTaskDragEnd={handleTaskDragEnd}
                        onTaskDrop={handleTaskDrop}
                        allAssignees={allAssignees}
                      />
                    </div>
                  );
                })}
              
              {/* Botão + para adicionar nova coluna */}
              {!isReadOnly && (
                <PermissionGuard permissions={["Criar Colunas"]}>
                  <div className="min-w-80 flex items-center justify-center">
                    <button
                      onClick={handleManageColumns}
                      className="flex flex-col items-center justify-center h-20 w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 group"
                      data-testid="button-add-column"
                    >
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-500 mb-1" />
                      <span className="text-sm text-gray-500 group-hover:text-blue-600 font-medium">
                        Nova Coluna
                      </span>
                    </button>
                  </div>
                </PermissionGuard>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <TaskDetailsDialog
        task={selectedTask}
        isOpen={isTaskDetailsOpen}
        onClose={handleCloseTaskDetails}
        boardId={boardId}
      />

      <AddTaskDialog
        isOpen={isAddTaskOpen}
        onClose={() => {
          setIsAddTaskOpen(false);
          setSelectedColumnForNewTask(null);
        }}
        boardId={boardId}
        defaultColumnId={selectedColumnForNewTask}
      />

      <ColumnManagementDialog
        isOpen={isColumnManagementOpen}
        onClose={() => {
          setIsColumnManagementOpen(false);
          setEditingColumn(null);
        }}
        editingColumn={editingColumn}
        boardId={boardId || ""}
      />

      <AlertDialog open={!!columnToDelete} onOpenChange={() => setColumnToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Coluna</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta coluna? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteColumn}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}