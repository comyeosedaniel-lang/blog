---
title: Hello, and welcome
description: An example post for the mylineal blog, showing the frontmatter and markdown you'll use for real posts.
pubDate: 2026-07-25
category: dev
tags: [example, guide]
---

This is an **example post**. Once you're ready to write for real, delete or overwrite this file.

## Writing a new post

Drop a markdown (`.md`) file into `src/content/blog/en/` and it becomes a new post. Start each file with frontmatter like this:

```md
---
title: Post title
description: A one or two line summary shown in the list and search results
pubDate: 2026-07-25
tags: [tag1, tag2]
draft: false
---
```

- Set `draft: true` to keep a post out of the deployed site while still previewing it locally (`npm run dev`).
- `tags` and `updatedDate` are optional.

## A quick markdown preview

Blockquotes look like this:

> Write first, edit later.

Numbered lists work,

1. First item
2. Second item
3. Third item

and so do code blocks.

```js
function hello() {
  console.log('hello, mylineal');
}
```

When you're ready, delete this example and start your first real post.
