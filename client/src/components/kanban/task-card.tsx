import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, Paperclip, Clock, Flag, Eye, FileText, Code, Server, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  columnColor: string;
  onTaskClick?: (task: Task) => void;
}

const getPriorityClasses = (priority: string) => {
  const priorityMap = {
    high: "bg-red-100 text-red-600",
    medium: "bg-yellow-100 text-yellow-600", 
    low: "bg-blue-100 text-blue-600",
  };
  return priorityMap[priority as keyof typeof priorityMap] || "bg-gray-100 text-gray-600";
};

const getPriorityText = (priority: string) => {
  const priorityMap = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  };
  return priorityMap[priority as keyof typeof priorityMap] || priority;
};

const getColumnBorderClasses = (columnColor: string) => {
  const colorMap = {
    yellow: "border-yellow-300 border-l-yellow-500",
    purple: "border-purple-300 border-l-purple-500",
    green: "border-green-200 border-l-green-500",
  };
  return colorMap[columnColor as keyof typeof colorMap] || "";
};

const getRandomIcon = () => {
  const icons = [MessageCircle, Paperclip, Clock, Flag, Eye, FileText, Code, Server, Rocket];
  return icons[Math.floor(Math.random() * icons.length)];
};

export function TaskCard({ task, columnColor, onTaskClick }: TaskCardProps) {
  const isDone = task.status === "done";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTaskClick?.(task);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl p-3 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group border border-gray-100",
        isDone && "opacity-80"
      )}
      data-testid={`card-${task.id}`}
      onClick={handleClick}
    >
      {/* Title and Priority */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={cn(
          "font-medium text-gray-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors flex-1 mr-2",
          isDone && "line-through decoration-green-500 text-gray-600"
        )}>
          {task.title}
        </h3>
        {task.priority !== "low" && (
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0",
              task.priority === "high" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
            )}
            data-testid={`priority-${task.id}`}
          >
            {task.priority === "high" ? "!" : "!"}
          </span>
        )}
      </div>
      
      {/* Description - Only if exists */}
      {task.description && (
        <p className="text-gray-600 text-xs mb-2 line-clamp-2" data-testid={`description-${task.id}`}>
          {task.description}
        </p>
      )}
      
      {/* Progress - Only for in-progress tasks */}
      {task.status === "inprogress" && task.progress !== undefined && (
        <div className="mb-2">
          <Progress value={task.progress} className="h-1.5 bg-gray-100" />
          <span className="text-xs text-gray-500 mt-1 block" data-testid={`progress-${task.id}`}>
            {task.progress}% completo
          </span>
        </div>
      )}
      
      {/* Bottom Row - Assignee */}
      <div className="flex items-center justify-between mt-3">
        {task.assigneeName ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium" data-testid={`assignee-avatar-${task.id}`}>
                {task.assigneeAvatar || task.assigneeName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-600" data-testid={`assignee-name-${task.id}`}>
              {task.assigneeName}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5">
            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-400 text-xs">?</span>
            </div>
            <span className="text-xs text-gray-400">Não atribuído</span>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex items-center">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isDone ? "bg-green-500" : task.status === "inprogress" ? "bg-blue-500" : "bg-gray-300"
          )}></span>
        </div>
      </div>
    </div>
  );
}
