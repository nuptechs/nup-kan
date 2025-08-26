import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Settings, Edit2, Trash2, MoreHorizontal } from "lucide-react";
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
              
              {/* Botões de ação - só aparecem se não for read-only */}
              {!isReadOnly && (
                <>
                  {/* Botões de ação - aparecem no hover */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Botão + para adicionar tarefa */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask?.(column.id);
                      }}
                      className="w-5 h-5 rounded-full bg-gray-100/50 hover:bg-green-100 flex items-center justify-center transition-all duration-200"
                      data-testid={`button-add-task-column-${column.id}`}
                      title="Adicionar nova tarefa"
                    >
                      <Plus className="w-3 h-3 text-gray-400 hover:text-green-500" />
                    </button>
                    
                    {/* Menu de três pontinhos */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="w-5 h-5 rounded-full bg-gray-100/50 hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
                          data-testid={`button-column-menu-${column.id}`}
                          title="Mais opções"
                        >
                          <MoreHorizontal className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditColumn?.(column);
                          }}
                          data-testid={`menu-edit-column-${column.id}`}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar coluna
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteColumn?.(column.id);
                          }}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`menu-delete-column-${column.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2" data-testid={`tasks-container-${column.id}`}>
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