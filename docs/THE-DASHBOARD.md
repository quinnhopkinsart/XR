# The dashboard

`xr.noodin.studio/admin` shows and hides works and edits their text. It works from a phone.

## How it works

The site has no database. Each work's text, status and hidden flag live in `src/projects/<slug>/content.json`, and the home intro lives in `src/brand/copy.json`. The dashboard reads those files from GitHub, and Publish writes every pending edit back as one commit on `main`. Amplify builds that commit, so an edit is live about three minutes after Publish. The status line at the top says when.

`npm run check` runs before every build. If an edit breaks a rule (a missing title, say), the build fails and the live site stays on the earlier version. The dashboard checks the same rules before it lets you publish, through `contentProblems` in `src/projects/schema.js`.

## Signing in

The dashboard needs a GitHub token, made once per browser:

1. GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
2. Repository access: Only select repositories, then `quinnhopkinsart/XR`.
3. Permissions, Repository permissions, Contents: Read and write. Nothing else.
4. Pick an expiry, generate, and paste the token into the dashboard.

The token is kept in that browser's localStorage and is sent only to `api.github.com`. Sign out removes it. Anyone can open `/admin`, but it does nothing without a token. If a token leaks, revoke it on the same GitHub page.

## What it edits

- Shown or Hidden: the `hidden` flag. A hidden work is off the home grid, the filters and the floating background. Its page still opens at `/xr/<slug>`.
- Edit text: title, year, status, order, venue, location, summary, description, how to try it, the note under the embed, the events line, credits, the cover's alt text and tags.
- Site text: the home intro.

Images, targets and their labels, launch settings, categories, awards and 3D models stay in `project.js`. New works are still scaffolded with `npm run new`.

## When something goes wrong

- "These files changed on GitHub since you opened the dashboard": someone, or a merged pull request, edited the same file. Reload and redo the edit.
- "The rebuild has not finished after twelve minutes": open the app in AWS Amplify and read the failed build's log.
- To undo a published edit, revert its commit on GitHub (the status line links to it), or edit the text back and publish again.

## Where the code is

`src/admin/`: `Admin.jsx` (the page), `github.js` (the GitHub calls), `admin.css`. The repository and branch are `site.repo` in `src/brand/site.js`. `vite.config.js` writes `/build.json` with the commit Amplify built (`AWS_COMMIT_ID`), which is how the dashboard knows an edit is live.
