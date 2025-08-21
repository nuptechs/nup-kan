import { useQuery } from "@tanstack/react-query";
import { Clock, User, Settings, Play, CheckCircle, ArrowRight, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskEvent } from "@shared/schema";

interface TaskTimelineProps {
  taskId: string;
  className?: string;
}

const getEventIcon = (eventType: string) => {
  const iconMap: Record<string, any> = {
    created: GitCommit,
    updated: Settings,
    moved: ArrowRight,
    assigned: User,
    completed: CheckCircle,
    started: Play,
  };
  return iconMap[eventType] || Clock;
};

const getEventColor = (eventType: string) => {
  const colorMap: Record<string, string> = {
    created: "bg-blue-500",
    updated: "bg-amber-500",
    moved: "bg-purple-500",
    assigned: "bg-green-500",
    completed: "bg-emerald-500",
    started: "bg-orange-500",
  };
  return colorMap[eventType] || "bg-gray-500";
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};

export function TaskTimeline({ taskId, className }: TaskTimelineProps) {
  const { data: events = [], isLoading } = useQuery<TaskEvent[]>({
    queryKey: [`/api/tasks/${taskId}/events`],
    enabled: !!taskId
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={cn("text-center py-6", className)}>
        <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} data-testid={`timeline-${taskId}`}>
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Atividade Recente
      </h4>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-2.5 top-2 bottom-0 w-px bg-gray-200"></div>
        
        {events.map((event, index) => {
          const Icon = getEventIcon(event.eventType);
          const isLast = index === events.length - 1;
          
          return (
            <div 
              key={event.id} 
              className="relative flex items-start space-x-3 pb-4"
              data-testid={`timeline-event-${event.id}`}
            >
              {/* Event icon */}
              <div className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full border-2 border-white shadow-sm z-10",
                getEventColor(event.eventType)
              )}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
              
              {/* Event content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-900 font-medium leading-tight">
                    {event.description}
                  </p>
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(new Date(event.createdAt || Date.now()))}
                  </span>
                </div>
                
                {event.userName && (
                  <div className="flex items-center space-x-1 mb-1">
                    <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-600">
                        {event.userAvatar || event.userName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{event.userName}</span>
                  </div>
                )}
                
                {event.metadata && (
                  <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    {event.metadata}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}