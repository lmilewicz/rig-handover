---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries the shape in "Issue shape" below (approved by the human, 2026-11-16).
   Ask the human only if this plan needs something the shape doesn't cover.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.
   Check each issue (title, first line, blocked-by) with `gh issue view` before any worker starts.

## Issue shape

- **Label:** `plan:<plan>` from the plan's frontmatter, e.g. `plan:morning-digest`
  (`gh label create` it first if it doesn't exist).
- **Title:** short, names the thing built, e.g. `Digest page: GET /digest/:night`.
- **Body**, in this order:

  ```md
  Source: plan.md § <section>          ← first line, exactly; section as the plan numbers it (1, 2a, …)

  ## Scope
  <what to build, from the plan; constraints from AGENTS.md, the styleguide and ADRs that apply>

  ## Done when
  <the plan's "Done when", checkable>

  ## Blocked by
  <#n of real issues, or —; say "can start against #n, closes only once #m is in" when that differs>
  ```

- A step that ends in someone else's look (a review, a reply) is not done when sent. Its "Done
  when" is their look, and the issue stays open until then; what follows it (clean-up) is blocked
  by it.
- Create issues one call per issue with literal titles and body files. Don't loop over a shell
  array: zsh arrays start at 1 and bash at 0, so titles and bodies shift.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
