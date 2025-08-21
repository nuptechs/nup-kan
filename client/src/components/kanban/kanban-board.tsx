import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { KanbanColumn } from "./kanban-column";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Column } from "@shared/schema";

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

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

  return (
    <div className="flex h-full" data-testid="kanban-board">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full p-6 space-x-6 min-w-max">
            {columns.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-shrink-0 w-80"
                  >
                    <KanbanColumn
                      column={column}
                      tasks={getTasksByColumn(column.id)}
                      isDragOver={snapshot.isDraggingOver}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
