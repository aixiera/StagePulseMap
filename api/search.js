const { STAGEPULSE_INDEX, getElasticClient, normalizeText } = require("./_elasticClient");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const query = String(body.query ?? "").trim();

    if (!query) {
      return res.status(200).json({ hits: [] });
    }

    const client = getElasticClient();
    const result = await client.search({
      index: STAGEPULSE_INDEX,
      size: 12,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: [
                  "text^4",
                  "normalized_text^3",
                  "booth_name^2",
                  "booth_short_name^2",
                  "type",
                ],
                fuzziness: "AUTO",
              },
            },
            {
              match_phrase: {
                normalized_text: {
                  query: normalizeText(query),
                  boost: 5,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const hits = (result.hits?.hits ?? []).map((hit) => ({
      id: hit._id,
      score: hit._score,
      ...(hit._source ?? {}),
    }));

    return res.status(200).json({ hits });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to search questions.",
    });
  }
};
