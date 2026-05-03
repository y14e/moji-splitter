# Moji Splitter

Flexible text splitting utility for CSS animations. Supports complex [line breaking rules](https://en.wikipedia.org/wiki/Line_breaking_rules_in_East_Asian_languages) (ja: 禁則処理).

## Install

```bash
npm i moji-splitter
```

```ts
// npm
import mojiSplitter from 'moji-splitter';

// CDNs
import mojiSplitter from 'https://esm.sh/moji-splitter'
// or
import mojiSplitter from 'https://cdn.jsdelivr.net/npm/moji-splitter/dist/index.js';
// or
import mojiSplitter from 'https://unpkg.com/moji-splitter/dist/index.js';
```

## Usage

```ts
new MojiSplitter(root, options);
// => MojiSplitter
//
// root: HTMLElement
// options (optional): MojiSplitterOptions
```

## 🪄 Options

```ts
interface MojiSplitterOptions {
  concatChar?: boolean;        // default: false
  lineBreakingRules?: boolean; // default: true
  wordSegmenter?: boolean;     // default: false
}
```

### `concatChar`

If `true`, enables concatenation at the character level.

### `lineBreakingRules`

If `false`, disables line breaking rules.

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
- https://y14e.github.io/moji-splitter/
- https://y14e.github.io/moji-splitter/test.html
