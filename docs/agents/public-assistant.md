# Public AI Assistant

**Website chat agent — facility info, reservations, general tennis Q&A.**

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Setup & Configuration](#setup--configuration)
5. [How It Works](#how-it-works)
6. [API Reference](#api-reference)
7. [Technical Details](#technical-details)
8. [Troubleshooting](#troubleshooting)
9. [Future Improvements](#future-improvements)

---

## Overview

The AI Agent is an intelligent chat assistant integrated into the Providence Tennis Academy website. It helps users by:
- Answering questions about court reservations
- Providing information about programs and facilities
- Answering tennis-related questions with web search capability
- Assisting with general inquiries

### Key Features
- **Conversational AI**: Maintains conversation context across multiple messages
- **Web Search Integration**: Automatically searches the web when current information is needed
- **Source Citations**: Provides links to sources when using web search results
- **Real-time Responses**: Fast, Pro-level intelligence at Flash speed using Gemini 3
- **Context Awareness**: Knows about Providence Tennis Academy facilities, programs, and services

### Technology Stack
- **Model**: Google Gemini 3 Flash Preview (`gemini-3-flash-preview`)
- **SDK**: `@google/generative-ai` (v0.21.0)
- **Frontend**: React with TypeScript
- **Backend**: Next.js API Routes
- **UI Library**: Framer Motion for animations

---

## Architecture

The AI Agent follows a **3-tier architecture**:

```
┌─────────────────┐
│   Frontend      │  AIAssistant.tsx (React Component)
│   (UI Layer)    │  - Chat interface
│                 │  - Message display
│                 │  - User input handling
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│   API Route     │  app/api/chat/route.ts
│   (HTTP Layer)  │  - Request validation
│                 │  - Error handling
│                 │  - Response formatting
└────────┬────────┘
         │ Function Call
         ▼
┌─────────────────┐
│   AI Agent      │  lib/ai-agent.ts
│   (Logic Layer) │  - Gemini API integration
│                 │  - Conversation management
│                 │  - Source extraction
└─────────────────┘
```

### Data Flow

1. **User Input**: User types a message in the chat interface
2. **Frontend Processing**: Message is added to conversation history and sent to API
3. **API Validation**: Request is validated, conversation history is sanitized
4. **AI Processing**: Message is sent to Gemini 3 with context and history
5. **Response Generation**: Gemini generates response, optionally using web search
6. **Source Extraction**: Sources are extracted from grounding metadata if available
7. **Response Return**: Formatted response is sent back through API to frontend
8. **UI Update**: Message is displayed with optional source links

---

## Components

### 1. Frontend Component: `AIAssistant.tsx`

**Location**: `components/AIAssistant.tsx`

**Purpose**: Provides the user interface for interacting with the AI agent.

**Key Features**:
- Floating chat button (bottom-right corner)
- Expandable/collapsible chat window
- Message history display
- Loading indicators
- Source link display
- Auto-scroll to latest message
- Auto-focus on input when opened

**State Management**:
```typescript
- isOpen: boolean              // Chat window visibility
- messages: Message[]          // Conversation history
- input: string                // Current user input
- isLoading: boolean           // API request status
```

**Key Methods**:
- `handleSend()`: Submits user message to API and handles response
- `scrollToBottom()`: Scrolls chat to show latest message

### 2. API Route: `app/api/chat/route.ts`

**Location**: `app/api/chat/route.ts`

**Purpose**: HTTP endpoint that handles chat requests and responses.

**Endpoint**: `POST /api/chat`

**Request Format**:
```typescript
{
  message: string;                    // Required: User's message
  conversationHistory?: ChatMessage[]; // Optional: Previous messages
}
```

**Response Format**:
```typescript
{
  response: string;                   // AI's response
  sources?: Array<{                   // Optional: Web search sources
    title: string;
    url: string;
  }>;
}
```

**Error Handling**:
- **400 Bad Request**: Missing or invalid message
- **500 Internal Server Error**: AI agent or API error

**Validation**:
- Ensures message is a non-empty string
- Filters conversation history to valid roles only
- Sanitizes message content

### 3. AI Agent Logic: `lib/ai-agent.ts`

**Location**: `lib/ai-agent.ts`

**Purpose**: Core logic for interacting with Google Gemini API.

**Key Components**:

#### Configuration
```typescript
- Model: "gemini-3-flash-preview"
- Tool: googleSearch (for web search capability)
- System Instruction: TENNIS_CONTEXT (facility information)
```

#### Main Function: `chatWithAgent()`

**Signature**:
```typescript
async function chatWithAgent(
  message: string,
  conversationHistory: ChatMessage[] = []
): Promise<{
  response: string;
  sources?: Array<{ title: string; url: string }>;
}>
```

**Process**:
1. Initializes Gemini model with Google Search tool
2. Filters conversation history (ensures starts with user message)
3. Formats history for Gemini API format
4. Creates chat session with system instruction
5. Sends message and waits for response
6. Extracts sources from grounding metadata
7. Returns formatted response with optional sources

**Important Details**:
- **History Filtering**: Gemini requires conversation history to start with a user message. If the first message is from assistant, it's skipped.
- **History Limit**: Only keeps the last 10 messages to manage context window
- **Role Mapping**: Maps "assistant" role to "model" for Gemini API compatibility
- **Source Extraction**: Parses grounding metadata to extract web search sources

---

## Setup & Configuration

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Google API Key** for Gemini

### Installation Steps

1. **Install Dependencies**:
```bash
npm install
```

2. **Configure Environment Variables**:
Add the following to `backend/.env`:
```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_GENAI_MODEL=gemini-3-flash-preview
```

3. **Get Google API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy the key to `backend/.env`

4. **Start Development Server**:
```bash
npm run dev
# or
./start.sh
```

The AI Assistant will be available on every page via the floating chat button.

### Environment Variables (in `backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Your Google Gemini API key |
| `GOOGLE_GENAI_USE_VERTEXAI` | No | Set to "true" if using Vertex AI (default: false) |
| `GOOGLE_GENAI_MODEL` | No | Model name (default: gemini-3-flash-preview) |

---

## How It Works

### Conversation Flow

```
1. User opens chat → Initial welcome message displayed
2. User types message → Message added to UI
3. Message sent to API → Conversation history included
4. API validates request → Sanitizes history
5. AI Agent processes → Sends to Gemini with context
6. Gemini analyzes → Determines if web search needed
7. Response generated → With or without web search
8. Sources extracted → From grounding metadata
9. Response returned → Displayed in chat UI
10. Sources shown → As clickable links (if available)
```

### Context Management

The AI Agent uses a **system instruction** (`TENNIS_CONTEXT`) that provides:

- **Facility Information**: Address, phone, operating hours
- **Court Details**: 10 outdoor Har-Tru clay courts, seasonal indoor courts
- **Programs**: Junior, adult, private lessons, clinics, camps
- **Services**: Court reservations, pro shop, equipment repairs
- **Guidelines**: How to answer different types of questions

This context is included in every conversation, ensuring the AI always has accurate information about Providence Tennis Academy.

### Web Search Integration

When the AI determines it needs current information (e.g., recent tennis news, current rules), it automatically uses Google Search. The search happens automatically when:

- The question requires information beyond the model's knowledge cutoff (January 2025)
- The question is about current events or recent developments
- The model's confidence in its answer is low

Sources are automatically extracted and displayed to the user.

### Conversation History

The agent maintains conversation context by:

1. **Storing Messages**: Both user and assistant messages are stored
2. **History Limiting**: Only the last 10 messages are sent to reduce token usage
3. **Role Mapping**: User messages remain "user", assistant messages become "model" for Gemini
4. **Validation**: Ensures history always starts with a user message

---

## API Reference

### POST /api/chat

Sends a message to the AI agent and receives a response.

#### Request

**URL**: `/api/chat`

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "message": "What are your operating hours?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you?"
    }
  ]
}
```

#### Response

**Success (200)**:
```json
{
  "response": "Our operating hours are 8:00 AM - 9:00 PM, seven days a week.",
  "sources": null
}
```

**With Sources (200)**:
```json
{
  "response": "The latest Wimbledon tournament was won by...",
  "sources": [
    {
      "title": "Wimbledon 2024 Results",
      "url": "https://example.com/wimbledon-2024"
    }
  ]
}
```

**Error (400)**:
```json
{
  "error": "Message is required"
}
```

**Error (500)**:
```json
{
  "error": "Failed to process chat message"
}
```

---

## Technical Details

### Gemini 3 Flash Preview

**Model**: `gemini-3-flash-preview`

**Specifications**:
- **Context Window**: 1M tokens input / 64k tokens output
- **Knowledge Cutoff**: January 2025
- **Intelligence Level**: Pro-level at Flash speed
- **Speed**: Optimized for fast responses

**Capabilities**:
- Natural language understanding
- Context-aware responses
- Web search integration
- Multi-turn conversations
- Source citation

### Google Search Tool

**Tool Name**: `googleSearch`

**Configuration**:
```typescript
tools: [
  {
    googleSearch: {}
  }
]
```

**Behavior**:
- Automatically determines when to search
- Uses dynamic retrieval based on confidence
- Provides grounded responses with citations
- Extracts relevant web sources

**Note**: Gemini 3 uses the simplified `googleSearch` tool instead of the older `googleSearchRetrieval` format.

### System Instruction Format

Gemini 3 requires system instructions in a specific format:

```typescript
systemInstruction: {
  parts: [{ text: TENNIS_CONTEXT }]
}
```

This ensures the context is properly applied to every conversation.

### Message Format

**User Message**:
```typescript
{
  role: "user",
  parts: [{ text: "Hello" }]
}
```

**Model Response**:
```typescript
{
  role: "model",
  parts: [{ text: "Hi! How can I help?" }]
}
```

### Source Extraction

Sources are extracted from the response's `groundingMetadata`:

```typescript
candidate.groundingMetadata.groundingChunks.forEach((chunk) => {
  if (chunk.web?.uri) {
    sources.push({
      title: chunk.web.title || chunk.web.uri,
      url: chunk.web.uri
    });
  }
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error

**Symptoms**: 401 Unauthorized error

**Solution**:
- Verify `GOOGLE_API_KEY` is set in `backend/.env`
- Check the API key is valid in Google AI Studio
- Ensure `backend/.env` is not committed to git (check `.gitignore`)
- Restart the backend server after changing `backend/.env`

#### 2. "google_search_retrieval is not supported" Error

**Symptoms**: 400 Bad Request with message about google_search_retrieval

**Solution**:
- This means you're using the old tool format
- Update to use `googleSearch: {}` instead of `googleSearchRetrieval`
- This is already fixed in the current implementation

#### 3. "First content should be with role 'user'" Error

**Symptoms**: Conversation history errors

**Solution**:
- The implementation already handles this by filtering history
- Ensure conversation history validation is working
- Check that the first message in history is from user role

#### 4. No Sources Showing

**Symptoms**: Responses work but no source links appear

**Possible Causes**:
- Model didn't use web search (answered from knowledge)
- Source extraction failed silently
- No sources available for the query

**Solution**:
- This is normal behavior - sources only appear when web search is used
- Check browser console for warnings
- Test with queries that definitely need current information (e.g., "Who won Wimbledon 2024?")

#### 5. Slow Response Times

**Symptoms**: Long delays before responses

**Possible Causes**:
- Web search queries taking time
- Network latency
- Model thinking time

**Solution**:
- Normal for first response (model initialization)
- Web search adds 2-5 seconds
- Consider implementing response streaming for better UX

#### 6. Chat Window Not Opening

**Symptoms**: Click button but nothing happens

**Solution**:
- Check browser console for errors
- Verify Framer Motion is installed
- Check z-index conflicts with other elements
- Verify component is imported in `app/page.tsx`

### Debugging Tips

1. **Check Server Logs**: Look at terminal output for API errors
2. **Browser Console**: Check for frontend errors
3. **Network Tab**: Inspect API requests/responses
4. **Environment Variables**: Verify they're loaded correctly
5. **API Key Status**: Check quota/usage in Google AI Studio

### Useful Commands

```bash
# Check if API key is loaded
node -e "console.log(process.env.GOOGLE_API_KEY ? 'Set' : 'Not set')"

# Test API endpoint directly
curl -X POST http://localhost:3009/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Check for port conflicts
lsof -ti:3009
```

---

## Future Improvements

### Potential Enhancements

1. **Response Streaming**: Stream responses token-by-token for better UX
2. **Voice Input**: Add speech-to-text for voice queries
3. **Persistent History**: Store conversation history in database/cookies
4. **Multi-language Support**: Support multiple languages
5. **Custom Tool Integration**: Add tools for:
   - Direct court reservation booking
   - Program enrollment
   - Calendar integration
6. **Analytics**: Track common questions and improve context
7. **Rate Limiting**: Implement rate limiting to prevent abuse
8. **Error Recovery**: Better error messages and retry logic
9. **Context Expansion**: Add more detailed facility information
10. **Admin Dashboard**: Interface to update AI context/prompts

### Code Improvements

1. **Type Safety**: More strict TypeScript types
2. **Error Handling**: More granular error handling
3. **Testing**: Unit and integration tests
4. **Logging**: Structured logging for debugging
5. **Caching**: Cache common responses
6. **Response Validation**: Validate AI responses before showing to users

### Performance Optimizations

1. **Response Caching**: Cache responses for common questions
2. **Lazy Loading**: Load AI component only when needed
3. **Debouncing**: Debounce user input for better performance
4. **Connection Pooling**: Reuse Gemini API connections
5. **Token Optimization**: Optimize context window usage

---

## Additional Resources

### Documentation Links

- [Google Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Google Generative AI SDK](https://github.com/google/generative-ai-js)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Getting Help

1. **Check Logs**: Server logs and browser console
2. **Review Documentation**: This doc and linked resources
3. **Test Components**: Test each layer independently
4. **API Testing**: Use curl or Postman to test API directly
5. **Community**: Google AI Developer Community forums

---

## Code Examples

### Using the AI Agent Directly

```typescript
import { chatWithAgent } from "@/lib/ai-agent";

// Simple query
const result = await chatWithAgent("What are your hours?");
console.log(result.response);

// With conversation history
const history = [
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi! How can I help?" }
];

const result = await chatWithAgent("What courts do you have?", history);
console.log(result.response);
if (result.sources) {
  console.log("Sources:", result.sources);
}
```

### Testing the API Endpoint

```typescript
// From frontend
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Tell me about your programs",
    conversationHistory: []
  })
});

const data = await response.json();
console.log(data.response);
```

### Customizing the System Context

Edit `TENNIS_CONTEXT` in `lib/ai-agent.ts` to update the AI's knowledge:

```typescript
const TENNIS_CONTEXT = `
You are a helpful AI assistant for Providence Tennis Academy.
// ... add or modify information here
`;
```

---

## Conclusion

The AI Agent is a powerful, context-aware assistant that enhances user experience on the Providence Tennis Academy website. It combines the intelligence of Gemini 3 Flash with web search capabilities to provide accurate, helpful responses.

For questions or issues, refer to the troubleshooting section or check the server logs for detailed error information.

**Last Updated**: February 6, 2026
**Version**: 1.0.0
**Maintained By**: Providence Tennis Academy Development Team
