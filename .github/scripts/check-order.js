// Checks that the Projects list in README.md is in alphabetical order (case-insensitive).
// Exits 1 and prints the first out-of-order pairs if not.

const fs = require("fs");
const path = require("path");

const readmePath = path.join(__dirname, "..", "..", "README.md");
const lines = fs.readFileSync(readmePath, "utf8").split("\n");

// The list lives between the "### Projects" heading and the next heading.
const start = lines.findIndex((l) => l.trim() === "### Projects");
if (start === -1) {
  console.error("Could not find the '### Projects' heading in README.md");
  process.exit(1);
}
const end = lines.findIndex((l, i) => i > start && l.startsWith("### "));

const names = [];
for (let i = start + 1; i < (end === -1 ? lines.length : end); i++) {
  const match = lines[i].match(/^- \[([^\]]+)\]/);
  if (match) names.push({ name: match[1], line: i + 1 });
}

if (names.length === 0) {
  console.error("Found no project entries under '### Projects'");
  process.exit(1);
}

const key = (n) => n.toLowerCase();
const problems = [];
for (let i = 1; i < names.length; i++) {
  if (key(names[i].name) < key(names[i - 1].name)) {
    problems.push({ prev: names[i - 1], curr: names[i] });
  }
}

if (problems.length > 0) {
  console.error("Projects list is not in alphabetical order:\n");
  for (const p of problems) {
    console.error(
      `  "${p.curr.name}" (line ${p.curr.line}) should come before "${p.prev.name}" (line ${p.prev.line})`
    );
  }
  console.error(`\n${problems.length} entry/entries out of order.`);
  process.exit(1);
}

console.log(`Projects list is in alphabetical order (${names.length} entries).`);
