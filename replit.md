# Overview

This is a Kanban board application built with React and Express, featuring a modern task management interface with drag-and-drop functionality. The application allows users to organize tasks across different columns (Backlog, To Do, In Progress, Review, Done), manage team members, and track project analytics. It includes WIP (Work In Progress) limits, task assignments, progress tracking, and real-time updates. **The system now uses PostgreSQL for persistent data storage, ensuring all tasks and user data are saved permanently.**

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Built with shadcn/ui components library and Radix UI primitives
- **Styling**: Tailwind CSS with a custom design system using CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Drag & Drop**: react-beautiful-dnd for kanban board interactions
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Development**: Vite middleware integration for seamless full-stack development

## Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL database with persistent storage
- **Schema**: Shared schema definitions between client and server using Drizzle-Zod
- **Database Structure**: 
  - Tasks table with title, description, status, priority, assignee, and progress tracking
  - Columns table for kanban board configuration with WIP limits
  - Team members table for user management
- **Storage**: DatabaseStorage class implementing full CRUD operations with PostgreSQL
- **Migrations**: Drizzle Kit for database schema migrations (`npm run db:push`)
- **Data Persistence**: All tasks, columns, and team members are stored in PostgreSQL

## Key Features Architecture
- **Kanban Board**: Column-based task organization with drag-and-drop reordering
- **WIP Limits**: Configurable work-in-progress limits per column with visual indicators
- **Task Management**: Full CRUD operations with real-time updates
- **Team Management**: User assignment and status tracking
- **Analytics**: Performance metrics including cycle time and throughput
- **Settings Panel**: Dynamic configuration for board customization

## Development Patterns
- **Monorepo Structure**: Client, server, and shared code in a single repository
- **Type Safety**: End-to-end TypeScript with shared types and schema validation
- **Component Architecture**: Reusable UI components with proper separation of concerns
- **API Integration**: Consistent error handling and loading states across all data operations

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database hosting
- **Connection**: Uses DATABASE_URL environment variable for connection configuration

## UI Framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Low-level UI primitives for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework for styling

## Development Tools
- **Vite**: Build tool and development server with React support
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment integration with error overlay and cartographer

## Runtime Libraries
- **TanStack Query**: Server state management and caching
- **React Beautiful DnD**: Drag and drop functionality for kanban board
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities