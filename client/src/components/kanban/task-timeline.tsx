import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, User, Settings, Play, CheckCircle, ArrowRight, GitCommit, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaskEvent } from "@shared/schema";
import { useState } from "react";

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
    comment: MessageCircle,
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
    comment: "bg-indigo-500",
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
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  const { data: events = [], isLoading } = useQuery<TaskEvent[]>({
    queryKey: [`/api/tasks/${taskId}/events`],
    enabled: !!taskId
  });

  const { data: currentUser } = useQuery<{ name: string; avatar: string }>({
    queryKey: ["/api/auth/current-user"]
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await fetch(`/api/tasks/${taskId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "comment",
          description: comment,
          userName: currentUser?.name || "Usuário",
          userAvatar: currentUser?.avatar || "U"
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to add comment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/events`] });
      setNewComment("");
      setIsAddingComment(false);
    }
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

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
    <div className={cn("space-y-4", className)} data-testid={`timeline-${taskId}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Histórico da Tarefa
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingComment(!isAddingComment)}
          className="text-xs"
          data-testid="button-add-comment"
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          Comentar
        </Button>
      </div>

      {/* Add comment form */}
      {isAddingComment && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-3">
          <Textarea
            placeholder="Adicione um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            data-testid="textarea-new-comment"
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingComment(false);
                setNewComment("");
              }}
              className="text-xs"
              data-testid="button-cancel-comment"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="text-xs"
              data-testid="button-submit-comment"
            >
              {addCommentMutation.isPending ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Comentar
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <div className="relative max-h-80 overflow-y-auto">
        {/* Timeline line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200"></div>
        
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nenhuma atividade registrada</p>
          </div>
        ) : (
          events.map((event, index) => {
            const Icon = getEventIcon(event.eventType);
            const isComment = event.eventType === "comment";
            
            return (
              <div 
                key={event.id} 
                className="relative flex items-start space-x-3 pb-4"
                data-testid={`timeline-event-${event.id}`}
              >
                {/* Event icon */}
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full border-2 border-white shadow-sm z-10 flex-shrink-0",
                  getEventColor(event.eventType)
                )}>
                  <Icon className="w-2.5 h-2.5 text-white" />
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      {isComment ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-900 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-900 font-medium leading-tight">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-mono ml-3 flex-shrink-0">
                      {formatTime(new Date(event.createdAt || Date.now()))}
                    </span>
                  </div>
                  
                  {event.userName && (
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-600">
                          {event.userAvatar || event.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{event.userName}</span>
                    </div>
                  )}
                  
                  {event.metadata && !isComment && (
                    <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md mt-1">
                      {event.metadata}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}