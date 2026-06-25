/**
 * DeepSeek Function Calling — handler & execution bridge
 */

import { DEEPSEEK_FUNCTION_SCHEMAS } from "./lifecoach-system-prompt";

export { DEEPSEEK_FUNCTION_SCHEMAS };

/**
 * Map OpenAI-style function name → legacy tool call object
 */
export function mapFunctionToToolCall(name, args) {
  switch (name) {
    case "create_presentation":
      return {
        tool: "create_presentation",
        parameters: {
          topic: args.topic,
          content_outline: args.content_outline || [],
        },
      };
    case "add_calendar_event":
      return {
        tool: "add_calendar_event",
        parameters: {
          title: args.title,
          start_time: args.start_time,
          end_time: args.end_time,
          recurrence: args.recurrence,
        },
      };
    case "extract_to_spreadsheet": {
      let text = args.file_id_or_text || "";
      if (args.headers && args.rows) {
        text = [args.headers.join("\t"), ...args.rows.map((r) => r.join("\t"))].join("\n");
        if (args.title) text = `${args.title}\n${text}`;
      }
      return { tool: "extract_to_spreadsheet", parameters: { file_id_or_text: text } };
    }
    case "upload_to_drive":
      return {
        tool: "upload_to_drive",
        parameters: {
          file_content: args.file_content,
          file_name: args.file_name,
          mime_type: args.mime_type || "text/plain",
        },
      };
    case "search_nearby_places":
      return {
        tool: "search_nearby_places",
        parameters: {
          category: args.category,
          location: args.location,
        },
      };
    default:
      return null;
  }
}

/**
 * Run DeepSeek with native function calling, execute tools, optional follow-up completion.
 */
export async function runDeepSeekWithTools({
  client,
  modelName,
  messages,
  executeToolCall,
  maxRounds = 2,
}) {
  let currentMessages = [...messages];
  let lastContent = "";
  const toolResults = [];

  for (let round = 0; round < maxRounds; round++) {
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: currentMessages,
      tools: DEEPSEEK_FUNCTION_SCHEMAS,
      tool_choice: round === 0 ? "auto" : "none",
      temperature: 0.7,
      max_tokens: 2048,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
    });

    const choice = completion.choices?.[0]?.message;
    if (!choice) throw new Error("DeepSeek boş yanıt döndürdü.");

    lastContent = choice.content?.trim() || "";

    const toolCalls = choice.tool_calls;
    if (!toolCalls?.length) {
      return { content: lastContent, toolResults, usedTools: toolResults.length > 0 };
    }

    currentMessages.push({
      role: "assistant",
      content: choice.content || null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const fnName = tc.function?.name;
      let fnArgs = {};
      try {
        fnArgs = JSON.parse(tc.function?.arguments || "{}");
      } catch {
        fnArgs = {};
      }

      const legacyCall = mapFunctionToToolCall(fnName, fnArgs);
      let result = { success: false, error: "Unknown function" };

      if (legacyCall && executeToolCall) {
        try {
          result = await executeToolCall(legacyCall);
          toolResults.push({ tool: fnName, result });
        } catch (err) {
          result = { success: false, error: err.message };
          toolResults.push({ tool: fnName, error: err.message });
        }
      }

      currentMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { content: lastContent, toolResults, usedTools: toolResults.length > 0 };
}
