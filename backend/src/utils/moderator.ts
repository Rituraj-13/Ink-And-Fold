import Groq from "groq-sdk";

export const moderationCheck = async (blogContent: string, apiKey: string) => {
  const groq = new Groq({
    apiKey: apiKey,
  });

  const chatCompletion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "system",
        content:
          "You are an AI content moderator. Analyze the provided text for inappropriate content including hate speech, harassment, self-harm, sexual content, violence, or illegal activities. Set 'flagged' to true if any inappropriate content is found, and list the triggered categories in 'categories' (e.g., hate, harassment, self-harm, sexual, violence). If the text is clean, set 'flagged' to false and keep 'categories' as an empty array.",
      },
      {
        role: "user",
        content: blogContent,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "moderation_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            flagged: { type: "boolean" },
            categories: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["flagged", "categories"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = chatCompletion.choices[0].message.content;
  if (!content) {
    throw new Error("Empty response from Groq Moderation API");
  }

  const result = JSON.parse(content);
  console.log("Groq Moderation Result:", result);

  return {
    results: [
      {
        flagged: result.flagged,
        categories: result.categories.reduce(
          (acc: Record<string, boolean>, category: string) => {
            acc[category] = true;
            return acc;
          },
          {},
        ),
      },
    ],
  };
};
