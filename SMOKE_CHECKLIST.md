# Scoped Hybrid Auto-Close Trial Checklist

_Created: June 21, 2026_

1. Purpose

   This checklist documents the scoped hybrid auto-close flip for the Davis/tiny-cohort trial. The change allows production auto-close only for users with confirmed hybrid access while keeping the broad passive close kill switch off.

2. Change Summary

   1. File changed: `public/ct-widget.js`
   2. Branch: `chore/scoped-hybrid-auto-close-trial`
   3. PR: `https://github.com/Davisopp13/Meridian/pull/7`
   4. Broad passive close remains disabled: `PASSIVE_CLOSE_LIVE = false`
   5. Scoped hybrid auto-close is enabled: `HYBRID_AUTO_CLOSE_LIVE = true`
   6. Production auto-close remains gated by confirmed hybrid access:

      ```js
      PASSIVE_CLOSE_LIVE === true || (HYBRID_AUTO_CLOSE_LIVE === true && state.hybridAccessConfirmed === true)
      ```

3. Containment Checklist

   1. [x] Broad passive auto-close kill switch remains off.
   2. [x] Scoped hybrid auto-close is enabled only through `HYBRID_AUTO_CLOSE_LIVE`.
   3. [x] Auto-close production writes still require `state.hybridAccessConfirmed === true`.
   4. [x] Users without confirmed hybrid access do not enter the live auto-close path through this flip.
   5. [x] Existing shadow outcome detection remains available for observation and review.
   6. [x] No Supabase migration was added or applied for this change.
   7. [x] No relay, dashboard, MPL, or Supabase client code was changed.

4. Validation Checklist

   1. [x] `node --check public/ct-widget.js`
   2. [x] `npm run build`
   3. [x] Build completed without new failures.
   4. [x] Existing warnings only:
      1. `xlsx` dynamic import warning.
      2. Large chunk-size warning.

5. Deployment Checklist

   1. [x] Branch pushed to GitHub.
   2. [x] Draft PR opened for review.
   3. [ ] Human review complete.
   4. [ ] PR approved.
   5. [ ] PR merged.
   6. [ ] Deployment completed.
   7. [ ] Post-deploy smoke test completed with Davis/tiny-cohort user.

6. Post-Deploy Smoke Test

   Use a hybrid-access-confirmed tester.

   1. [ ] Confirm the broad non-hybrid bookmarklet remains manual-first.
   2. [ ] Confirm hybrid trial access is detected for the scoped tester.
   3. [ ] Open an eligible active CT case.
   4. [ ] Trigger a high-confidence or medium-confidence passive close scenario.
   5. [ ] Confirm the case closes only for the scoped hybrid tester.
   6. [ ] Confirm activity stats update as expected.
   7. [ ] Confirm duplicate production close rows are not created.
   8. [ ] Confirm a non-scoped or access-revoked user does not auto-close.
   9. [ ] Confirm the Complete-during-reclassification guard holds: `reclass_in_progress_at_complete` prevents unsafe passive auto-close while reclassification is still in progress.
   10. [ ] Review admin/passive testing data for unexpected blockers or false positives.

7. Rollback Checklist

   If the trial shows unsafe behavior, revert the scoped flip:

   ```js
   var PASSIVE_CLOSE_LIVE = false;
   var HYBRID_AUTO_CLOSE_LIVE = false;
   ```

   1. [ ] Run `node --check public/ct-widget.js`.
   2. [ ] Run `npm run build`.
   3. [ ] Deploy rollback.
   4. [ ] Confirm hybrid testers return to shadow/review behavior without production auto-close.
   5. [ ] Review any production rows created during the trial window.

8. Notes

   1. This is not a broad rollout.
   2. This does not change the broad passive close kill switch.
   3. This does not apply migrations.
   4. This does not modify Supabase RLS, RPCs, or tables.
   5. This does not deploy by itself; deployment remains a separate step after review and merge.
