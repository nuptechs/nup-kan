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

export function KanbanColumn({ column, tasks, isDragOver, onTaskClick, onAddTask }: KanbanColumnProps) {
  const wipProgress = column.wipLimit ? (tasks.length / column.wipLimit) * 100 : 0;
  const isWipExceeded = column.wipLimit && tasks.length >= column.wipLimit;

  return (
    <div className="h-full">
      <div
        className={cn(
          "bg-white/50 backdrop-blur-sm rounded-2xl border-0 h-full flex flex-col transition-all duration-300 cursor-grab active:cursor-grabbing",
          isDragOver && "bg-indigo-50/80 shadow-lg"
        )}
        data-testid={`column-${column.id}`}
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-800 flex items-center" data-testid={`column-title-${column.id}`}>
              <span className={cn("w-2 h-2 rounded-full mr-2", getColumnColorClasses(column.color))}></span>
              {column.title}
            </h2>
            <div className="flex items-center space-x-1">
              <span
                className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium"
                data-testid={`task-count-${column.id}`}
              >
                {tasks.length}
              </span>
            </div>
          </div>
          
          {/* Simplified WIP Progress */}
          {column.wipLimit && (
            <div className="w-full bg-gray-100 rounded-full h-1 mb-3" data-testid={`wip-progress-${column.id}`}>
              <div
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  getColumnProgressClasses(column.color),
                  isWipExceeded && "bg-red-400"
                )}
                style={{ width: `${Math.min(wipProgress, 100)}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Tasks Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2" data-testid={`tasks-container-${column.id}`}>
          {tasks.map((task, index) => (
            <Draggable key={task.id} draggableId={task.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={cn(
                    snapshot.isDragging && "rotate-1 scale-105 shadow-xl opacity-90"
                  )}
                  data-testid={`task-${task.id}`}
                >
                  <TaskCard task={task} columnColor={column.color} onTaskClick={onTaskClick} />
                </div>
              )}
            </Draggable>
          ))}
          
          {/* Add Task Button - Always visible but subtle */}
          <button
            onClick={() => {
              console.log("Add Task button clicked for column:", column.id);
              onAddTask?.();
            }}
            className="w-full py-3 border border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 flex items-center justify-center group"
            data-testid={`button-add-task-${column.id}`}
          >
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 mr-2" />
            <span className="text-sm text-gray-500 group-hover:text-indigo-600">
              Adicionar tarefa
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
