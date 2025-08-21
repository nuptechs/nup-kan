import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { KanbanColumn } from "./kanban-column";
import { TaskDetailsDialog } from "./task-details-dialog";
import { AddTaskDialog } from "./add-task-dialog";
import { ColumnManagementDialog } from "./column-management-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import type { Task, Column } from "@shared/schema";

export function KanbanBoard() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canCreateTasks, canEditTasks, canManageColumns } = usePermissions();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: columns = [], isLoading: columnsLoading } = useQuery<Column[]>({
    queryKey: ["/api/columns"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao mover tarefa. Tente novamente.",
        variant: "destructive",
      });
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
      const sortedColumns = [...validColumns].sort((a, b) => a.position - b.position);
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

    // Check WIP limits
    const destinationColumn = columns.find((c) => c.id === destination.droppableId);
    if (destinationColumn?.wipLimit) {
      const tasksInDestination = tasks.filter((t) => t.status === destination.droppableId);
      if (tasksInDestination.length >= destinationColumn.wipLimit) {
        toast({
          title: "Limite WIP Excedido",
          description: `A coluna ${destinationColumn.title} já atingiu o limite de ${destinationColumn.wipLimit} tarefas.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Update task status
    updateTaskMutation.mutate({
      taskId: draggableId,
      updates: { status: destination.droppableId },
    });
  };

  const getTasksByColumn = (columnId: string) => {
    return tasks.filter((task) => task.status === columnId);
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
    <div className="flex h-full" data-testid="kanban-board">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex h-full p-6 space-x-6 min-w-max"
              >
                {validColumns.map((column, index) => (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(columnProvided, columnSnapshot) => (
                      <div
                        ref={columnProvided.innerRef}
                        {...columnProvided.draggableProps}
                        className={`flex-shrink-0 w-80 transition-transform duration-200 ${
                          columnSnapshot.isDragging ? 'rotate-2 scale-105' : ''
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
      />

      {/* Add Task Dialog */}
      <AddTaskDialog
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />
      
      <ColumnManagementDialog
        isOpen={isColumnManagementOpen}
        onClose={() => setIsColumnManagementOpen(false)}
      />
    </div>
  );
}
