<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Christmas Party menu, validation and exports in dedicated party modules; the draft remains separate from the Christmas Day app.
- Validate party orders with the shared Zod schema on both client and server, and derive totals server-side to prevent forged booking values.
- Persist party records in preorders with event_type and service_date; filter staff queries by event_type so legacy Christmas Day records are never overwritten or mixed.
- Keep the existing staff passcode exclusively in STAFF_PASSCODE on the server; never embed credentials in source or browser storage.
- Generate PDFs before the native share click and share files only; saving is independent of platform sharing support.
