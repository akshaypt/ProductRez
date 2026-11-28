# Brief: redesign the ProductRez resume upload screen

Deliverable: one self-contained `design/upload-screen-redesign.html` (no build step, inline CSS, dark theme, works at 1440px and 390px), plus a desktop and a mobile screenshot of it. Do not touch app code. The owner approves the design before it is built.

## What the screen is
The signed-in "PM Resume Score" page, shown before a resume is uploaded. Today it is: a title, one grey sentence, a thin info bar ("Your account keeps one resume check. A new upload replaces Akshay_Pramod_Teli_Resume.pdf. Cancel"), a large empty dashed drop box with an upload arrow, a flat dark-orange "Review my resume" button, and two small grey legal lines. It reads as a plain form, not a product.

## Must keep (content and behaviour)
- Title "PM Resume Score" and the idea: rated the way a PM hiring manager reads (impact, ownership, product craft, clarity, ATS safety); the file is read in the browser.
- Upload by drop or click; PDF or DOCX, up to 5 MB.
- The notice that one resume is kept per account and a new upload replaces the current file, with a Cancel.
- "Review my resume" primary action (disabled until a file is chosen).
- Consent line linking Terms and Privacy Policy; the disclaimer that scores are a diagnostic, not a guarantee, and that the parsed resume and score are saved, never the file.
- Three pickers appear after upload: target level, PM focus, company type (plus currency). Show where they will appear, collapsed or as a preview.

## Direction
- Make the first view feel like the start of a review, not a form. Show what the user will get back (a score ring, five dimension bars, pay range, top fixes) as a quiet preview, so the upload has a reason.
- Real hierarchy: one clear focal point (the drop target), generous spacing, a considered type scale.
- Dark, warm accent (the current orange) used sparingly.
- No left-edge colour stripes on cards, no gradient blobs, no emoji, no generic icon-in-circle rows, no glassmorphism.
- Empty, drag-over, file-chosen and "replacing current resume" states each shown.
- Accessible: visible focus, 4.5:1 text contrast, tap targets of 44px on mobile.

## Report back
The HTML path, the two screenshots, and three sentences on the key choices.
