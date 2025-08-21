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
  const isInProgress = task.status === "inprogress";
  const isReview = task.status === "review";
  const isDone = task.status === "done";
  const Icon = getRandomIcon();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTaskClick?.(task);
  };

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-move group",
        (isInProgress || isReview) && `border-l-4 ${getColumnBorderClasses(columnColor)}`,
        isDone && "opacity-75"
      )}
      data-testid={`card-${task.id}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className={cn(
          "font-medium text-gray-900 text-sm leading-5 group-hover:text-indigo-600 transition-colors cursor-pointer",
          isDone && "line-through decoration-green-500"
        )}>
          {task.title}
        </h3>
        <Badge
          variant="secondary"
          className={cn("text-xs px-2 py-1 rounded-md font-medium ml-2", getPriorityClasses(task.priority))}
          data-testid={`priority-${task.id}`}
        >
          {isDone ? "Concluída" : getPriorityText(task.priority)}
        </Badge>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2" data-testid={`description-${task.id}`}>
          {task.description}
        </p>
      )}
      
      {isInProgress && task.progress !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progresso</span>
            <span data-testid={`progress-${task.id}`}>{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>
      )}
      
      {isReview && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Code className="w-3 h-3 text-purple-500" />
            <span className="text-xs text-gray-600">feature/branch</span>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-md"
            data-testid={`review-status-${task.id}`}
          >
            Pronto para deploy
          </Badge>
        </div>
      )}
      
      {isDone && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs text-green-600">
            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
            <span data-testid={`completion-date-${task.id}`}>
              Finalizada em {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('pt-BR') : 'Hoje'}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        {task.assigneeName && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium" data-testid={`assignee-avatar-${task.id}`}>
                {task.assigneeAvatar || task.assigneeName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-500" data-testid={`assignee-name-${task.id}`}>
              {task.assigneeName}
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Icon className="w-3 h-3" />
          <span data-testid={`task-meta-${task.id}`}>
            {isDone ? "Deploy" : task.tags?.[0] || "3h"}
          </span>
        </div>
      </div>
    </div>
  );
}
