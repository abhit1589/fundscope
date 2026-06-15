import { NextResponse } from "next/server";
import { getFundSummary } from "@/lib/fund-service";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Add OPENAI_API_KEY to .env.local to enable AI explanations (your only cost).",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as { schemeCode?: number };
  if (!body.schemeCode) {
    return NextResponse.json({ error: "schemeCode required" }, { status: 400 });
  }

  const fund = await getFundSummary(body.schemeCode);
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const prompt = `You are a mutual fund educator for Indian investors. Explain this fund in plain English (max 200 words). Be factual, neutral, not investment advice. Mention category, AMC, direct plan benefit, returns context, and who it might suit.

Fund data:
${JSON.stringify(fund, null, 2)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Concise, helpful, disclaimer that this is not financial advice.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 502 });
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  return NextResponse.json({
    explanation: data.choices[0]?.message?.content ?? "",
  });
}
