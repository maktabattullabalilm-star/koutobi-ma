---
name: markitdown
description: Use when reading, reviewing, summarizing, or extracting content from PDFs and other office documents. Convert the source with Microsoft MarkItDown before analysis.
---

# Microsoft MarkItDown

For PDFs and supported office documents, convert the source to Markdown before reading or analyzing it:

```bash
/home/ia/.local/share/markitdown/bin/markitdown "<input-file>" > "/tmp/<output-name>.md"
```

Read the resulting Markdown. Keep converted files in `/tmp` unless the user asks to retain them in the project.

If conversion fails, report the failure and use an appropriate fallback only after noting that MarkItDown was attempted.
