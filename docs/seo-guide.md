# SEO Guide — Where to Add Future SEO Content

> **Requirements**: 22.2, 22.3  
> **Status**: Full SEO optimization is **out of scope** for the current build. This guide documents where to plug in content when the time comes.

## Current SEO State (What's Already in Place)

The current build includes the minimum viable SEO setup:

- **Page title** and **`<meta name="description">`** in `src/layouts/Layout.astro`
- **Static Astro shell** that ships zero client JS for non-interactive content, making it fully crawlable
- **Semantic HTML structure** in shell components (Header, Hero, Footer)
- **`SeoContentSlots.astro`** — a dedicated Astro component that already exists at `src/components/SeoContentSlots.astro` as a placeholder for future SEO content blocks

---

## Where to Add FAQ Content

### File: `src/components/SeoContentSlots.astro`

This component is already mounted in `src/pages/index.astro` below the calculator island. It currently renders nothing (or minimal placeholder content). Add FAQ entries here.

**Recommended format** — use `application/ld+json` structured data alongside visible HTML:

```astro
---
// src/components/SeoContentSlots.astro
const faqs = [
  {
    question: "How is SEE GPA calculated?",
    answer: "The NEB SEE GPA is calculated by converting marks to percentages, mapping each percentage to a grade band, and computing a credit-hour-weighted average of subject grade points."
  },
  {
    question: "What is the passing GPA for SEE?",
    answer: "There is no single passing GPA — each subject must individually pass its theory and practical thresholds. The minimum overall GPA for +2 Science is 2.0; for Management and Humanities it is 1.6."
  },
  // Add more entries here
];
---

<!-- Visible FAQ section -->
<section aria-labelledby="faq-heading">
  <h2 id="faq-heading">Frequently Asked Questions</h2>
  {faqs.map(({ question, answer }) => (
    <details>
      <summary>{question}</summary>
      <p>{answer}</p>
    </details>
  ))}
</section>

<!-- FAQ structured data for search engines -->
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(({ question, answer }) => ({
    "@type": "Question",
    "name": question,
    "acceptedAnswer": { "@type": "Answer", "text": answer }
  }))
})} />
```

**Suggested FAQ topics** to cover:
- How NEB SEE GPA is calculated (methodology explanation for students)
- What NG means and how to avoid it
- Computer Science 50/50 split explanation
- +2 stream eligibility requirements
- Difference between grade-based and marks-based GPA calculation
- What "Estimated" means in Plan Mode

---

## Where to Add How-To Content

### Option A — Static section in `src/components/SeoContentSlots.astro`

How-to content (step-by-step guides) can be added in the same component as the FAQ content. Use `HowTo` structured data for search engines:

```astro
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to calculate your SEE GPA",
  "step": [
    { "@type": "HowToStep", "text": "Enter your theory grade for each subject." },
    { "@type": "HowToStep", "text": "Enter your practical grade (defaults to A+)." },
    { "@type": "HowToStep", "text": "Read your GPA in the result banner." }
  ]
})} />
```

### Option B — Dedicated Astro content pages

For longer how-to articles, create pages under `src/pages/` (e.g., `src/pages/how-to-calculate-see-gpa.astro`). These are served as static HTML with zero JavaScript, which is ideal for SEO.

Use Astro's Content Collections (`src/content/`) for managing multiple articles if the content library grows.

---

## Open Graph and Social Meta Tags

Add these to the `<head>` in `src/layouts/Layout.astro`:

```astro
<!-- Open Graph -->
<meta property="og:title" content="SEE GPA Calculator — NEB Grade Point Average" />
<meta property="og:description" content="Calculate your NEB SEE GPA from grades or raw marks. Check +2 eligibility for Science, Management, and Humanities." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://yourdomain.com" />
<meta property="og:image" content="https://yourdomain.com/og-image.png" />

<!-- Twitter / X Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="SEE GPA Calculator" />
<meta name="twitter:description" content="Official NEB methodology. Calculate GPA, plan target grades, check +2 eligibility." />
```

---

## Canonical URL

Add a canonical tag to prevent duplicate-content issues if the site is ever served under multiple URLs:

```astro
<!-- In src/layouts/Layout.astro -->
<link rel="canonical" href={Astro.url.href} />
```

Or as a static value if the site always lives at one URL:

```astro
<link rel="canonical" href="https://yourdomain.com/" />
```

---

## Sitemap and Robots

Astro has a built-in sitemap integration. When you are ready:

```sh
npx astro add sitemap
```

Then add `site` to `astro.config.mjs`:

```js
export default defineConfig({
  site: "https://yourdomain.com",
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

A `robots.txt` can be placed in `public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap-index.xml
```

---

## Target Keywords to Consider

Based on what this tool does, these are natural target terms:

| Intent | Keyword ideas |
|--------|--------------|
| Primary | "SEE GPA calculator Nepal", "NEB GPA calculator", "SEE grade point average" |
| Secondary | "how to calculate SEE GPA", "SEE GPA from marks", "NEB SEE grading scale" |
| +2 eligibility | "SEE eligibility for science stream", "class 10 NEB +2 eligibility check" |
| Plan mode angle | "what grades do I need for SEE GPA 3.6" |

These terms should appear naturally in visible page content, the `<title>`, `<meta description>`, and FAQ answers — not stuffed artificially.

---

## What Is Out of Scope for the Current Build

Per Requirement 22.3, these items are intentionally deferred:

- Full FAQ and How-To content writing
- Open Graph image creation
- Structured data implementation beyond basic page meta
- Content pages / blog articles
- Sitemap generation
- Link-building or off-page SEO
- Page speed audit and Core Web Vitals tuning
- Keyword research and competitive analysis

The architecture is ready for all of these — they just need content and configuration wired in.
