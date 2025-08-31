# Overview

This is a Kanban board application called **"NuP-Kan"** built with React and Express, featuring a modern task management interface with drag-and-drop functionality. The application allows users to organize tasks across different columns (Backlog, To Do, In Progress, Review, Done), manage team members, and track project analytics. It includes WIP (Work In Progress) limits, task assignments, progress tracking, and real-time updates. **The system uses PostgreSQL for persistent data storage with a many-to-many relationship between users and teams.**

**Recent Updates (August 31, 2025):**
- ✅ **CRITICAL FORM FIX**: Corrigido erro "useFormContext() null" que impedia criação de tarefas
- ✅ **INFINITE LOOP FIX**: Removido `form` das dependências useEffect para evitar re-renders infinitos
- ✅ **ERROR MESSAGES CONSISTENCY**: Centralizadas todas mensagens de erro em errorMessages.ts
- ✅ **UI IMPROVEMENTS**: Campo de título do formulário agora editável com estilo funcional

**Previous Updates (August 28, 2025):**
- ✅ **ETAPA 4 - SECURITY & PREPARED STATEMENTS**: Sistema de segurança avançado 100% implementado
- ✅ **JWT BLACKLIST SYSTEM**: TokenBlacklistService para logout server-side robusto  
- ✅ **ASYNC JWT VERIFICATION**: JWTService atualizado para verificação assíncrona com blacklist
- ✅ **SERVER-SIDE LOGOUT**: Endpoint /api/auth/logout com invalidação real de tokens
- ✅ **REFRESH TOKEN SECURITY**: Tokens antigos invalidados automaticamente no refresh
- ✅ **PREPARED STATEMENTS**: Drizzle ORM otimizado com proteção SQL injection nativa
- ✅ **SECURITY TESTING**: Blacklist funcionando 100% - tokens invalidados imediatamente
- ✅ **ZERO BREAKAGE**: Todas funcionalidades existentes mantidas integralmente

**Previous Updates (August 26, 2025):**
- ✅ **EMAIL BRANDING UPDATE**: Template de boas-vindas atualizado com nova identidade NuPtechs
- ✅ **CRITICAL ARCHITECTURE FIX**: Corrigida inconsistência grave entre MemStorage e DatabaseStorage
- ✅ **PRODUCTION READY**: MemStorage completamente removido - sistema usa apenas PostgreSQL
- ✅ **CODE CLEANUP**: Arquivo storage.ts reduzido de 2300+ para 1150 linhas (~50% menor)
- ✅ **DRAG & DROP COLUMNS**: DatabaseStorage agora cria colunas padrão (Backlog, To Do, In Progress, Review, Done)
- ✅ **DATA INTEGRITY**: Boards no PostgreSQL não ficam mais vazios, permitindo funcionalidade completa do Kanban
- ✅ **COLOR MAPPING**: Adicionado suporte a códigos hex e nomes de cores nas colunas
- ✅ **OPTIMISTIC UPDATES**: Melhorada responsividade do drag and drop com atualizações otimistas

**Previous Updates (August 24, 2025):**
- ✅ **BRANDING UPDATE**: Nome da aplicação alterado de "uP - Kan" para "NuP-Kan"

**Previous Updates (August 22, 2025):**
- ✅ **BRANDING UPDATE**: Nome da aplicação alterado de "Kanban Flow" para "uP - Kan"
- ✅ Logo personalizado adicionado com a letra "N" estilizada
- ✅ Timeline implementada como histórico dentro dos detalhes das tasks
- ✅ Sistema de comentários adicionado à timeline para histórico completo
- ✅ Diferenciação visual entre eventos automáticos e comentários de usuários
- ✅ Timeline removida do kanban board e movida para modal de detalhes
- ✅ Interface minimalista e moderna para timeline com scroll automático
- ✅ **CRITICAL FIX**: Corrigidos erros de apiRequest com parâmetros invertidos
- ✅ Sistema de reordenação de colunas totalmente funcional
- ✅ Limites WIP aprimorados com verificação correta
- ✅ **EMAIL SYSTEM**: Sistema de emails implementado com SendGrid
- ✅ Emails de boas-vindas automáticos para novos usuários
- ✅ Templates HTML responsivos com branding NuP-Kan

**Previous Updates (August 21, 2025):**
- ✅ Sistema completo de gerenciamento de times implementado com CRUD total
- ✅ API de teams totalmente funcional com PostgreSQL
- ✅ Interface em português para criação, edição e exclusão de times
- ✅ Correções de erros LSP e avisos de acessibilidade nos dialogs
- ✅ **MAJOR UPDATE**: Implementado relacionamento N:N entre usuários e times
- ✅ Criada tabela `user_teams` para permitir usuários em múltiplos times
- ✅ Migração completa do campo `teamId` para nova estrutura relacional
- ✅ APIs novas para gerenciar membros de times: GET, POST, PATCH, DELETE

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
- **ORM**: Drizzle ORM with PostgreSQL dialect and SQL injection protection
- **Database**: PostgreSQL database with persistent storage and prepared statements
- **Schema**: Shared schema definitions between client and server using Drizzle-Zod
- **Security**: SQL injection protection nativa do Drizzle ORM com prepared statements otimizados
- **Database Structure**: 
  - Tasks table with title, description, status, priority, assignee, and progress tracking
  - Columns table for kanban board configuration with WIP limits
  - Team members table for user management
  - Users table (without teamId field - replaced by many-to-many)
  - Teams table for team information
  - **UserTeams table**: Junction table implementing N:N relationship between users and teams with role field
  - Profiles and permissions tables for access control system
- **Storage**: DatabaseStorage class implementing full CRUD operations with PostgreSQL
- **Migrations**: Drizzle Kit for database schema migrations (`npm run db:push`)
- **Data Persistence**: All tasks, columns, team members, and user-team relationships stored in PostgreSQL
- **Security Layer**: TokenBlacklistService para invalidação server-side de tokens JWT
- **User-Team Management**: Complete API for many-to-many relationships with role-based access
  - GET `/api/users/:userId/teams` - Get all teams for a user
  - GET `/api/teams/:teamId/users` - Get all users in a team  
  - POST `/api/users/:userId/teams/:teamId` - Add user to team with role
  - DELETE `/api/users/:userId/teams/:teamId` - Remove user from team
  - PATCH `/api/users/:userId/teams/:teamId` - Update user role in team

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