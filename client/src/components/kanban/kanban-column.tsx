import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Column, TaskAssignee, User } from "@shared/schema";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddTask?: (columnId: string) => void;
  isReadOnly?: boolean;
  onTaskDragStart?: (e: React.DragEvent, task: Task) => void;
  onTaskDragEnd?: () => void;
  allAssignees: Record<string, (TaskAssignee & { user: User })[]>;
}

const getColumnColorClasses = (color: string) => {
  const colorMap = {
    gray: "bg-gray-400",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
  };
  
  // Se for um código hex, mapear para a cor correspondente
  const hexToColorMap: Record<string, string> = {
    "#6b7280": "gray",
    "#3b82f6": "blue", 
    "#eab308": "yellow",
    "#a855f7": "purple",
    "#22c55e": "green",
  };
  
  const colorName = hexToColorMap[color] || color;
  return colorMap[colorName as keyof typeof colorMap] || "bg-gray-400";
};

const getColumnProgressClasses = (color: string) => {
  const colorMap = {
    gray: "bg-gray-400",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
  };
  
  // Se for um código hex, mapear para a cor correspondente
  const hexToColorMap: Record<string, string> = {
    "#6b7280": "gray",
    "#3b82f6": "blue", 
    "#eab308": "yellow",
    "#a855f7": "purple",
    "#22c55e": "green",
  };
  
  const colorName = hexToColorMap[color] || color;
  return colorMap[colorName as keyof typeof colorMap] || "bg-gray-400";
};

export function KanbanColumn({ 
  column, 
  tasks, 
  onTaskClick, 
  onEditColumn, 
  onDeleteColumn, 
  onAddTask,
  isReadOnly = false, 
  onTaskDragStart, 
  onTaskDragEnd, 
  allAssignees 
}: KanbanColumnProps) {
  const wipProgress = column.wipLimit ? (tasks.length / column.wipLimit) * 100 : 0;
  const isWipExceeded = column.wipLimit && tasks.length >= column.wipLimit;

  return (
    <div className="h-full">
      <div
        className="bg-white/50 backdrop-blur-sm rounded-2xl border-0 h-full flex flex-col transition-all duration-300"
        data-testid={`column-${column.id}`}
      >
        {/* Header */}
        <div className="p-4 pb-2 group">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-800 flex items-center relative" data-testid={`column-title-${column.id}`}>
              <span className={cn("w-2 h-2 rounded-full mr-2", getColumnColorClasses(column.color))}></span>
              {column.title}
              
              {/* Linha L saindo do título */}
              {!isReadOnly && (
                <>
                  {/* Linha vertical saindo de baixo do título */}
                  <div className="absolute left-3 top-full w-px h-3 bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  
                  {/* Linha horizontal do L - centralizada com o meio do botão */}
                  <div className="absolute left-3 top-full translate-y-[18px] w-8 h-px bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  
                  {/* Botão + no final da linha */}
                  <button
                    onClick={() => {
                      onAddTask?.(column.id);
                    }}
                    className="absolute left-10 top-full translate-y-4 w-5 h-5 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center group/add opacity-60 hover:opacity-100 shadow-sm z-10"
                    data-testid={`button-add-task-column-${column.id}`}
                    title="Adicionar nova tarefa"
                  >
                    <Plus className="w-2.5 h-2.5 group-hover/add:scale-110 transition-transform duration-200" />
                  </button>
                </>
              )}
            </h2>
            <div className="flex items-center space-x-1">
              <span
                className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium"
                data-testid={`task-count-${column.id}`}
              >
                {tasks.length}
              </span>
              
              {/* Botões de ação - só aparecem se não for read-only */}
              {!isReadOnly && (
                <>
                  {/* Botões de edição - aparecem no hover */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditColumn?.(column);
                      }}
                      className="w-5 h-5 rounded-full bg-gray-100/50 hover:bg-blue-100 flex items-center justify-center transition-all duration-200"
                      data-testid={`button-edit-column-${column.id}`}
                      title="Editar coluna"
                    >
                      <Edit2 className="w-3 h-3 text-gray-400 hover:text-blue-500" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteColumn?.(column.id);
                      }}
                      className="w-5 h-5 rounded-full bg-gray-100/50 hover:bg-red-100 flex items-center justify-center transition-all duration-200"
                      data-testid={`button-delete-column-${column.id}`}
                      title="Excluir coluna"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          
          {/* WIP Progress */}
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
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-6 space-y-2" data-testid={`tasks-container-${column.id}`}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnColor={column.color}
              onTaskClick={onTaskClick}
              onDragStart={onTaskDragStart}
              onDragEnd={onTaskDragEnd}
              isReadOnly={isReadOnly}
              assignees={allAssignees[task.id] || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}