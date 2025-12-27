## AI SDK Core Changes

### generateText and streamText Changes

#### Maximum Output Tokens

The `maxTokens` parameter has been renamed to `maxOutputTokens` for clarity.

```tsx filename="AI SDK 4.0"
const result = await generateText({
  model: __MODEL__,
  maxTokens: 1024,
  prompt: 'Hello, world!',
});
```

```tsx filename="AI SDK 5.0"
const result = await generateText({
  model: __MODEL__,
  maxOutputTokens: 1024,
  prompt: 'Hello, world!',
});
```

### Message and Type System Changes

#### Core Type Renames

##### `CoreMessage` → `ModelMessage`

```tsx filename="AI SDK 4.0"
import { CoreMessage } from 'ai';
```

```tsx filename="AI SDK 5.0"
import { ModelMessage } from 'ai';
```

##### `Message` → `UIMessage`

```tsx filename="AI SDK 4.0"
import { Message, CreateMessage } from 'ai';
```

```tsx filename="AI SDK 5.0"
import { UIMessage, CreateUIMessage } from 'ai';
```

##### `convertToCoreMessages` → `convertToModelMessages`

```tsx filename="AI SDK 4.0"
import { convertToCoreMessages, streamText } from 'ai';

const result = await streamText({
  model: __MODEL__,
  messages: convertToCoreMessages(messages),
});
```

```tsx filename="AI SDK 5.0"
import { convertToModelMessages, streamText } from 'ai';

const result = await streamText({
  model: __MODEL__,
  messages: convertToModelMessages(messages),
});
```

<Note>
  For more information about model messages, see the [Model Message
  reference](/docs/reference/ai-sdk-core/model-message).
</Note>

### UIMessage Changes

#### Content → Parts Array

For `UIMessage`s (previously called `Message`), the `.content` property has been replaced with a `parts` array structure.

```tsx filename="AI SDK 4.0"
import { type Message } from 'ai'; // v4 Message type

// Messages (useChat) - had content property
const message: Message = {
  id: '1',
  role: 'user',
  content: 'Bonjour!',
};
```

```tsx filename="AI SDK 5.0"
import { type UIMessage, type ModelMessage } from 'ai';

// UIMessages (useChat) - now use parts array
const uiMessage: UIMessage = {
  id: '1',
  role: 'user',
  parts: [{ type: 'text', text: 'Bonjour!' }],
};
```

#### Data Role Removed

The `data` role has been removed from UI messages.

```tsx filename="AI SDK 4.0"
const message = {
  role: 'data',
  content: 'Some content',
  data: { customField: 'value' },
};
```

```tsx filename="AI SDK 5.0"
// V5: Use UI message streams with custom data parts
const stream = createUIMessageStream({
  execute({ writer }) {
    // Write custom data instead of message annotations
    writer.write({
      type: 'data-custom',
      id: 'custom-1',
      data: { customField: 'value' },
    });
  },
});
```

#### UIMessage Reasoning Structure

The reasoning property on UI messages has been moved to parts.

```tsx filename="AI SDK 4.0"
const message: Message = {
  role: 'assistant',
  content: 'Hello',
  reasoning: 'I will greet the user',
};
```

```tsx filename="AI SDK 5.0"
const message: UIMessage = {
  role: 'assistant',
  parts: [
    {
      type: 'reasoning',
      text: 'I will greet the user',
    },
    {
      type: 'text',
      text: 'Hello',
    },
  ],
};
```

#### Reasoning Part Property Rename

The `reasoning` property on reasoning UI parts has been renamed to `text`.

```tsx filename="AI SDK 4.0"
{
  message.parts.map((part, index) => {
    if (part.type === 'reasoning') {
      return (
        <div key={index} className="reasoning-display">
          {part.reasoning}
        </div>
      );
    }
  });
}
```

```tsx filename="AI SDK 5.0"
{
  message.parts.map((part, index) => {
    if (part.type === 'reasoning') {
      return (
        <div key={index} className="reasoning-display">
          {part.text}
        </div>
      );
    }
  });
}
```

### File Part Changes

File parts now use `.url` instead of `.data` and `.mimeType`.

```tsx filename="AI SDK 4.0"
{
  messages.map(message => (
    <div key={message.id}>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return <div key={index}>{part.text}</div>;
        } else if (part.type === 'file' && part.mimeType.startsWith('image/')) {
          return (
            <img
              key={index}
              src={`data:${part.mimeType};base64,${part.data}`}
            />
          );
        }
      })}
    </div>
  ));
}
```

```tsx filename="AI SDK 5.0"
{
  messages.map(message => (
    <div key={message.id}>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return <div key={index}>{part.text}</div>;
        } else if (
          part.type === 'file' &&
          part.mediaType.startsWith('image/')
        ) {
          return <img key={index} src={part.url} />;
        }
      })}
    </div>
  ));
}
```

### Stream Data Removal

The `StreamData` class has been completely removed and replaced with UI message streams for custom data.

```tsx filename="AI SDK 4.0"
import { StreamData } from 'ai';

const streamData = new StreamData();
streamData.append('custom-data');
streamData.close();
```

```tsx filename="AI SDK 5.0"
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

const stream = createUIMessageStream({
  execute({ writer }) {
    // Write custom data parts
    writer.write({
      type: 'data-custom',
      id: 'custom-1',
      data: 'custom-data',
    });

    // Can merge with LLM streams
    const result = streamText({
      model: __MODEL__,
      messages,
    });

    writer.merge(result.toUIMessageStream());
  },
});

return createUIMessageStreamResponse({ stream });
```

### Custom Data Streaming: writeMessageAnnotation/writeData Removed

The `writeMessageAnnotation` and `writeData` methods from `DataStreamWriter` have been removed. Instead, use custom data parts with the new `UIMessage` stream architecture.

```tsx filename="AI SDK 4.0"
import { createDataStreamResponse, streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createDataStreamResponse({
    execute: dataStream => {
      // Write general data
      dataStream.writeData('call started');

      const result = streamText({
        model: __MODEL__,
        messages,
        onChunk() {
          // Write message annotations
          dataStream.writeMessageAnnotation({
            status: 'streaming',
            timestamp: Date.now(),
          });
        },
        onFinish() {
          // Write final annotations
          dataStream.writeMessageAnnotation({
            id: generateId(),
            completed: true,
          });

          dataStream.writeData('call completed');
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
```

```tsx filename="AI SDK 5.0"
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  generateId,
} from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const statusId = generateId();

      // Write general data (transient - not added to message history)
      writer.write({
        type: 'data-status',
        id: statusId,
        data: { status: 'call started' },
      });

      const result = streamText({
        model: __MODEL__,
        messages,
        onChunk() {
          // Write data parts that update during streaming
          writer.write({
            type: 'data-status',
            id: statusId,
            data: {
              status: 'streaming',
              timestamp: Date.now(),
            },
          });
        },
        onFinish() {
          // Write final data parts
          writer.write({
            type: 'data-status',
            id: statusId,
            data: {
              status: 'completed',
            },
          });
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

<Note>
  For more detailed information about streaming custom data in v5, see the
  [Streaming Data guide](/docs/ai-sdk-ui/streaming-data).
</Note>

##### Provider Metadata → Provider Options

The `providerMetadata` input parameter has been renamed to `providerOptions`. Note that the returned metadata in results is still called `providerMetadata`.

```tsx filename="AI SDK 4.0"
const result = await generateText({
  model: 'openai/gpt-5',
  prompt: 'Hello',
  providerMetadata: {
    openai: { store: false },
  },
});
```

```tsx filename="AI SDK 5.0"
const result = await generateText({
  model: 'openai/gpt-5',
  prompt: 'Hello',
  providerOptions: {
    // Input parameter renamed
    openai: { store: false },
  },
});

// Returned metadata still uses providerMetadata:
console.log(result.providerMetadata?.openai);
```

#### Tool Definition Changes (parameters → inputSchema)

Tool definitions have been updated to use `inputSchema` instead of `parameters` and error classes have been renamed.

```tsx filename="AI SDK 4.0"
import { tool } from 'ai';

const weatherTool = tool({
  description: 'Get the weather for a city',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => {
    return `Weather in ${city}`;
  },
});
```

```tsx filename="AI SDK 5.0"
import { tool } from 'ai';

const weatherTool = tool({
  description: 'Get the weather for a city',
  inputSchema: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => {
    return `Weather in ${city}`;
  },
});
```

#### Tool Result Content: experimental_toToolResultContent → toModelOutput

The `experimental_toToolResultContent` option has been renamed to `toModelOutput` and is no longer experimental.

```tsx filename="AI SDK 4.0"
const screenshotTool = tool({
  description: 'Take a screenshot',
  parameters: z.object({}),
  execute: async () => {
    const imageData = await takeScreenshot();
    return imageData; // base64 string
  },
  experimental_toToolResultContent: result => [{ type: 'image', data: result }],
});
```

```tsx filename="AI SDK 5.0"
const screenshotTool = tool({
  description: 'Take a screenshot',
  inputSchema: z.object({}),
  execute: async () => {
    const imageData = await takeScreenshot();
    return imageData;
  },
  toModelOutput: result => ({
    type: 'content',
    value: [{ type: 'media', mediaType: 'image/png', data: result }],
  }),
});
```

### Tool Property Changes (args/result → input/output)

Tool call and result properties have been renamed for better consistency with schemas.

```tsx filename="AI SDK 4.0"
// Tool calls used "args" and "result"
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'tool-call':
      console.log('Tool args:', part.args);
      break;
    case 'tool-result':
      console.log('Tool result:', part.result);
      break;
  }
}
```

```tsx filename="AI SDK 5.0"
// Tool calls now use "input" and "output"
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'tool-call':
      console.log('Tool input:', part.input);
      break;
    case 'tool-result':
      console.log('Tool output:', part.output);
      break;
  }
}
```

### Tool Execution Error Handling

The `ToolExecutionError` class has been removed. Tool execution errors now appear as `tool-error` content parts in the result steps, enabling automated LLM roundtrips in multi-step scenarios.

```tsx filename="AI SDK 4.0"
import { ToolExecutionError } from 'ai';

try {
  const result = await generateText({
    // ...
  });
} catch (error) {
  if (error instanceof ToolExecutionError) {
    console.log('Tool execution failed:', error.message);
    console.log('Tool name:', error.toolName);
    console.log('Tool input:', error.toolInput);
  }
}
```

```tsx filename="AI SDK 5.0"
// Tool execution errors now appear in result steps
const { steps } = await generateText({
  // ...
});

// check for tool errors in the steps
const toolErrors = steps.flatMap(step =>
  step.content.filter(part => part.type === 'tool-error'),
);

toolErrors.forEach(toolError => {
  console.log('Tool error:', toolError.error);
  console.log('Tool name:', toolError.toolName);
  console.log('Tool input:', toolError.input);
});
```

For streaming scenarios, tool execution errors appear as `tool-error` parts in the stream, while other errors appear as `error` parts.

### Tool Call Streaming Now Default (toolCallStreaming Removed)

The `toolCallStreaming` option has been removed in AI SDK 5.0. Tool call streaming is now always enabled by default.

```tsx filename="AI SDK 4.0"
const result = streamText({
  model: __MODEL__,
  messages,
  toolCallStreaming: true, // Optional parameter to enable streaming
  tools: {
    weatherTool,
    searchTool,
  },
});
```

```tsx filename="AI SDK 5.0"
const result = streamText({
  model: __MODEL__,
  messages: convertToModelMessages(messages),
  // toolCallStreaming removed - streaming is always enabled
  tools: {
    weatherTool,
    searchTool,
  },
});
```

### Tool Part Type Changes (UIMessage)

In v5, UI tool parts use typed naming: `tool-${toolName}` instead of generic types.

```tsx filename="AI SDK 4.0"
// Generic tool-invocation type
{
  message.parts.map(part => {
    if (part.type === 'tool-invocation') {
      return <div>{part.toolInvocation.toolName}</div>;
    }
  });
}
```

```tsx filename="AI SDK 5.0"
// Type-safe tool parts with specific names
{
  message.parts.map(part => {
    switch (part.type) {
      case 'tool-getWeatherInformation':
        return <div>Getting weather...</div>;
      case 'tool-askForConfirmation':
        return <div>Asking for confirmation...</div>;
    }
  });
}
```

### Dynamic Tools Support

AI SDK 5.0 introduces dynamic tools for handling tools with unknown types at development time, such as MCP tools without schemas or user-defined functions at runtime.

#### New dynamicTool Helper

The new `dynamicTool` helper function allows you to define tools where the input and output types are not known at compile time.

```tsx filename="AI SDK 5.0"
import { dynamicTool } from 'ai';
import { z } from 'zod';

// Define a dynamic tool
const runtimeTool = dynamicTool({
  description: 'A tool defined at runtime',
  inputSchema: z.object({}),
  execute: async input => {
    // Input and output are typed as 'unknown'
    return { result: `Processed: ${input.query}` };
  },
});
```

#### MCP Tools Without Schemas

MCP tools that don't provide schemas are now automatically treated as dynamic tools:

```tsx filename="AI SDK 5.0"
import { MCPClient } from 'ai';

const client = new MCPClient({
  /* ... */
});
const tools = await client.getTools();

// Tools without schemas are now 'dynamic' type
// and won't break type inference when mixed with static tools
```

#### Type-Safe Handling with Mixed Tools

When using both static and dynamic tools together, use the `dynamic` flag for type narrowing:

```tsx filename="AI SDK 5.0"
const result = await generateText({
  model: __MODEL__,
  tools: {
    // Static tool with known types
    weather: weatherTool,
    // Dynamic tool with unknown types
    customDynamicTool: dynamicTool({
      /* ... */
    }),
  },
  onStepFinish: step => {
    // Handle tool calls with type safety
    for (const toolCall of step.toolCalls) {
      if (toolCall.dynamic) {
        // Dynamic tool: input/output are 'unknown'
        console.log('Dynamic tool called:', toolCall.toolName);
        continue;
      }

      // Static tools have full type inference
      switch (toolCall.toolName) {
        case 'weather':
          // TypeScript knows the exact types
          console.log(toolCall.input.location); // string
          break;
      }
    }
  },
});
```

#### New dynamic-tool UI Part

UI messages now include a `dynamic-tool` part type for rendering dynamic tool invocations:

```tsx filename="AI SDK 5.0"
{
  message.parts.map((part, index) => {
    switch (part.type) {
      // Static tools use specific types
      case 'tool-weather':
        return <div>Weather: {part.input.city}</div>;

      // Dynamic tools use the generic dynamic-tool type
      case 'dynamic-tool':
        return (
          <div>
            Dynamic tool: {part.toolName}
            <pre>{JSON.stringify(part.input, null, 2)}</pre>
          </div>
        );
    }
  });
}
```

#### Breaking Change: Type Narrowing Required for Tool Calls and Results

When iterating over `toolCalls` and `toolResults`, you now need to check the `dynamic` flag first for proper type narrowing:

```tsx filename="AI SDK 4.0"
// Direct type checking worked without dynamic flag
onStepFinish: step => {
  for (const toolCall of step.toolCalls) {
    switch (toolCall.toolName) {
      case 'weather':
        console.log(toolCall.input.location); // typed as string
        break;
      case 'search':
        console.log(toolCall.input.query); // typed as string
        break;
    }
  }
};
```

```tsx filename="AI SDK 5.0"
// Must check dynamic flag first for type narrowing
onStepFinish: step => {
  for (const toolCall of step.toolCalls) {
    // Check if it's a dynamic tool first
    if (toolCall.dynamic) {
      console.log('Dynamic tool:', toolCall.toolName);
      console.log('Input:', toolCall.input); // typed as unknown
      continue;
    }

    // Now TypeScript knows it's a static tool
    switch (toolCall.toolName) {
      case 'weather':
        console.log(toolCall.input.location); // typed as string
        break;
      case 'search':
        console.log(toolCall.input.query); // typed as string
        break;
    }
  }
};
```

### Tool UI Part State Changes

Tool UI parts now use more granular states that better represent the streaming lifecycle and error handling.

```tsx filename="AI SDK 4.0"
// Old states
{
  message.parts.map(part => {
    if (part.type === 'tool-invocation') {
      switch (part.toolInvocation.state) {
        case 'partial-call':
          return <div>Loading...</div>;
        case 'call':
          return (
            <div>
              Tool called with {JSON.stringify(part.toolInvocation.args)}
            </div>
          );
        case 'result':
          return <div>Result: {part.toolInvocation.result}</div>;
      }
    }
  });
}
```

```tsx filename="AI SDK 5.0"
// New granular states
{
  message.parts.map(part => {
    switch (part.type) {
      case 'tool-getWeatherInformation':
        switch (part.state) {
          case 'input-streaming':
            return <pre>{JSON.stringify(part.input, null, 2)}</pre>;
          case 'input-available':
            return <div>Getting weather for {part.input.city}...</div>;
          case 'output-available':
            return <div>Weather: {part.output}</div>;
          case 'output-error':
            return <div>Error: {part.errorText}</div>;
        }
    }
  });
}
```

**State Changes:**

- `partial-call` → `input-streaming` (tool input being streamed)
- `call` → `input-available` (tool input complete, ready to execute)
- `result` → `output-available` (tool execution successful)
- New: `output-error` (tool execution failed)

#### Rendering Tool Invocations (Catch-All Pattern)

In v4, you typically rendered tool invocations using a catch-all `tool-invocation` type. In v5, the **recommended approach is to handle each tool specifically using its typed part name (e.g., `tool-getWeather`)**. However, if you need a catch-all pattern for rendering all tool invocations the same way, you can use the `isToolUIPart` and `getToolName` helper functions as a fallback.

```tsx filename="AI SDK 4.0"
{
  message.parts.map((part, index) => {
    switch (part.type) {
      case 'text':
        return <div key={index}>{part.text}</div>;
      case 'tool-invocation':
        const { toolInvocation } = part;
        return (
          <details key={`tool-${toolInvocation.toolCallId}`}>
            <summary>
              <span>{toolInvocation.toolName}</span>
              {toolInvocation.state === 'result' ? (
                <span>Click to expand</span>
              ) : (
                <span>calling...</span>
              )}
            </summary>
            {toolInvocation.state === 'result' ? (
              <div>
                <pre>{JSON.stringify(toolInvocation.result, null, 2)}</pre>
              </div>
            ) : null}
          </details>
        );
    }
  });
}
```

```tsx filename="AI SDK 5.0"
import { isToolUIPart, getToolName } from 'ai';

{
  message.parts.map((part, index) => {
    switch (part.type) {
      case 'text':
        return <div key={index}>{part.text}</div>;
      default:
        if (isToolUIPart(part)) {
          const toolInvocation = part;
          return (
            <details key={`tool-${toolInvocation.toolCallId}`}>
              <summary>
                <span>{getToolName(toolInvocation)}</span>
                {toolInvocation.state === 'output-available' ? (
                  <span>Click to expand</span>
                ) : (
                  <span>calling...</span>
                )}
              </summary>
              {toolInvocation.state === 'output-available' ? (
                <div>
                  <pre>{JSON.stringify(toolInvocation.output, null, 2)}</pre>
                </div>
              ) : null}
            </details>
          );
        }
    }
  });
}
```

#### Media Type Standardization

`mimeType` has been renamed to `mediaType` for consistency. Both image and file types are supported in model messages.

```tsx filename="AI SDK 4.0"
const result = await generateText({
  model: someModel,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see?' },
        {
          type: 'image',
          image: new Uint8Array([0, 1, 2, 3]),
          mimeType: 'image/png',
        },
        {
          type: 'file',
          data: contents,
          mimeType: 'application/pdf',
        },
      ],
    },
  ],
});
```

```tsx filename="AI SDK 5.0"
const result = await generateText({
  model: someModel,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see?' },
        {
          type: 'image',
          image: new Uint8Array([0, 1, 2, 3]),
          mediaType: 'image/png',
        },
        {
          type: 'file',
          data: contents,
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});
```

### Reasoning Support

#### Reasoning Text Property Rename

The `.reasoning` property has been renamed to `.reasoningText` for multi-step generations.

```tsx filename="AI SDK 4.0"
for (const step of steps) {
  console.log(step.reasoning);
}
```

```tsx filename="AI SDK 5.0"
for (const step of steps) {
  console.log(step.reasoningText);
}
```

#### Generate Text Reasoning Property Changes

In `generateText()` and `streamText()` results, reasoning properties have been renamed.

```tsx filename="AI SDK 4.0"
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: 'Explain your reasoning',
});

console.log(result.reasoning); // String reasoning text
console.log(result.reasoningDetails); // Array of reasoning details
```

```tsx filename="AI SDK 5.0"
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: 'Explain your reasoning',
});

console.log(result.reasoningText); // String reasoning text
console.log(result.reasoning); // Array of reasoning details
```

### Continuation Steps Removal

The `experimental_continueSteps` option has been removed from `generateText()`.

```tsx filename="AI SDK 4.0"
const result = await generateText({
  experimental_continueSteps: true,
  // ...
});
```

```tsx filename="AI SDK 5.0"
const result = await generateText({
  // experimental_continueSteps has been removed
  // Use newer models with higher output token limits instead
  // ...
});
```

### Image Generation Changes

Image model settings have been moved to `providerOptions`.

```tsx filename="AI SDK 4.0"
await generateImage({
  model: luma.image('photon-flash-1', {
    maxImagesPerCall: 5,
    pollIntervalMillis: 500,
  }),
  prompt,
  n: 10,
});
```

```tsx filename="AI SDK 5.0"
await generateImage({
  model: luma.image('photon-flash-1'),
  prompt,
  n: 10,
  maxImagesPerCall: 5,
  providerOptions: {
    luma: { pollIntervalMillis: 500 },
  },
});
```

### Step Result Changes

#### Step Type Removal

The `stepType` property has been removed from step results.

```tsx filename="AI SDK 4.0"
steps.forEach(step => {
  switch (step.stepType) {
    case 'initial':
      console.log('Initial step');
      break;
    case 'tool-result':
      console.log('Tool result step');
      break;
    case 'done':
      console.log('Final step');
      break;
  }
});
```

```tsx filename="AI SDK 5.0"
steps.forEach((step, index) => {
  if (index === 0) {
    console.log('Initial step');
  } else if (step.toolResults.length > 0) {
    console.log('Tool result step');
  } else {
    console.log('Final step');
  }
});
```

### Step Control: maxSteps → stopWhen

For core functions like `generateText` and `streamText`, the `maxSteps` parameter has been replaced with `stopWhen`, which provides more flexible control over multi-step execution. The `stopWhen` parameter defines conditions for stopping the generation **when the last step contains tool results**. When multiple conditions are provided as an array, the generation stops if any condition is met.

```tsx filename="AI SDK 4.0"
// V4: Simple numeric limit
const result = await generateText({
  model: __MODEL__,
  messages,
  maxSteps: 5, // Stop after a maximum of 5 steps
});

// useChat with maxSteps
const { messages } = useChat({
  maxSteps: 3, // Stop after a maximum of 3 steps
});
```

```tsx filename="AI SDK 5.0"
import { stepCountIs, hasToolCall } from 'ai';

// V5: Server-side - flexible stopping conditions with stopWhen
const result = await generateText({
  model: __MODEL__,
  messages,
  // Only triggers when last step has tool results
  stopWhen: stepCountIs(5), // Stop at step 5 if tools were called
});

// Server-side - stop when specific tool is called
const result = await generateText({
  model: __MODEL__,
  messages,
  stopWhen: hasToolCall('finalizeTask'), // Stop when finalizeTask tool is called
});
```

**Common stopping patterns:**

```tsx filename="AI SDK 5.0"
// Stop after N steps (equivalent to old maxSteps)
// Note: Only applies when the last step has tool results
stopWhen: stepCountIs(5);

// Stop when specific tool is called
stopWhen: hasToolCall('finalizeTask');

// Multiple conditions (stops if ANY condition is met)
stopWhen: [
  stepCountIs(10), // Maximum 10 steps
  hasToolCall('submitOrder'), // Or when order is submitted
];

// Custom condition based on step content
stopWhen: ({ steps }) => {
  const lastStep = steps[steps.length - 1];
  // Custom logic - only triggers if last step has tool results
  return lastStep?.text?.includes('COMPLETE');
};
```

**Important:** The `stopWhen` conditions are only evaluated when the last step contains tool results.

#### Usage vs Total Usage

Usage properties now distinguish between single step and total usage.

```tsx filename="AI SDK 4.0"
// usage contained total token usage across all steps
console.log(result.usage);
```

```tsx filename="AI SDK 5.0"
// usage contains token usage from the final step only
console.log(result.usage);
// totalUsage contains total token usage across all steps
console.log(result.totalUsage);
```
