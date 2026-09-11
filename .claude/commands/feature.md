Run the full feature pipeline for: $ARGUMENTS

Follow these stages in order. Do not skip the approval gate.

## 1. Spec
Use the **product-manager** subagent to turn the request into GitHub issue(s)
with acceptance criteria.

## 2. Approval gate — STOP HERE
Show me:
- each issue number, title, and URL
- the acceptance criteria
- which issues are safe to build in parallel vs. sequential, and why

Wait for my explicit "go". Do not proceed until I approve. I may edit the issues
or tell you to re-run the PM first.

## 3. Implementation (parallel)
After approval, for each approved issue, spawn an **engineer** subagent with
git worktree isolation (`isolation: "worktree"`), one subagent per issue. Run
the ones the PM marked parallel-safe concurrently; run the rest in sequence.
Pass each engineer exactly one issue number and nothing else.

## 4. Verification
Once a PR is open for an issue, use the **quality-engineer** subagent on that
PR number.

## 5. Rework loop
For any PR the QE returns as CHANGES REQUESTED, re-invoke the **engineer**
subagent for that same issue with the review feedback. Then re-run the
**quality-engineer** on it. Maximum 2 rework rounds per PR; if it still fails,
stop and escalate that PR to me with a summary.

## 6. Report
When every PR is either QE-approved or escalated, give me a table: issue,
PR link, QE verdict, rework rounds used, and anything unresolved. Leave all
PRs as drafts — I do the final review and merge.
