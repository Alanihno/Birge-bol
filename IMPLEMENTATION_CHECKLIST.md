# Release verification

| Workstream | State | Evidence |
|---|---|---|
| Username registration and recovery | Implemented; live backend test passed | account-access / shared/account-identity; Auth HTTP 201/200, recovery 200, old sessions revoked |
| Existing email accounts | Preserved; delivery not certified | Auth logged mail.send; Resend credentials/control plane unavailable |
| Push delivery runtime | Configured; physical device pending | Vault, minute cron, dispatcher v2, public configuration, device test button |
| Event notifications | Hosted SQL passed | booking/payment/tasks/messages and private queue SQL |
| Mama Pro official brand | Implemented | source PDF page 4; original symbol/wordmark rendering |
| Specialist cards and rating details | Implemented | compact card / rating-summary |
| Clinic tabs, accordion and scrolling | Implemented | clinic-profile; before/after audit |
| Graph navigation | Implemented | responsive related-node layout |
| Article reading | Implemented | accessible dialog + browser back |
| YouTube links | Implemented | canonical URL, direct parent link |
| RU/KK copy | Browser checks passed | central local dictionary |
| Cache/update safety | Regression tests passed | existing cache recovery and PWA suites |
| Removal of task texts and archives | Raw tasks removed; archive scan recorded separately | original instructions excluded from product handoff |

Telegram integrations, new catalogue specialists and A3 remain excluded by the user. Backend tests use isolated fixtures and rollback. Final acceptance details belong in FINAL_FIXES_REPORT.md.
