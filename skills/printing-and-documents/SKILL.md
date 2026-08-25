---
name: printing-and-documents
description: Use for anything involving generated documents — visitor badges, reports, or the printing pipeline. Trigger on requests like "add a field to the badge", "generate a PDF report", "why isn't the printer picking this up", or any change under `apps/documents` / `features/documents`. Pair with `visitor-management` when the document is triggered by a check-in event.
---

# Printing and Documents

How badges and reports are generated and sent to print.

## Step 1: Confirm the generation approach

<!-- TODO: fill in — this determines the rest of the steps -->
- Templating: <!-- e.g. HTML template rendered to PDF via WeasyPrint,
  or a fixed-layout library like ReportLab -->
- Where templates live: <!-- e.g. `apps/documents/templates/` -->
- Print target: <!-- browser print dialog? a networked label/badge
  printer via a print server? -->

## Step 2: Adding or changing a document field

1. Add the field to the template first and confirm layout at the actual
   print size — badge layouts especially break in easy-to-miss ways at
   real dimensions (long names truncating, QR codes overlapping text).
2. Pull the field from the relevant domain model
   (`visitor-management`/`task-management`) rather than duplicating data
   into the document model — the document should read from the source of
   truth, not fork it.
3. Confirm the field doesn't expose data that shouldn't be printed (see
   `security-review` if the document includes any PII beyond name/photo).

## Step 3: Generation flow

1. Generate on-demand at print time rather than pre-generating and
   storing, unless there's a specific requirement to keep a permanent
   record of what was printed <!-- TODO: confirm which applies here -->.
2. If generation can fail (missing required field, template error), fail
   loudly to the user who triggered it — a silent failure at check-in
   means a visitor at the desk with no badge and no error shown to staff.

## Step 4: Test

Render a document with the minimum required fields and with all optional
fields populated, and check the output (not just that generation didn't
throw) — layout bugs don't raise exceptions.

## Common pitfalls

- Hardcoding print dimensions/margins that only work for one printer model.
- Regenerating a badge with live data on reprint when the original
  check-in data should be preserved (e.g. host reassigned after the
  visitor already checked in).
