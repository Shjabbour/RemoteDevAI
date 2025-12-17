# Shared Package Structure

## Overview

Total: 4,552 lines of TypeScript code across 18 files

## Directory Structure

```
packages/shared/
├── package.json              # Package configuration
├── tsconfig.json            # TypeScript configuration
├── README.md                # Package documentation
├── .gitignore              # Git ignore rules
└── src/
    ├── index.ts            # Main export file (27 lines)
    ├── types/              # Type definitions (2,589 lines)
    │   ├── user.ts         # User types (199 lines)
    │   ├── project.ts      # Project types (241 lines)
    │   ├── session.ts      # Session types (330 lines)
    │   ├── recording.ts    # Recording types (309 lines)
    │   ├── agent.ts        # Agent types (345 lines)
    │   ├── socket.ts       # Socket types (434 lines)
    │   ├── api.ts          # API types (409 lines)
    │   └── mcp.ts          # MCP types (322 lines)
    ├── schemas/            # Zod validation schemas (534 lines)
    │   ├── userSchema.ts   # User schemas (140 lines)
    │   ├── projectSchema.ts # Project schemas (151 lines)
    │   ├── sessionSchema.ts # Session schemas (189 lines)
    │   └── messageSchema.ts # Message schemas (54 lines)
    └── utils/              # Utility functions (1,402 lines)
        ├── validation.ts   # Validation utilities (284 lines)
        ├── formatting.ts   # Formatting utilities (375 lines)
        ├── constants.ts    # Shared constants (379 lines)
        └── errors.ts       # Error handling (364 lines)
```

## File Breakdown

### Types (2,589 lines total)

#### user.ts (199 lines)
- `User` - Complete user interface
- `UserPreferences` - User settings
- `Subscription` - Subscription details
- `UsageStats` - Usage tracking
- `SubscriptionTier` enum (FREE, PRO, TEAM)
- `SubscriptionStatus` enum

#### project.ts (241 lines)
- `Project` - Project interface
- `ProjectSettings` - Project configuration
- `ProjectMember` - Team member info
- `ProjectInvitation` - Project invites
- `ProjectStatus` enum
- `ProjectVisibility` enum
- `ProjectRole` enum

#### session.ts (330 lines)
- `Session` - Session interface
- `SessionMessage` - Chat messages
- `SessionParticipant` - Session users
- `SessionStats` - Session metrics
- `SessionStatus` enum
- `MessageRole` enum
- `AttachmentType` enum

#### recording.ts (309 lines)
- `Recording` - Recording interface
- `RecordingSegment` - Recording chunks
- `RecordingAnnotation` - Annotations
- `RecordingMetadata` - Recording details
- `RecordingType` enum
- `RecordingStatus` enum
- `VideoQuality` enum

#### agent.ts (345 lines)
- `AgentMessage` - Agent interactions
- `AgentResponse` - Agent outputs
- `AgentContext` - Execution context
- `AgentToolCall` - Tool executions
- `AgentType` enum (10 agent types)
- `AgentStatus` enum

#### socket.ts (434 lines)
- `SocketEvents` enum - All socket events
- `ClientToServerEvents` - Client events
- `ServerToClientEvents` - Server events
- All socket payload types (30+ payloads)

#### api.ts (409 lines)
- `ApiResponse<T>` - Standard API response
- `ApiError` - Error structure
- `PaginatedResponse<T>` - Paginated data
- Request/response types for all endpoints
- Authentication types
- File upload types
- Webhook types

#### mcp.ts (322 lines)
- `McpTool` - MCP tool definition
- `McpToolResult` - Execution results
- `McpRequest/Response` - MCP protocol
- `McpServerInfo` - Server metadata
- `McpConfig` - MCP configuration

### Schemas (534 lines total)

#### userSchema.ts (140 lines)
- `userSchema` - Full user validation
- `createUserSchema` - User creation
- `updateUserSchema` - User updates
- `userPreferencesSchema` - Preferences
- `subscriptionSchema` - Subscription data

#### projectSchema.ts (151 lines)
- `projectSchema` - Full project validation
- `createProjectSchema` - Project creation
- `updateProjectSchema` - Project updates
- `projectSettingsSchema` - Settings
- `projectInvitationSchema` - Invitations

#### sessionSchema.ts (189 lines)
- `sessionSchema` - Full session validation
- `createSessionSchema` - Session creation
- `updateSessionSchema` - Session updates
- `sessionMessageSchema` - Messages
- `sessionSettingsSchema` - Settings

#### messageSchema.ts (54 lines)
- `createMessageSchema` - Message creation
- `updateMessageSchema` - Message updates
- `messageFilterSchema` - Message filtering

### Utils (1,402 lines total)

#### validation.ts (284 lines)
Functions:
- `validateEmail()` - Email validation
- `validatePhoneNumber()` - Phone validation (E.164)
- `validateUrl()` - URL validation
- `validateUuid()` - UUID validation
- `validatePassword()` - Password strength
- `validateUsername()` - Username rules
- `validateFileExtension()` - File type check
- `validateFileSize()` - Size limits
- `sanitizeString()` - XSS prevention
- `validateHexColor()` - Color validation
- `validateDateRange()` - Date bounds

#### formatting.ts (375 lines)
Functions:
- `formatDate()` - Date formatting (5 formats)
- `formatRelativeTime()` - "2 hours ago"
- `formatDuration()` - Time duration
- `formatFileSize()` - Bytes to KB/MB/GB
- `formatNumber()` - Thousand separators
- `formatCurrency()` - Money formatting
- `formatPercentage()` - Percentage display
- `formatPhoneNumber()` - Phone formatting
- `truncateText()` - Text truncation
- `capitalize()` - String capitalization
- `toTitleCase()` - Title case conversion
- `toKebabCase()` - kebab-case conversion
- `toCamelCase()` - camelCase conversion

#### constants.ts (379 lines)
Constants:
- `API_VERSION` - API version string
- `MAX_FILE_SIZE` - Upload limits
- `SUPPORTED_LANGUAGES` - 23 languages
- `CODE_FILE_EXTENSIONS` - 30+ extensions
- `IMAGE_FILE_EXTENSIONS` - 8 formats
- `VIDEO_FILE_EXTENSIONS` - 7 formats
- `AUDIO_FILE_EXTENSIONS` - 6 formats
- `AI_MODELS` - 6 model configs with pricing
- `SUBSCRIPTION_LIMITS` - Tier limits
- `SESSION_TIMEOUTS` - Timeout values
- `RECORDING_QUALITY_PRESETS` - 4 presets
- `PAGINATION_DEFAULTS` - Page settings
- `ERROR_CODES` - 20+ error codes
- `HTTP_STATUS` - Status codes
- `REGEX` - Common regex patterns

#### errors.ts (364 lines)
Classes:
- `AppError` - Base error class
- `AuthenticationError` - Auth failures
- `AuthorizationError` - Permission denied
- `ValidationError` - Invalid input
- `NotFoundError` - Resource not found
- `ConflictError` - Resource conflicts
- `RateLimitError` - Rate limiting
- `QuotaExceededError` - Quota limits
- `ExternalServiceError` - External APIs
- `DatabaseError` - DB errors

Functions:
- `createError()` - Standardize errors
- `handleError()` - Error middleware
- `logError()` - Error logging
- `assert()` - Assertions
- `assertDefined()` - Null checks

## Usage Examples

### Import Types
```typescript
import { User, Project, Session } from '@remotedevai/shared';
```

### Import Schemas
```typescript
import { userSchema, projectSchema } from '@remotedevai/shared';
```

### Import Utils
```typescript
import { validateEmail, formatDate, ValidationError } from '@remotedevai/shared';
```

### Import Constants
```typescript
import { AI_MODELS, SUBSCRIPTION_LIMITS } from '@remotedevai/shared';
```

## Dependencies

- `zod` (^3.22.4) - Runtime validation
- `typescript` (^5.3.3) - Type checking (dev)

## Build Output

- Compiles to CommonJS in `dist/` directory
- Generates TypeScript declaration files (`.d.ts`)
- Declaration maps for better debugging
