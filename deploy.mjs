// One-command deploy for the Press/Priority tracker.
//   node deploy.mjs            → build + test + copy dist/index.html to root, show status (NO push)
//   node deploy.mjs --push     → same, then commit + push to origin/main (GitHub Pages redeploys)
// GitHub Pages serves root index.html from main. User training data lives in the phone's
// localStorage (key pp-tracker-v3), so redeploys never touch it.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const PUSH = process.argv.includes("--push");
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const cap = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

try {
  console.log("→ Building…");
  run("npm run build");

  console.log("→ Testing…");
  run("npm test"); // throws (non-zero exit) if the smoke suite fails → deploy aborts

  if (!existsSync("dist/index.html")) throw new Error("dist/index.html missing after build");
  copyFileSync("dist/index.html", "index.html");
  console.log("→ Copied dist/index.html → index.html (the file GitHub Pages serves)");

  if (!PUSH) {
    console.log("\n✓ Build + tests pass. Staged the new index.html locally.");
    console.log("  Review, then run:  node deploy.mjs --push   (or: npm run deploy -- --push)");
    console.log("\nGit status:");
    run("git status --short");
    process.exit(0);
  }

  console.log("→ Committing + pushing…");
  run("git add index.html src docs test.mjs build.mjs package.json package-lock.json CLAUDE.md README.md deploy.mjs .gitignore");
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  run(`git commit -m "deploy: ${stamp}"`);
  run("git push origin main");
  const pages = "https://bjoliveira8.github.io/Workout-Plan/";
  console.log(`\n✓ Pushed. GitHub Pages will redeploy in ~1 min: ${pages}`);
  console.log("  On the phone: pull-to-refresh the home-screen app to pick up the new version.");
  console.log("  Last commit:", cap("git log -1 --oneline"));
} catch (e) {
  console.error("\n✗ Deploy aborted:", e.message);
  process.exit(1);
}
