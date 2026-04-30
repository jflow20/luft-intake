# Luft Intake — Setup Instructions

## What you have
A fully offline PWA (Progressive Web App) that installs on your iPad like a native app.
Once installed it never needs internet. All jobs are saved on the device.

---

## Step 1 — Create a free GitHub account

1. Go to https://github.com
2. Click "Sign up" — use any email
3. Choose the free plan
4. Verify your email

---

## Step 2 — Create a new repository

1. Once logged in, click the green "New" button (top left)
2. Name it exactly: `luft-intake`
3. Make sure "Public" is selected
4. Check the box "Add a README file"
5. Click "Create repository"

---

## Step 3 — Upload the app files

1. Inside your new repository, click "Add file" → "Upload files"
2. Upload ALL files from the luft-intake folder:
   - index.html
   - app.js
   - style.css
   - manifest.json
   - sw.js
   - icons/icon-192.png
   - icons/icon-512.png
   
   (For the icons folder: upload the two .png files, GitHub will create the folder)

3. Scroll down, click "Commit changes"

---

## Step 4 — Enable GitHub Pages

1. In your repository, click "Settings" (top tab)
2. Click "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Under "Branch", select "main" and "/ (root)"
5. Click Save
6. Wait about 60 seconds, then refresh the page
7. You will see a green box with your URL:
   `https://yourusername.github.io/luft-intake`

---

## Step 5 — Install on iPad

1. Open Safari on your iPad (must be Safari, not Chrome)
2. Go to your GitHub Pages URL
3. Tap the Share button (the box with the arrow pointing up)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add"

The Luft Intake icon will appear on your home screen.
Open it — it will load once from the internet and then cache everything.
From that point forward it works completely offline.

---

## Using the app

- Tap a job to open and edit it anytime
- Tap "Save" to save your progress
- Tap "PDF" to generate and download the PDF — the job stays saved
- Tap Delete on the job list to permanently remove a job
- All drawings, dimensions, and notes are preserved when you reopen a job

---

## Making updates

If Luft Intake gets updated in the future, you just replace the files on GitHub
using the same upload process. The app will update next time you open it with internet.

---

## Troubleshooting

**App not working offline:** Make sure you opened it in Safari and used
"Add to Home Screen". Chrome on iPad does not support PWA offline caching.

**Jobs disappeared:** This can happen if you clear Safari's website data in
Settings > Safari > Clear History and Website Data. Always export PDFs for
important jobs as your backup.

**PDF not downloading:** On iPad, the PDF opens in a new tab. Tap the Share
button in Safari to save it to Files or email it.
