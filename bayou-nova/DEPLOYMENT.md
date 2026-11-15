# Deploying BAYOU-NOVA to Vercel

No database, no authentication, no environment variables. The app runs entirely from local JSON.

## 1. Check locally (2 minutes)
```bash
npm ci
npm run test:logic     # 53 checks passed
npm run build          # must finish without errors
```

## 2. Push to GitHub
1. On github.com click **New repository**. Name it `bayou-nova`. Leave "Add a README", .gitignore and licence **unticked** (the project already has them).
2. In the project folder (the one containing `package.json`):
```bash
git init
git add .
git commit -m "BAYOU-NOVA: Phase 8 final polish"
git branch -M main
git remote add origin https://github.com/<your-username>/bayou-nova.git
git push -u origin main
```
`node_modules`, `.next` and `.env*.local` are already ignored.

## 3. Connect to Vercel
1. Go to vercel.com, sign in with GitHub, click **Add New... > Project**.
2. Pick `bayou-nova` (use **Adjust GitHub App Permissions** if it is not listed) and click **Import**.
3. Leave the settings as detected: Framework **Next.js**, Root Directory `./`, Build `next build`, Install `npm install`.

## 4. Environment variables
None to set. Leave the section empty.
(The site's social-preview address uses `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel supplies itself.)
If you add Supabase later, add its keys here then.

## 5. Deploy
Click **Deploy**. The first build takes about a minute. Every later `git push` to `main` redeploys automatically.

## 6. Confirm the live URL
Open the `*.vercel.app` address and check:
- [ ] Welcome screen shows the tagline, workflow banner and two profile buttons
- [ ] "Alert profile" opens the dashboard; status reads **Investigate**; the experimental label is visible
- [ ] Switch A-104 / B-209 in the side rail (or top bar on a phone)
- [ ] Early detection > "How the picture built up" shows amber from Mission Day 22, orange from Day 26
- [ ] Daily Check-In lists PHQ-9 and GAD-7 with the flight surgeon note
- [ ] Crew page opens with the privacy note
- [ ] Refresh `/dashboard` directly: it should load (not 404)
- [ ] Open it on a phone

## Troubleshooting
- **Build fails with a type or lint error:** run `npm run build` locally; it fails the same way.
- **Wrong Node version:** Project Settings > General > Node.js Version > 20.x.
- **404 on a page:** confirm the Root Directory is the folder that contains `package.json`.
- **Demo looks stale after a change:** the demo session lives in the browser. Use "Reset demo session" on the Daily Check-In page.
