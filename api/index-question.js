const {
  STAGEPULSE_INDEX,
  getElasticClient,
  normalizeText,
} = require("./_elasticClient");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const question = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const text = String(question.text ?? "").trim();

    if (!text) {
      return res.status(400).json({ error: "Question text is required." });
    }

    const client = getElasticClient();
    const document = {
      id: String(question.id ?? ""),
      text,
      normalized_text: normalizeText(question.normalizedText ?? text),
      booth_id: question.boothId ?? question.booth_id ?? "",
      booth_name: question.boothName ?? question.booth_name ?? "",
      booth_short_name: question.boothShortName ?? question.booth_short_name ?? "",
      type: question.type ?? "Question",
      level: question.level ?? "level1",
      browser_id: question.browserId ?? question.browser_id ?? "",
      created_at: question.createdAt ?? question.created_at ?? new Date().toISOString(),
    };

    await client.index({
      index: STAGEPULSE_INDEX,
      id: document.id || undefined,
      document,
      refresh: "wait_for",
    });

    return res.status(200).json({ ok: true, id: document.id || null });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to index question.",
    });
  }
};
