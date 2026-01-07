# Deployment Guide (Vercel)

This project is built with Next.js and designed to be deployed on Vercel.

## 1. Prerequisites

- A GitHub account.
- A Vercel account (https://vercel.com).
- The project pushed to a GitHub repository (done).

## 2. Deploy to Vercel

1.  Log in to your Vercel Dashboard.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your GitHub repository: `FamyXLyecdd/Tracker`.
4.  Vercel will auto-detect Next.js.

## 3. Environment Variables (Critical!)

You MUST set the following environment variables in the Vercel Project Settings > Environment Variables:

| Variable Name | Description | Default (if unset) |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | Password to access the dashboard | `pilot2024` |
| `JWT_SECRET` | Secret key for login tokens (generate an ugly random string) | `pilot-tracker-secret...` |

**Recommended:** Generate a strong random string for `JWT_SECRET` (e.g., `openssl rand -hex 32` or just mash your keyboard).

## 4. Deploy

- Click **Deploy**.
- Wait for the build to finish (green checkmark).
- Your tracker is now live at `https://tracker-three.vercel.app` (or similar).

## 5. Updates

Whenever you want to update the site:
1.  User `git push` from your terminal.
2.  Vercel will automatically redeploy the new version.
