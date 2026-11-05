# Omar Faruk, portfolio

Personal site for Omar Faruk, a psychology driven growth product designer. The public pages are a static site. The admin at `/admin` lets Omar add case studies without touching code. It saves the writing and images into this repository through GitHub, and GitHub rebuilds the site.

## How to add a case study

### One time setup

You do this once on your own computer. The token is like a password for saving into this repository. Do not email it, and do not paste it into a file in this repository. The admin keeps it in this browser only.

1. Open [github.com](https://github.com) and sign in as **Ombfaruk**.
2. Click your profile photo (top right), then click **Settings**.
3. Scroll the left sidebar to the bottom and click **Developer settings**.
4. Click **Personal access tokens**, then **Fine-grained tokens**.
5. Click **Generate new token**.
6. Token name: `Portfolio admin`.
7. Expiration: choose **Custom**, then pick a date about one year away.
8. Resource owner: leave your account selected.
9. Repository access: choose **Only select repositories**, then choose **Website**.
10. Under **Permissions**, open **Repository permissions**.
11. Find **Contents** and set it to **Read and write**.
12. Click **Generate token**.
13. Copy the token. GitHub shows it only once. It usually starts with `github_pat_`.

Then open the admin:

1. Go to [https://ombfaruk.github.io/Website/admin/](https://ombfaruk.github.io/Website/admin/).
2. Paste the token into **GitHub token**.
3. Click **Save token**.

If you use another computer later, paste the token there too. If the admin says GitHub did not accept the token, repeat the steps above and paste the new one. To remove the token from this browser, click **Sign out**. That does not delete it on GitHub. To delete it on GitHub, go back to **Fine-grained tokens**, open the token, and delete it.

A classic token with the **repo** scope also works if you already use those. It usually starts with `ghp_`.

### Each new case study

1. Open the [admin](https://ombfaruk.github.io/Website/admin/).
2. Click **New case study**.
3. Drag a cover image onto the box, or click **browse**. A short MP4 video is fine too. Keep each file under 8 MB.
4. Click **Continue**.
5. Fill in the title, the outcome line, the client, your role, the timeline, and any tags. The outcome line is the title on the work grid. Say what changed, for example "From a long form to a first win".
6. Drag final screens into **Final screens**. Drag a row to reorder it, or use **Up** and **Down**. Add a short description for each image.
7. Write the story. Use **Heading**, **Bold**, **Bulleted list**, **Numbered list**, and **Image**. Keep the Context, Problem, Process, and Results headings so the page stays in that order. Final screens show just before Results.
8. Read the **Preview**.
9. Click **Publish**. Click **Save as draft** if you are not ready. Drafts stay off the live site.
10. Wait a few minutes. GitHub rebuilds the site. Then refresh the homepage.

### Change or remove a case study

On the case study list, click **Edit** to change anything, including the cover and the order of the screens. Click **Publish** again when you want it live.

Click **Delete**, then confirm. The page and its images are removed on the next rebuild.

## Put the site online

This repository is private. On the free GitHub plan, GitHub Pages only serves a **public** repository. The workflow file is already here. It builds on every push to `main` and deploys with GitHub Actions.

Do these clicks once:

1. Open [https://github.com/Ombfaruk/Website](https://github.com/Ombfaruk/Website).
2. Click **Settings**.
3. Under **General**, scroll to **Danger zone**.
4. Click **Change visibility** (it may say **Change repository visibility**).
5. Choose **Public** and confirm.
6. Still in **Settings**, click **Pages** in the left sidebar.
7. Under **Build and deployment**, set **Source** to **GitHub Actions**.
8. Click the **Actions** tab, open **Deploy to GitHub Pages**, and click **Re-run jobs** if the last run failed while the repository was private.
9. When the run is green, open [https://ombfaruk.github.io/Website/](https://ombfaruk.github.io/Website/).

The address uses a lowercase user name and the repository name `Website`. After this, every case study you publish updates that address on its own.

## For developers

```bash
npm install
npm run dev
```

The local site is at [http://localhost:4321/Website/](http://localhost:4321/Website/) and the admin is at [http://localhost:4321/Website/admin/](http://localhost:4321/Website/admin/).

```bash
npm test
npm run test:e2e
npm run build
```

Case studies live in `src/content/work/*.md`. Images live in `public/uploads/<slug>/`. The public site reads those files at build time. Drafts (`draft: true`) are not published. New studies added in admin show up in the same templates.
