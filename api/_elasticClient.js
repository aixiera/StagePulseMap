const { Client } = require("@elastic/elasticsearch");

const STAGEPULSE_INDEX = "stagepulse-questions";

let client;

function normalizeText(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getElasticClient() {
  const node = process.env.ELASTICSEARCH_NODE;
  const apiKey = process.env.ELASTICSEARCH_API_KEY;

  if (!node || !apiKey) {
    throw new Error("Missing ELASTICSEARCH_NODE or ELASTICSEARCH_API_KEY.");
  }

  if (!client) {
    client = new Client({
      node,
      auth: {
        apiKey,
      },
    });
  }

  return client;
}

module.exports = {
  STAGEPULSE_INDEX,
  getElasticClient,
  normalizeText,
};
