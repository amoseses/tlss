# Cleanup Summary

## Files to Remove (via Git CLI)

Run these commands to clean up unnecessary Replit and backup files:

```bash
git rm .replit
git rm .replitignore
git rm replit.md
git rm -r .migration-backup
git rm -r attached_assets
git commit -m "chore: Remove Replit config and backup files"
```

## Explanation

- **`.replit`** - Replit-specific configuration, not needed for production
- **`.replitignore`** - Replit-specific ignore file
- **`replit.md`** - Replit documentation, replace with proper project docs
- **`.migration-backup/`** - Old backup directory, no longer needed
- **`attached_assets/`** - Temporary assets directory, can be removed

## What to Keep

- `.npmrc` - npm configuration (keep)
- `pnpm-workspace.yaml` - pnpm workspace config (keep)
- `tsconfig.*.json` - TypeScript configs (keep)
- `vercel.json` - Vercel deployment config (keep, or update)
- `package.json` / `pnpm-lock.yaml` - Dependencies (keep)
