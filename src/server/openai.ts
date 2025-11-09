// src/server/openai.ts
import { OpenAI } from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

export async function jsonSchemaChat({
  system,
  user,
  schemaName,
  schema,
  model = "gpt-4o-mini",
}: {
  system: string;
  user: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  model?: string;
}) {
  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, schema: schema as Record<string, unknown> },
    },
  });

  return JSON.parse(resp.choices[0]?.message?.content ?? "{}");
}
