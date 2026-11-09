import type Anthropic from "@anthropic-ai/sdk";

/** Every piece of text in a model request (system prompt and messages), for leak checks in tests and the eval. */
export function requestText(params: Anthropic.MessageCreateParamsNonStreaming): string {
  const parts: string[] = [];
  const collect = (content: unknown) => {
    if (typeof content === "string") parts.push(content);
    else if (Array.isArray(content)) for (const block of content) if (block && typeof block === "object" && "text" in block) parts.push(String(block.text));
  };
  collect(params.system);
  for (const message of params.messages) collect(message.content);
  return parts.join("\n");
}
