# Push duwunkyal-mobile to Tedrick10 GitHub Account

## Step 1: Create the repository on GitHub

1. Log in to **GitHub** with your **Tedrick10** account.
2. Click the **+** (top right) → **New repository**.
3. Set:
   - **Repository name:** `duwunkyal-mobile`
   - **Description:** (optional) e.g. "Duwunkyal mobile app"
   - **Public** (or Private if you prefer).
   - **Do not** check "Add a README file", "Add .gitignore", or "Choose a license" (you already have a local repo).
4. Click **Create repository**.

---

## Step 2: Use the repo in your existing local project

Your project is already a git repo and `origin` is set to Tedrick10. Use these in the project folder:

```bash
# 1. Confirm remote
git remote -v
# Should show: origin  https://github.com/Tedrick10/duwunkyal-mobile.git

# 2. Push your current branch (e.g. feature/api-integrations)
git push -u origin feature/api-integrations

# 3. (Optional) If you want a main branch on GitHub
git checkout -b main
git push -u origin main
```

---

## If you had started from scratch (empty folder)

Only use this when there is **no** existing git repo and **no** code yet:

```bash
echo "# duwunkyal-mobile" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Tedrick10/duwunkyal-mobile.git
git push -u origin main
```

For your current case, **skip this** and follow Step 1 + Step 2 above.
