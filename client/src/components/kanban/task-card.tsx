import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Paperclip, Clock, Flag, Eye, FileText, Code, Server, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Task, TaskAssignee, User, Tag } from "@shared/schema";

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

const getTaskTimeInfo = (task: Task) => {
  if (!task.createdAt) return "Recente";
  
  const created = new Date(task.createdAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInHours < 1) return "< 1h";
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}sem`;
  return `${Math.floor(diffInDays / 30)}mês`;
};

function TaskAssignees({ taskId }: { taskId: string }) {
  const { data: assignees = [] } = useQuery<(TaskAssignee & { user: User })[]>({
    queryKey: ["/api/tasks", taskId, "assignees"],
  });

  if (assignees.length === 0) {
    return (
      <div className="flex items-center space-x-1.5 group">
        <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-gray-300 transition-colors">
          <span className="text-gray-400 text-xs group-hover:text-gray-500 transition-colors">?</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">Não atribuído</span>
      </div>
    );
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center space-x-1.5 group">
      <div className="flex -space-x-1">
        {assignees.slice(0, 3).map((assignee, index) => (
          <Avatar 
            key={assignee.user.id} 
            className="w-5 h-5 border border-white group-hover:border-gray-100 transition-colors"
            style={{ zIndex: assignees.length - index }}
          >
            <AvatarFallback className="bg-indigo-500 text-white text-xs group-hover:bg-indigo-600 transition-colors">
              {assignee.user.avatar || getUserInitials(assignee.user.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {assignees.length > 3 && (
          <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center border border-white text-white text-xs group-hover:bg-gray-600 transition-colors">
            +{assignees.length - 3}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
        {assignees.length === 1 
          ? assignees[0].user.name 
          : `${assignees.length} responsáveis`
        }
      </span>
    </div>
  );
}

export function TaskCard({ task, columnColor, onTaskClick }: TaskCardProps) {
  const isInProgress = task.status === "inprogress";
  const isReview = task.status === "review";
  const isDone = task.status === "done";
  const Icon = getRandomIcon();

  // Fetch tags data to get colors
  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Filter tags for this task
  const taskTags = allTags.filter(tag => task.tags?.includes(tag.name));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTaskClick?.(task);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl p-2 sm:p-3 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group border border-gray-100 min-w-0",
        (isInProgress || isReview) && `border-l-4 ${getColumnBorderClasses(columnColor)}`,
        isDone && "opacity-80"
      )}
      data-testid={`card-${task.id}`}
      onClick={handleClick}
    >
      {/* Title and Priority */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={cn(
          "font-medium text-gray-900 text-xs sm:text-sm leading-tight group-hover:text-indigo-600 transition-colors flex-1 mr-2 break-words",
          isDone && "line-through decoration-green-500 text-gray-600"
        )}>
          {task.title}
        </h3>
        <Badge
          variant="secondary"
          className={cn("text-xs px-2 py-0.5 rounded-md font-medium shrink-0", getPriorityClasses(task.priority))}
          data-testid={`priority-${task.id}`}
        >
          {isDone ? "Concluída" : getPriorityText(task.priority)}
        </Badge>
      </div>
      
      {/* Description - Only if exists */}
      {task.description && (
        <p className="text-gray-600 text-xs mb-2 line-clamp-2" data-testid={`description-${task.id}`}>
          {task.description}
        </p>
      )}
      
      {/* Progress - Only for in-progress tasks */}
      {isInProgress && task.progress !== undefined && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1 group hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded transition-colors">
            <span className="group-hover:text-gray-700 transition-colors">Progresso</span>
            <span className="group-hover:text-gray-900 font-medium transition-colors" data-testid={`progress-${task.id}`}>{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1.5" />
        </div>
      )}

      {/* Review Status */}
      {isReview && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Code className="w-3 h-3 text-purple-500" />
            <span className="text-xs text-gray-600">feature/branch</span>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-md"
            data-testid={`review-status-${task.id}`}
          >
            Pronto para deploy
          </Badge>
        </div>
      )}

      {/* Done Status */}
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

      {/* Tags Section */}
      {taskTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {taskTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                borderColor: `${tag.color}40`,
              }}
              data-testid={`tag-${tag.name}-${task.id}`}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Bottom Row - Assignee and Meta */}
      <div className="flex items-center justify-between mt-3">
        <TaskAssignees taskId={task.id} />
        
        {/* Task Meta Info */}
        <div className="flex items-center space-x-1.5 text-xs text-gray-400 group hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded transition-colors">
          <Icon className="w-3 h-3 group-hover:text-gray-500 transition-colors" />
          <span className="group-hover:text-gray-600 transition-colors" data-testid={`task-meta-${task.id}`}>
            {isDone ? "Deploy" : getTaskTimeInfo(task)}
          </span>
        </div>
      </div>
    </div>
  );
}
