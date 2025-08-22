import { Draggable } from "react-beautiful-dnd";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Column } from "@shared/schema";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  isDragOver: boolean;
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onManageColumns?: () => void;
}

const getColumnColorClasses = (color: string) => {
  const colorMap = {
    gray: "bg-gray-400",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
  };
  return colorMap[color as keyof typeof colorMap] || "bg-gray-400";
};

const getColumnProgressClasses = (color: string) => {
  const colorMap = {
    gray: "bg-gray-400",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
  };
  return colorMap[color as keyof typeof colorMap] || "bg-gray-400";
};

const getColumnCountClasses = (color: string) => {
  const colorMap = {
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
  };
  return colorMap[color as keyof typeof colorMap] || "bg-gray-100 text-gray-600";
};

export function KanbanColumn({ column, tasks, isDragOver, onTaskClick, onAddTask, onManageColumns }: KanbanColumnProps) {
  const wipProgress = column.wipLimit ? (tasks.length / column.wipLimit) * 100 : 0;
  const isWipExceeded = column.wipLimit && tasks.length >= column.wipLimit;

  return (
    <div className="relative">
      {/* Manage Columns Button - Outside column as a handle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onManageColumns}
        className="absolute -top-2 -right-2 w-6 h-6 p-0 z-10 opacity-20 hover:opacity-80 transition-opacity duration-200 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md"
        data-testid={`button-manage-columns-${column.id}`}
      >
        <Plus className="w-3 h-3" />
      </Button>

      <div
        className={cn(
          "bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col transition-all duration-200 cursor-grab active:cursor-grabbing",
          isDragOver && "drag-over"
        )}
        data-testid={`column-${column.id}`}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 flex items-center" data-testid={`column-title-${column.id}`}>
            <span className={cn("w-3 h-3 rounded-full mr-3", getColumnColorClasses(column.color))}></span>
            {column.title}
          </h2>
          <div className="flex items-center space-x-2">
            <span
              className={cn("text-xs px-2 py-1 rounded-full font-medium", getColumnCountClasses(column.color))}
              data-testid={`task-count-${column.id}`}
            >
              {tasks.length}
            </span>
            {column.wipLimit && (
              <span className="text-xs text-gray-400">/{column.wipLimit}</span>
            )}
          </div>
        </div>
        
        {column.wipLimit && (
          <div className="w-full bg-gray-200 rounded-full h-1 mx-4" data-testid={`wip-progress-${column.id}`}>
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-200",
                getColumnProgressClasses(column.color),
                isWipExceeded && "bg-red-500"
              )}
              style={{ width: `${Math.min(wipProgress, 100)}%` }}
            />
          </div>
        )}
        
        {column.id === "backlog" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTask}
            className="w-full mt-2 text-left text-sm text-gray-500 hover:text-gray-700 transition-colors justify-start"
            data-testid={`button-add-task-${column.id}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar tarefa
          </Button>
        )}
        
        {column.id === "done" && tasks.length > 0 && (
          <p className="text-xs text-green-600 mt-2" data-testid="done-celebration">
            🎉 {tasks.length} tarefa{tasks.length > 1 ? 's' : ''} concluída{tasks.length > 1 ? 's' : ''} esta semana
          </p>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto column-scroll p-4 space-y-3" data-testid={`tasks-container-${column.id}`}>
        {tasks.map((task, index) => (
          <Draggable key={task.id} draggableId={task.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={cn(snapshot.isDragging && "dragging")}
                data-testid={`task-${task.id}`}
              >
                <TaskCard task={task} columnColor={column.color} onTaskClick={onTaskClick} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
      </div>
    </div>
  );
}
