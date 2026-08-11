# Requirements Document

## Introduction

This document specifies the requirements for the MCP (Model Context Protocol) Agent Server, which enables external AI coding agents to read and draw diagrams on the LiveFlows canvas. This is MVP 1b, building upon the realtime canvas infrastructure established in MVP 1a.

## Glossary

- **MCP**: Model Context Protocol - a standardized protocol for AI agents to interact with external tools and resources
- **Agent**: An external AI coding agent (e.g., Claude Code, Cursor, OpenAI agents) that connects via MCP to read and modify canvas content
- **Canvas**: The Excalidraw drawing surface managed by Liveblocks Storage
- **Room**: A Liveblocks room containing canvas elements for a project
- **CanvasSnapshot**: The Postgres mirror of canvas elements, refreshed via webhook
- **Workspace**: A Clerk Organization that contains projects and members
- **Project**: A container for files (canvases and documents) within a workspace
- **Element**: An Excalidraw drawing element (rectangle, ellipse, arrow, text, etc.)
- **LiveMap**: Liveblocks' CRDT-based map data structure for storing elements
- **DAL**: Data Access Layer - the server-side module that handles all database operations

## Requirements

### Requirement 1: MCP Server Lifecycle Management

**User Story:** As a system operator, I want the MCP server to start and stop cleanly, so that it can be deployed and managed in production environments.

#### Acceptance Criteria

1. THE MCP Server SHALL expose an HTTP endpoint for MCP protocol communication
2. THE MCP Server SHALL validate all incoming requests against the MCP specification
3. WHEN the server starts, THE System SHALL verify connectivity to Postgres and Liveblocks
4. WHEN the server shuts down, THE System SHALL gracefully close all active connections
5. IF database connectivity is lost at runtime, THE System SHALL log the error and reject new requests while preserving existing session state

### Requirement 2: Agent Authentication and Authorization

**User Story:** As a LiveFlows administrator, I want to control which agents can access the canvas, so that unauthorized agents cannot read or modify diagrams.

#### Acceptance Criteria

1. THE MCP Server SHALL require each agent to present valid authentication credentials
2. THE MCP Server SHALL verify agent credentials against the workspace membership stored in Postgres
3. WHEN an agent attempts to access a project, THE System SHALL verify the agent's associated workspace has membership in that project
4. IF an agent is not a member of the workspace, THE System SHALL return an error without revealing project existence
5. THE System SHALL support both API key-based authentication and OAuth-based authentication for agents

### Requirement 3: Canvas Read Access

**User Story:** As an AI agent, I want to read the current state of a canvas, so that I can understand the diagram before making modifications.

#### Acceptance Criteria

1. WHEN an agent requests canvas elements for a valid project, THE MCP Server SHALL return all non-deleted elements from Liveblocks Storage
2. THE MCP Server SHALL convert Liveblocks Storage elements to Excalidraw-compatible JSON format
3. THE Returned elements SHALL include all element properties required for rendering (id, type, x, y, width, height, strokeColor, fillColor, etc.)
4. WHEN an agent requests canvas elements, THE System SHALL verify the agent has read access to the project
5. IF the requested project does not exist, THE System SHALL return a not-found error

### Requirement 4: Canvas Write Access

**User Story:** As an AI agent, I want to add elements to a canvas, so that I can create or modify diagrams based on the project's requirements.

#### Acceptance Criteria

1. WHEN an agent submits new elements, THE MCP Server SHALL convert them to Liveblocks LiveObject format and insert into the room's LiveMap
2. THE System SHALL assign unique element IDs to new elements if not provided
3. THE System SHALL set appropriate version numbers for new elements following Excalidraw's versioning rules
4. WHEN elements are written, THE System SHALL broadcast changes to all connected clients via Liveblocks
5. IF a concurrent human edit is in progress, THE System SHALL merge the agent's elements using version-based conflict resolution
6. IF the room is not found, THE System SHALL return an error

### Requirement 5: Element Format Conversion

**User Story:** As an AI agent developer, I want elements in a standard format, so that I can programmatically create diagrams without dealing with Excalidraw's internal format.

#### Acceptance Criteria

1. THE MCP Server SHALL provide a tool that returns elements in the standard Excalidraw element format
2. THE MCP Server SHALL provide a tool that accepts elements in the standard Excalidraw element format for insertion
3. THE Conversion SHALL preserve all essential drawing properties including position, size, stroke, fill, and metadata
4. FOR all valid element transformations, parsing then formatting THEN parsing SHALL produce an equivalent object (round-trip property)

### Requirement 6: Project and Workspace Discovery

**User Story:** As an AI agent, I want to discover available projects and workspaces, so that I can select which diagram to work on.

#### Acceptance Criteria

1. WHEN an agent requests workspace list, THE MCP Server SHALL return workspaces where the agent's credentials have membership
2. WHEN an agent requests project list within a workspace, THE System SHALL return projects from Postgres scoped to that workspace
3. THE Returned projects SHALL include project ID, name, and last updated timestamp
4. THE System SHALL NOT return projects from workspaces the agent does not have access to

### Requirement 7: Concurrent Edit Safety

**User Story:** As a LiveFlows user, I want agent edits to never corrupt my concurrent human edits, so that I can collaborate with AI agents without data loss.

#### Acceptance Criteria

1. WHEN an agent writes elements while a human is actively drawing, THE System SHALL merge changes using version-based conflict resolution
2. THE Agent's element insertion SHALL use the same reconciliation logic as the client-side canvas (version ledger pattern from element-sync.ts)
3. THE Agent's edits SHALL NOT be echoed back to the agent during the same operation
4. IF a conflict cannot be resolved automatically, THE System SHALL prefer the later timestamp's changes
5. THE System SHALL log all agent-initiated write operations for audit purposes

### Requirement 8: Error Handling and Recovery

**User Story:** As an AI agent developer, I want clear error messages when operations fail, so that I can debug integration issues.

#### Acceptance Criteria

1. WHEN an invalid element is submitted, THE MCP Server SHALL return a descriptive error indicating which element failed validation
2. WHEN Liveblocks is temporarily unavailable, THE System SHALL return a service unavailable error with retry guidance
3. WHEN an agent submits elements in an unsupported format, THE System SHALL return a validation error with the expected format
4. THE MCP Server SHALL implement idempotent operations where possible to support safe retries

### Requirement 9: Rate Limiting and Throttling

**User Story:** As a LiveFlows operator, I want to prevent agents from overwhelming the system, so that canvas performance remains stable for human users.

#### Acceptance Criteria

1. THE MCP Server SHALL enforce rate limits on write operations per agent
2. THE Rate limit SHALL be configurable per workspace
3. WHEN an agent exceeds the rate limit, THE System SHALL return a 429 status with retry-after header
4. THE System SHALL log rate limit violations for monitoring

### Requirement 10: Read-Only Mode Fallback

**User Story:** As an AI agent, I want to gracefully degrade when the canvas is unavailable, so that I can continue operating with cached data.

#### Acceptance Criteria

1. WHEN Liveblocks Storage is unreachable, THE MCP Server SHALL attempt to read from CanvasSnapshot in Postgres as a fallback
2. THE Fallback mode SHALL be clearly indicated in the response
3. IF both Liveblocks and Postgres are unavailable, THE System SHALL return an error indicating the service is down
4. THE Fallback mode SHALL only support read operations; write operations SHALL return an error

### Requirement 11: MCP Protocol Compliance

**User Story:** As an AI agent developer, I want the server to implement the standard MCP protocol, so that I can use familiar client libraries.

#### Acceptance Criteria

1. THE MCP Server SHALL implement the MCP specification version 1.0
2. THE Server SHALL support the standard tools capability for exposing canvas operations
3. THE Server SHALL support the standard resources capability for project discovery
4. THE Server SHALL support the standard prompts capability for common diagram templates
5. THE Protocol messages SHALL be JSON-RPC 2.0 compliant