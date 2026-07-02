// Checks every link in README.md and prints the response for each one.
// Purely informational: it never fails the job, it just gives you a report to skim.

const fs = require("fs");
const path = require("path");

const readmePath = path.join(__dirname, "..", "..", "README.md");
const text = fs.readFileSync(readmePath, "utf8");

// Grab every http(s) URL, then trim trailing punctuation the markdown wraps them in.
const urls = [...new Set(
  (text.match(/https?:\/\/[^\s)]+/g) || []).map((u) => u.replace(/[).,]+$/, ""))
)];

if (urls.length === 0) {
  console.log("Found no links in README.md");
  return;
}

const TIMEOUT_MS = 20000;
const CONCURRENCY = 8;
// Pretend to be a normal browser so fewer sites block us.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      headers: HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function check(url) {
  try {
    // HEAD is cheap, but plenty of servers don't support it, so fall back to GET.
    let res = await request(url, "HEAD");
    if (res.status >= 400) res = await request(url, "GET");
    return { url, status: res.status };
  } catch (err) {
    return { url, status: err.cause?.code || err.name || String(err) };
  }
}

async function run() {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      results.push(await check(url));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const suspect = (r) => typeof r.status !== "number" || r.status >= 400;
  const flagged = results.filter(suspect);
  const ok = results.filter((r) => !suspect(r));

  if (flagged.length > 0) {
    console.log("=== Needs a look (error or 4xx/5xx) ===");
    for (const r of flagged) console.log(`[${r.status}] ${r.url}`);
    console.log("");
  }

  console.log(`=== OK (${ok.length}) ===`);
  for (const r of ok) console.log(`[${r.status}] ${r.url}`);

  console.log(`\n${urls.length} links checked, ${flagged.length} need a look.`);
}

run();
