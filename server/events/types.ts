/**
 * 🎯 DOMAIN EVENTS - Eventos de Domínio Tipados
 * 
 * Centraliza todos os tipos de eventos do sistema
 * Garante type-safety e padronização
 */

import type { Task, Board, User } from "@shared/schema";

// 🔥 Base para todos os eventos de domínio
export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;
  metadata?: {
    userId?: string;
    source?: string;
    version?: number;
  };
}

// 📋 BOARD EVENTS
export interface BoardCreatedEvent extends DomainEvent {
  type: 'board.created';
  data: {
    board: Board;
    userId: string;
    createdDefaultColumns?: boolean;
  };
}

export interface BoardUpdatedEvent extends DomainEvent {
  type: 'board.updated';
  data: {
    boardId: string;
    board: Board;
    changes: Partial<Board>;
    userId: string;
  };
}

export interface BoardDeletedEvent extends DomainEvent {
  type: 'board.deleted';
  data: {
    boardId: string;
    boardName: string;
    userId: string;
  };
}

// 📝 TASK EVENTS
export interface TaskCreatedEvent extends DomainEvent {
  type: 'task.created';
  data: {
    task: Task;
    boardId: string;
    userId: string;
  };
}

export interface TaskUpdatedEvent extends DomainEvent {
  type: 'task.updated';
  data: {
    taskId: string;
    task: Task;
    changes: Partial<Task>;
    userId: string;
  };
}

export interface TaskDeletedEvent extends DomainEvent {
  type: 'task.deleted';
  data: {
    taskId: string;
    task: Task;
    boardId: string;
    userId: string;
  };
}

export interface TaskReorderedEvent extends DomainEvent {
  type: 'task.reordered';
  data: {
    taskIds: string[];
    fromColumn?: string;
    toColumn?: string;
    userId: string;
  };
}

// 👥 USER EVENTS
export interface UserCreatedEvent extends DomainEvent {
  type: 'user.created';
  data: {
    user: User;
    welcomeEmailSent?: boolean;
  };
}

export interface UserUpdatedEvent extends DomainEvent {
  type: 'user.updated';
  data: {
    userId: string;
    user: User;
    changes: Partial<User>;
  };
}

// 🏷️ TAG EVENTS  
export interface TagCreatedEvent extends DomainEvent {
  type: 'tag.created';
  data: {
    tagId: string;
    tagName: string;
    color: string;
    userId: string;
  };
}

export interface TagUpdatedEvent extends DomainEvent {
  type: 'tag.updated';
  data: {
    tagId: string;
    tagName: string;
    changes: { name?: string; color?: string };
    userId: string;
  };
}

// 📊 COLUMN EVENTS
export interface ColumnCreatedEvent extends DomainEvent {
  type: 'column.created';
  data: {
    columnId: string;
    columnTitle: string;
    boardId: string;
    position: number;
    userId: string;
  };
}

export interface ColumnUpdatedEvent extends DomainEvent {
  type: 'column.updated';
  data: {
    columnId: string;
    boardId: string;
    changes: any;
    userId: string;
  };
}

export interface ColumnDeletedEvent extends DomainEvent {
  type: 'column.deleted';
  data: {
    columnId: string;
    boardId: string;
    userId: string;
  };
}

export interface ColumnReorderedEvent extends DomainEvent {
  type: 'column.reordered';
  data: {
    boardId: string;
    columnIds: string[];
    userId: string;
  };
}

// 🏢 TEAM EVENTS
export interface TeamCreatedEvent extends DomainEvent {
  type: 'team.created';
  data: {
    teamId: string;
    teamName: string;
    userId: string;
  };
}

export interface TeamUpdatedEvent extends DomainEvent {
  type: 'team.updated';
  data: {
    teamId: string;
    teamName: string;
    changes: any;
    userId: string;
  };
}

export interface TeamDeletedEvent extends DomainEvent {
  type: 'team.deleted';
  data: {
    teamId: string;
    deletedBy: string;
    deletedTeam: any;
  };
}

export interface TeamMemberRemovedEvent extends DomainEvent {
  type: 'team.member_removed';
  data: {
    teamId: string;
    userId: string;
    removedBy: string;
  };
}

export interface TeamMemberRoleUpdatedEvent extends DomainEvent {
  type: 'team.member_role_updated';
  data: {
    teamId: string;
    userId: string;
    newRole: string;
    updatedBy: string;
  };
}

// 🔐 AUTH EVENTS
export interface UserLoginEvent extends DomainEvent {
  type: 'user.login';
  data: {
    userId: string;
    email: string;
    timestamp: Date;
    ipAddress?: string;
  };
}

export interface UserLogoutEvent extends DomainEvent {
  type: 'user.logout';
  data: {
    userId: string;
    sessionId?: string;
    timestamp: Date;
  };
}

// 🎯 UNION TYPE - Todos os eventos possíveis
export type AllDomainEvents = 
  | BoardCreatedEvent
  | BoardUpdatedEvent 
  | BoardDeletedEvent
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | TaskReorderedEvent
  | UserCreatedEvent
  | UserUpdatedEvent
  | TagCreatedEvent
  | TagUpdatedEvent
  | ColumnCreatedEvent
  | ColumnUpdatedEvent
  | ColumnDeletedEvent
  | ColumnReorderedEvent
  | TeamCreatedEvent
  | TeamUpdatedEvent
  | TeamDeletedEvent
  | TeamMemberRemovedEvent
  | TeamMemberRoleUpdatedEvent
  | UserLoginEvent
  | UserLogoutEvent;

// 🎪 Event Registry - Mapear string → tipo
export type EventRegistry = {
  'board.created': BoardCreatedEvent;
  'board.updated': BoardUpdatedEvent;
  'board.deleted': BoardDeletedEvent;
  'task.created': TaskCreatedEvent;
  'task.updated': TaskUpdatedEvent;
  'task.deleted': TaskDeletedEvent;
  'task.reordered': TaskReorderedEvent;
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
  'tag.created': TagCreatedEvent;
  'tag.updated': TagUpdatedEvent;
  'column.created': ColumnCreatedEvent;
  'column.updated': ColumnUpdatedEvent;
  'column.deleted': ColumnDeletedEvent;
  'column.reordered': ColumnReorderedEvent;
  'team.created': TeamCreatedEvent;
  'team.updated': TeamUpdatedEvent;
  'team.deleted': TeamDeletedEvent;
  'team.member_removed': TeamMemberRemovedEvent;
  'team.member_role_updated': TeamMemberRoleUpdatedEvent;
  'user.login': UserLoginEvent;
  'user.logout': UserLogoutEvent;
};

// 🔧 Utility Types
export type EventType = keyof EventRegistry;
export type EventData<T extends EventType> = EventRegistry[T]['data'];