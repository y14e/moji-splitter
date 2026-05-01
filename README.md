# Text Splitter

Flexible text splitting utility for CSS animations. Supports complex line breaking rules.

## Install

```bash
npm i @y14e/text-splitter
```

```ts
// npm
import textSplitter from '@y14e/text-splitter';

// CDNs
import textSplitter from 'https://esm.sh/@y14e/text-splitter'
// or
import textSplitter from 'https://cdn.jsdelivr.net/npm/@y14e/text-splitter/+esm';
// or
import textSplitter from 'https://unpkg.com/@y14e/text-splitter/dist/index.js';
```

## Usage

```ts
new TextSplitter(root, options);
// => TextSplitter
//
// root: HTMLElement
// options (optional): TextSplitterOptions
```

## 🪄 Options

```ts
interface TextSplitterOptions {
  concatChar?: boolean;        // default: false
  lineBreakingRules?: boolean; // default: true
  wordSegmenter?: boolean;     // default: false
}
```

### `concatChar`

If `true`, enables concatenation at the character level.

### `lineBreakingRules`

If `false`, disables [line breaking rules](https://en.wikipedia.org/wiki/Line_breaking_rules_in_East_Asian_languages).

### `wordSegmenter`

If `true`, uses `Intl.Segmenter` with the `{ granularity: 'word' }` option; useful for CJK (Chinese, Japanese, and Korean) text.

## 📦 APIs

### `destroy`

Destroys the instance and restores the original DOM state.

```ts
splitter.destroy();
// => void
```

## Demo
- https://y14e.github.io/text-splitter/
- https://y14e.github.io/text-splitter/test.html
