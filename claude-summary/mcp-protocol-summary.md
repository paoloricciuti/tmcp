# Model Context Protocol (MCP) - Comprehensive Documentation Summary

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Protocol Foundation](#protocol-foundation)
4. [Server Features](#server-features)
5. [Client Features](#client-features)
6. [Utility Features](#utility-features)
7. [Authorization Framework](#authorization-framework)
8. [Security Best Practices](#security-best-practices)
9. [Implementation Guide](#implementation-guide)
10. [Version 2025-06-18 Changes](#version-2025-06-18-changes)

---

## Overview

The Model Context Protocol (MCP) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. It standardizes how to connect LLMs with the context they need through a client-host-server architecture.

### Key Benefits
- **Standardized Interface**: Common protocol for LLM integrations
- **Security-First Design**: User control and consent mechanisms
- **Composable Architecture**: Mix and match different servers
- **Progressive Enhancement**: Optional capabilities negotiated at runtime

---

## Architecture

### Core Components

#### Hosts
- **Role**: LLM applications that initiate connections
- **Responsibilities**: 
  - Manage client instances
  - Enforce security policies
  - Coordinate AI/LLM integration
  - Handle user consent workflows
- **Examples**: Claude Desktop, IDEs, AI assistants

#### Clients
- **Role**: Connectors within the host
- **Characteristics**:
  - Maintain isolated server connections (1:1 relationship)
  - Handle protocol communication
  - Manage capability negotiation
  - Forward requests/responses

#### Servers
- **Role**: Services providing specialized context and capabilities
- **Characteristics**:
  - Expose MCP primitives (tools, resources, prompts)
  - Stateful sessions with clients
  - Capability-based feature exposure
  - Transport-agnostic implementation

### Design Principles

1. **Servers should be extremely easy to build**
   - Simple interfaces with minimal implementation overhead
   - Clear separation of concerns
   - Comprehensive tooling and documentation

2. **Servers should be highly composable**
   - Focused functionality that can be combined seamlessly
   - No interdependencies between servers
   - Consistent interface patterns

3. **Servers should not see the whole conversation**
   - Full conversation history stays with the host
   - Servers receive only relevant context
   - Privacy-preserving by design

4. **Progressive feature addition**
   - Core protocol with optional capabilities
   - Negotiated feature sets at runtime
   - Backward compatibility maintained

---

## Protocol Foundation

### Base Protocol
- **Message Format**: JSON-RPC 2.0 over UTF-8 encoding
- **Connection Model**: Stateful sessions with capability negotiation
- **Protocol Version**: 2025-06-18 (latest stable)
- **Required Components**: Base protocol and lifecycle management

### Message Types

#### Requests
- Client-to-server or server-to-client operations
- Unique IDs for request/response correlation
- Timeout and cancellation support
- Progress reporting capabilities

#### Responses
- Success results with structured data
- Error responses with standardized error codes
- Consistent error handling patterns
- Proper HTTP status code mapping

#### Notifications
- One-way messages with no response expected
- Real-time updates and event broadcasting
- Subscription-based change notifications
- Efficient for frequent updates

### Transport Layer

#### stdio Transport
- **Use Case**: Local processes and development tools
- **Benefits**: Simple, efficient, no network overhead
- **Implementation**: Standard input/output communication
- **Security**: Process isolation and user permissions

#### Streamable HTTP Transport
- **Use Case**: Remote servers and web integrations
- **Benefits**: HTTP compatibility, load balancing, caching
- **Implementation**: POST requests with optional Server-Sent Events
- **Security**: HTTPS required, origin validation, authentication

#### Custom Transports
- **Flexibility**: Protocol-agnostic design allows custom implementations
- **Examples**: WebSocket, gRPC, message queues
- **Requirements**: Must implement JSON-RPC 2.0 message framing

---

## Server Features

### 1. Tools (Model-Controlled Actions)

#### Overview
- **Purpose**: Executable functions that allow models to perform actions
- **Control**: AI models discover and invoke automatically (with human approval)
- **Capability**: Must declare `tools` capability
- **Change Notifications**: Optional `listChanged` support

#### Key Messages
- `tools/list`: Discover available tools with pagination support
- `tools/call`: Invoke specific tools with structured arguments
- `notifications/tools/list_changed`: Notify clients of tool availability changes

#### Content Types
- **Text**: UTF-8 encoded textual content
- **Image**: Base64-encoded images with MIME type
- **Audio**: Base64-encoded audio with MIME type
- **Resource Links**: References to MCP resources
- **Embedded Resources**: Inline resource content

#### Tool Annotations
- `readOnlyHint`: Indicates no environment modifications
- `destructiveHint`: May perform destructive updates
- `idempotentHint`: Repeated calls have no additional effect
- `openWorldHint`: Interacts with external entities

#### Security Requirements
- **Human-in-the-loop**: Approval required for tool execution
- **Input Validation**: All parameters must be validated
- **Rate Limiting**: Prevent abuse and resource exhaustion
- **Access Controls**: Proper authorization and permission checks

#### Common Use Cases
- **System Operations**: Execute shell commands, manage files
- **API Integrations**: Create GitHub issues, query databases, send emails
- **Data Processing**: Analyze CSV files, transform data, generate reports
- **External Services**: Search web, query APIs, manage cloud resources

### 2. Resources (Application-Controlled Data)

#### Overview
- **Purpose**: Structured data/content providing context to models
- **Control**: Host applications determine incorporation based on needs
- **Identification**: URI-based with custom schemes supported
- **Capability**: Must declare `resources` capability

#### Key Messages
- `resources/list`: Discover available resources with pagination
- `resources/read`: Retrieve resource contents by URI
- `resources/templates/list`: List parameterized resource templates
- `resources/subscribe`: Subscribe to resource change notifications
- `resources/unsubscribe`: Unsubscribe from resource changes
- `notifications/resources/updated`: Resource change notifications

#### URI Schemes
- `https://`: Web-accessible resources
- `file://`: Filesystem-like resources
- `git://`: Version control integration
- `custom://`: Application-specific schemes (following RFC 3986)

#### Resource Templates
- **URI Templates**: RFC 6570 compliant parameterized URIs
- **Dynamic Content**: Generate resources based on parameters
- **Completion Support**: Argument autocompletion for parameters
- **Use Cases**: Database queries, API endpoints, file patterns

#### Common Use Cases
- **File Contents**: Source code, configuration files, logs
- **Database Records**: Query results, schema information
- **API Responses**: External service data, cached results
- **Live System Data**: Metrics, status information, screenshots
- **Documentation**: README files, API docs, help content

### 3. Prompts (User-Controlled Templates)

#### Overview
- **Purpose**: Pre-defined templates/instructions for LLM interactions
- **Control**: Users explicitly select for use (e.g., slash commands)
- **Capability**: Must declare `prompts` capability
- **Change Notifications**: Optional `listChanged` support

#### Key Messages
- `prompts/list`: Discover available prompts with pagination
- `prompts/get`: Retrieve specific prompt with arguments
- `notifications/prompts/list_changed`: Prompt availability updates

#### Content Types
- **Text**: UTF-8 encoded textual content
- **Image**: Base64-encoded images with MIME type
- **Audio**: Base64-encoded audio with MIME type
- **Embedded Resources**: Inline resource content for context

#### Common Use Cases
- **Code Analysis**: "Analyze this code for improvements"
- **Git Workflows**: "Generate commit message for these changes"
- **Documentation**: "Explain how this function works"
- **Project Setup**: "Initialize new project with configuration"
- **Debugging**: "Analyze these logs for errors"

#### UI Integration
- **Slash Commands**: Surface as command palette entries
- **Quick Actions**: Context menu items and toolbar buttons
- **Guided Workflows**: Multi-step interactive forms
- **Command Palette**: Easy access through search interface

---

## Client Features

### 1. Roots (Workspace Boundaries)

#### Overview
- **Purpose**: Define filesystem boundaries for server operations
- **Data**: List of file:// URIs with optional display names
- **Capability**: Must declare `roots` capability
- **Change Notifications**: Optional `listChanged` support

#### Key Messages
- `roots/list`: Retrieve available filesystem roots
- `notifications/roots/list_changed`: Root list updates

#### Security Requirements
- **User Consent**: Required for root access
- **Path Validation**: Ensure paths are within permitted boundaries
- **Access Controls**: Proper permission checking
- **Monitoring**: Track and log root access

#### Common Use Cases
- **Project Directories**: Define workspace boundaries
- **Repository Locations**: Git repositories, code bases
- **API Endpoints**: Define service boundaries
- **Configuration Locations**: Settings, preferences
- **Resource Boundaries**: Limit server scope

### 2. Sampling (Server-Initiated LLM Requests)

#### Overview
- **Purpose**: Server-initiated LLM interactions for agentic behaviors
- **Control**: Human-in-the-loop approval required
- **Model Selection**: Abstract capability priorities with optional model hints
- **Content Types**: Text, image, audio inputs and outputs

#### Key Messages
- `sampling/createMessage`: Request LLM generation with preferences

#### Model Preferences
- **Cost Priority**: Optimize for cost efficiency
- **Speed Priority**: Optimize for response time
- **Intelligence Priority**: Optimize for capability and accuracy
- **Model Hints**: Optional specific model suggestions

#### Security Requirements
- **Human Approval**: All sampling requests require user consent
- **Content Validation**: Sanitize and validate message content
- **Rate Limiting**: Prevent abuse and cost overruns
- **Privacy Protection**: Handle user data appropriately

#### Common Use Cases
- **Agentic Workflows**: Reading and analyzing resources, making decisions
- **Content Generation**: Creating structured data, generating reports
- **Multi-step Tasks**: Planning and executing complex operations
- **Interactive Assistance**: Providing context-aware help
- **Code Analysis**: Automated code review and suggestions

### 3. Elicitation (Dynamic Information Gathering)

#### Overview
- **Purpose**: Server requests for additional user information
- **Schema**: Restricted JSON Schema subset for flat objects
- **Response Actions**: Accept (with data), decline, or cancel
- **New in**: 2025-06-18 specification

#### Key Messages
- `elicitation/create`: Request structured data from user

#### Schema Restrictions
- **Primitive Types**: strings, numbers, booleans, enums only
- **Flat Objects**: No nested objects or arrays
- **Required Fields**: Clear indication of mandatory vs optional
- **Validation**: Basic format validation (email, URL, etc.)

#### Security Requirements
- **No Sensitive Data**: Cannot request passwords, tokens, or secrets
- **User Approval**: All elicitation requests require user consent
- **Rate Limiting**: Prevent spam and abuse
- **Transparency**: Clear indication of requesting server

#### Common Use Cases
- **Initial Setup**: Gathering configuration during first use
- **Dynamic Workflows**: Requesting context-specific information
- **User Preferences**: Collecting optional settings
- **Project Details**: Gathering metadata for resource creation
- **Service Integration**: Requesting usernames or IDs

---

## Utility Features

### 1. Logging

#### Overview
- **Purpose**: Structured log messages from servers to clients
- **Levels**: Standard syslog severity levels (debug to emergency)
- **Capability**: Must declare `logging` capability

#### Key Messages
- `logging/setLevel`: Configure minimum log level
- `notifications/message`: Log message notifications

#### Log Levels
- **Emergency**: System is unusable
- **Alert**: Action must be taken immediately
- **Critical**: Critical conditions
- **Error**: Error conditions
- **Warning**: Warning conditions
- **Notice**: Normal but significant condition
- **Info**: Informational messages
- **Debug**: Debug-level messages

### 2. Completion

#### Overview
- **Purpose**: Argument autocompletion for prompts and resources
- **Support**: IDE-like completion experience
- **Capability**: Must declare `completions` capability

#### Key Messages
- `completion/complete`: Request completion suggestions

#### Completion Types
- **Argument Values**: Suggest valid parameter values
- **Resource URIs**: Complete resource identifiers
- **Template Parameters**: Complete URI template variables
- **Context-Aware**: Consider previously resolved variables

### 3. Pagination

#### Overview
- **Purpose**: Handle large result sets in chunks
- **Model**: Opaque cursor-based (not page numbers)
- **Support**: Available for list operations

#### Implementation
- **Cursor-Based**: Opaque tokens for pagination state
- **Configurable Size**: Client-controlled page sizes
- **Efficient**: Optimized for large datasets
- **Stateless**: No server-side pagination state

---

## Authorization Framework

### OAuth 2.1 Implementation

#### Scope
- **HTTP Transports Only**: Not applicable to stdio transport
- **Standards Compliance**: OAuth 2.1, RFC 8414, RFC 7591, RFC 9728
- **Discovery**: Protected Resource Metadata for authorization server location
- **Client Registration**: Dynamic client registration support recommended

#### Security Requirements
- **Resource Indicators**: RFC 8707 implementation required
- **Token Validation**: Servers must validate tokens intended for them
- **PKCE**: Required for authorization code protection
- **Communication Security**: HTTPS required for all endpoints

#### Implementation Flow
1. **Discovery**: Client discovers authorization server via Protected Resource Metadata
2. **Registration**: Dynamic client registration (optional but recommended)
3. **Authorization**: User authorization with PKCE
4. **Token Exchange**: Secure token acquisition and refresh
5. **API Access**: Authenticated API requests with proper token validation

---

## Security Best Practices

### Core Security Principles

1. **User Consent and Control**
   - Explicit consent for data access and operations
   - Clear indication of permissions being requested
   - Granular control over server capabilities

2. **Data Privacy**
   - User consent before exposing data to servers
   - Minimize data exposure to necessary context only
   - Proper data handling and storage practices

3. **Tool Safety**
   - Explicit consent before invoking tools
   - Clear indication of tool capabilities and risks
   - Audit logging for tool usage

4. **LLM Sampling Controls**
   - User approval for all sampling requests
   - Cost and usage monitoring
   - Content validation and sanitization

### Attack Mitigation

#### Confused Deputy Problem
- **Issue**: Servers acting on behalf of users without proper authorization
- **Mitigation**: User consent for dynamically registered clients
- **Implementation**: Clear authorization flows and permission boundaries

#### Token Passthrough
- **Issue**: Servers incorrectly forwarding tokens to external services
- **Mitigation**: Forbidden practice - servers must validate token audience
- **Implementation**: Proper token validation with Resource Indicators

#### Session Hijacking
- **Issue**: Unauthorized access to user sessions
- **Mitigation**: Secure session IDs, user-specific binding
- **Implementation**: Strong session management and monitoring

### Implementation Guidelines

#### Consent Flows
- **Robust Authorization**: Implement comprehensive permission flows
- **Clear Communication**: Explain what access is being requested
- **Granular Control**: Allow fine-grained permission management
- **Audit Trails**: Log all permission grants and usage

#### Access Controls
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Regular Audits**: Review and revoke unnecessary permissions
- **Rate Limiting**: Prevent abuse and resource exhaustion
- **Monitoring**: Track usage patterns and detect anomalies

#### Input Validation
- **Comprehensive Validation**: Validate all inputs thoroughly
- **Sanitization**: Clean and escape user inputs
- **Type Safety**: Use strong typing and schema validation
- **Error Handling**: Proper error messages without information leakage

---

## Implementation Guide

### Development Workflow

1. **Design Phase**
   - Define server capabilities (tools, resources, prompts)
   - Plan security and authorization requirements
   - Design API interfaces and data schemas

2. **Implementation Phase**
   - Choose appropriate transport (stdio vs HTTP)
   - Implement capability negotiation
   - Add comprehensive error handling and logging

3. **Testing Phase**
   - Test with MCP Inspector tool
   - Validate security and permission flows
   - Performance testing and optimization

4. **Integration Phase**
   - Integrate with production clients
   - Monitor usage and performance
   - Implement deployment and maintenance procedures

### Best Practices

#### Server Implementation
- **Clear Documentation**: Comprehensive API documentation
- **Error Handling**: Proper error messages and codes
- **Performance**: Efficient resource usage and response times
- **Security**: Comprehensive security measures and validation

#### Client Integration
- **User Experience**: Intuitive permission flows and interfaces
- **Performance**: Efficient communication and caching
- **Reliability**: Robust error handling and recovery
- **Security**: Proper token management and validation

#### Testing and Validation
- **Comprehensive Testing**: Unit, integration, and end-to-end tests
- **Security Testing**: Penetration testing and vulnerability assessment
- **Performance Testing**: Load testing and optimization
- **Compatibility Testing**: Cross-platform and version compatibility

---

## Version 2025-06-18 Changes

### Major Changes

1. **Removed JSON-RPC Batching Support**
   - Simplified message handling
   - Reduced complexity and potential for errors
   - Improved debugging and monitoring

2. **Added Structured Tool Output**
   - Output schema validation for tools
   - Improved type safety and error handling
   - Better integration with typed languages

3. **Enhanced OAuth Security**
   - Resource Indicators (RFC 8707) requirement
   - Improved token validation and security
   - Better protection against token misuse

4. **Added Elicitation Feature**
   - Server-initiated user information requests
   - Structured data collection with JSON Schema
   - Improved user experience for dynamic workflows

5. **Added Resource Links in Tool Results**
   - Better integration between tools and resources
   - Improved context sharing and referencing
   - Enhanced user experience and navigation

6. **Required Protocol Version Headers**
   - HTTP transport protocol version identification
   - Improved compatibility and debugging
   - Better error reporting and diagnostics

7. **Strengthened Security Considerations**
   - Comprehensive security best practices guide
   - Detailed attack mitigation strategies
   - Improved implementation guidelines

### Schema Improvements

#### _meta Field Support
- **Purpose**: Protocol-level metadata
- **Use Cases**: Versioning, debugging, extensions
- **Implementation**: Optional field in message objects

#### Context Field in Completion
- **Purpose**: Consider previously-resolved variables
- **Use Cases**: Template completion, parameter suggestions
- **Implementation**: Context object in completion requests

#### Title Fields
- **Purpose**: Human-friendly display names
- **Separation**: Distinct from programmatic names
- **Implementation**: Optional title field in various objects

### Migration Guide

#### From Earlier Versions
1. **Remove Batching Support**: Update client code to handle individual messages
2. **Implement Resource Indicators**: Add RFC 8707 support for OAuth
3. **Add Elicitation Support**: Implement user information request handling
4. **Update Security Practices**: Follow new security guidelines and best practices
5. **Protocol Version Headers**: Add version identification to HTTP transport

#### Backward Compatibility
- **Core Protocol**: Maintains backward compatibility
- **Optional Features**: New features are optional and negotiated
- **Deprecation Path**: Clear migration path for deprecated features

---

## Conclusion

The Model Context Protocol (MCP) 2025-06-18 provides a comprehensive, security-focused framework for connecting AI models with external tools and data sources. Its design emphasizes user control, security boundaries, and progressive feature adoption while maintaining simplicity and composability.

Key strengths include:
- **Standardized Interface**: Common protocol for diverse integrations
- **Security-First Design**: Comprehensive security measures and user control
- **Flexible Architecture**: Support for various transport mechanisms and use cases
- **Progressive Enhancement**: Optional capabilities and backward compatibility
- **Rich Feature Set**: Comprehensive tools, resources, and client capabilities

The protocol's continued evolution demonstrates a commitment to security, usability, and developer experience while maintaining the core principles of simplicity and composability that make MCP servers easy to build and deploy.