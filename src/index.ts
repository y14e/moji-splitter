/**
 * Moji Splitter
 * Flexible text splitting utility for CSS animations.
 * Supports complex line breaking rules (ja: Kinsoku shori).
 *
 * @version 1.2.3
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) 2026 Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/moji-splitter}
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MojiSplitterOptions {
  readonly concatChar?: boolean;
  readonly lineBreakingRules?: boolean;
  readonly wordSegmenter?: boolean;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const NOBR_REGEX =
  /[[[\P{scx=Han}]&&[\P{scx=Hang}]&&[\P{scx=Hira}]&&[\P{scx=Kana}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
const LBR_PROHIBIT_START_REGEX =
  /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEX = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/u;
const LBR_INSEPARATABLE_REGEX = /[―‥…]/u;

// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------

export default class MojiSplitter {
  #rootElement: HTMLElement;
  #defaults = {
    concatChar: false,
    lineBreakingRules: true,
    wordSegmenter: false,
  };
  #settings: Required<MojiSplitterOptions>;
  #wordElements: HTMLElement[] | null;
  #charElements: HTMLElement[] | null;
  #original: string | null;
  #fragment: DocumentFragment | null;
  #segmenter: Intl.Segmenter | null;
  #isDestroyed = false;

  constructor(root: HTMLElement, options: MojiSplitterOptions = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
    }

    this.#rootElement = root;
    this.#settings = { ...this.#defaults, ...options };
    this.#wordElements = [];
    this.#charElements = [];
    this.#original = this.#rootElement.innerHTML;
    this.#fragment = new DocumentFragment();
    this.#segmenter = new Intl.Segmenter();
    this.#isDestroyed = false;
    this.#initialize();
  }

  destroy(): void {
    if (this.#isDestroyed) {
      return;
    }

    this.#isDestroyed = true;
    this.#rootElement.removeAttribute('data-moji-splitter-initialized');
    this.#rootElement.innerHTML = this.#original as string;
    const style = this.#rootElement.style;
    style.removeProperty('--word-length');
    style.removeProperty('--char-length');
    this.#cleanup();
  }

  #initialize() {
    const children = this.#rootElement.childNodes;

    if (!this.#fragment) {
      return;
    }

    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i] as Node;
      this.#fragment.appendChild(child.cloneNode(true));
    }

    this.#nobr();
    this.#split('word');
    const { concatChar, lineBreakingRules } = this.#settings;

    if (!concatChar && lineBreakingRules) {
      this.#lbr('word');
    }

    this.#split('char');

    if (concatChar && lineBreakingRules) {
      this.#lbr('char');
    }

    if (!this.#charElements) {
      return;
    }

    for (let i = 0, l = this.#charElements.length; i < l; i++) {
      const char = this.#charElements[i] as HTMLElement;
      char.setAttribute('aria-hidden', 'true');
      char.style.setProperty('--char-index', String(i));
    }

    const spans = this.#fragment.querySelectorAll<HTMLElement>(
      ':is([data-word], [data-char]):not([data-whitespace])',
    );

    for (let i = 0, l = spans.length; i < l; i++) {
      const span = spans[i] as HTMLElement;
      const { style } = span;
      style.setProperty('display', 'inline-block');

      if (
        Array.from(
          (this.#segmenter as Intl.Segmenter).segment(span.textContent),
        ).length > 1
      ) {
        style.setProperty('white-space', 'nowrap');
      }
    }

    if (!this.#wordElements) {
      return;
    }

    for (let i = 0, l = this.#wordElements.length; i < l; i++) {
      const word = this.#wordElements[i] as HTMLElement;
      word.translate = false;
      word.style.setProperty('--word-index', String(i));

      if (!word.hasAttribute('data-whitespace')) {
        const alt = document.createElement('span');
        alt.setAttribute('data-alt', '');
        alt.style.cssText += `
          border: 0;
          clip: rect(0, 0, 0, 0);
          height: 1px;
          margin: -1px;
          overflow: hidden;
          padding: 0;
          position: absolute;
          user-select: none;
          white-space: nowrap;
          width: 1px;
        `;
        alt.textContent = word.textContent;
        word.append(alt);
      }
    }

    this.#rootElement.replaceChildren(...this.#fragment.childNodes);
    const { style } = this.#rootElement;
    style.setProperty('--word-length', String(this.#wordElements.length));
    style.setProperty('--char-length', String(this.#charElements.length));

    const whitespaces = this.#rootElement.querySelectorAll<HTMLElement>(
      ':scope > :not([data-word]) [data-char][data-whitespace]',
    );

    for (let i = 0, l = whitespaces.length; i < l; i++) {
      const whitespace = whitespaces[i] as HTMLElement;

      if (
        window.getComputedStyle(whitespace).getPropertyValue('display') !==
        'inline'
      ) {
        whitespace.innerHTML = '&nbsp;';
      }
    }

    this.#cleanup();
    this.#rootElement.setAttribute('data-moji-splitter-initialized', '');
  }

  #nobr(node = this.#fragment as Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent as string;
      const matches = Array.from(text.matchAll(NOBR_REGEX));

      if (!matches.length) {
        return;
      }

      let index = 0;
      const parent = node.parentNode as Node;

      for (let i = 0, l = matches.length; i < l; i++) {
        const match = matches[i] as RegExpMatchArray;
        const offset = match.index as number;

        if (offset > index) {
          parent.insertBefore(
            document.createTextNode(text.slice(index, offset)),
            node,
          );
        }

        const span = document.createElement('span');
        span.setAttribute('data-_nobr', '');
        const matched = match[0];
        span.textContent = matched;
        parent.insertBefore(span, node);
        index = offset + matched.length;
      }

      if (index < text.length) {
        parent.insertBefore(document.createTextNode(text.slice(index)), node);
      }

      parent.removeChild(node);
    } else if (node.hasChildNodes()) {
      const children = Array.from(node.childNodes);

      for (let i = 0, l = children.length; i < l; i++) {
        this.#nobr(children[i]);
      }
    }
  }

  #split(granularity: 'word' | 'char', node = this.#fragment as Node) {
    const items = (
      granularity === 'word' ? this.#wordElements : this.#charElements
    ) as HTMLElement[];
    const children = Array.from(node.childNodes);

    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i] as ChildNode;
      const text = child.textContent as string;

      if (child.nodeType === Node.TEXT_NODE) {
        const parent = child.parentNode;
        const segmenter = this.#getSegmenter(
          granularity,
          parent,
        ) as Intl.Segmenter;
        const segments = Array.from(
          segmenter.segment(
            text.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '),
          ),
        );

        for (let j = 0, m = segments.length; j < m; j++) {
          const segment = segments[j] as Intl.SegmentData;
          const span = document.createElement('span');
          const text = segment.segment;
          const types = [
            granularity,
            segment.segment.charCodeAt(0) === 32 && 'whitespace',
          ].filter(Boolean);

          for (let k = 0, n = types.length; k < n; k++) {
            const type = types[k];
            span.setAttribute(
              `data-${type}`,
              type !== 'whitespace' ? text : '',
            );
          }

          span.textContent = text;
          items.push(span);
          child.before(span);
        }

        child.remove();
      } else if (
        granularity === 'word' &&
        child.nodeType === Node.ELEMENT_NODE &&
        child instanceof HTMLElement &&
        child.hasAttribute('data-_nobr')
      ) {
        child.removeAttribute('data-_nobr');
        child.setAttribute('data-word', text);
        items.push(child);
      } else if (child.hasChildNodes()) {
        this.#split(granularity, child);
      }
    }
  }

  #lbr(granularity: 'word' | 'char') {
    const items = (
      granularity === 'word' ? this.#wordElements : this.#charElements
    ) as HTMLElement[];
    let previous: HTMLElement | null = null;

    for (let i = 0, l = items.length; i < l; i++) {
      const item = items[i];

      if (!item) {
        continue;
      }

      const text = item.textContent;
      const segment = Array.from(
        (this.#segmenter as Intl.Segmenter).segment(text),
      ).shift() as Intl.SegmentData;

      if (
        previous &&
        previous.textContent.trim() !== '' &&
        LBR_PROHIBIT_START_REGEX.test(segment.segment)
      ) {
        previous.textContent += text;
        previous.setAttribute(`data-${granularity}`, previous.textContent);
        item.remove();
        items.splice(i, 1);
        i--;
      } else {
        previous = item;
      }
    }

    function concat(item: HTMLElement, regex: RegExp, index: number) {
      const offset = index + 1;
      let next = items[offset];
      let text: string;

      while (next && regex.test(next.textContent)) {
        text = next.textContent;
        item.textContent += text;
        item.setAttribute(`data-${granularity}`, item.textContent);
        next.remove();
        items.splice(offset, 1);
        next = items[offset];
      }
    }

    for (let i = 0, l = items.length; i < l; i++) {
      const item = items[i];

      if (item && LBR_PROHIBIT_END_REGEX.test(item.textContent)) {
        concat(item, LBR_PROHIBIT_END_REGEX, i);
        const next = items[i + 1] as HTMLElement;
        const text = next.textContent;

        if (next && text.trim() !== '') {
          next.textContent = item.textContent + text;
          next.setAttribute(`data-${granularity}`, next.textContent);
          item.remove();
          items.splice(i, 1);
        }
      }
    }

    for (let i = 0, l = items.length; i < l; i++) {
      const item = items[i];

      if (item && LBR_INSEPARATABLE_REGEX.test(item.textContent)) {
        concat(item, LBR_INSEPARATABLE_REGEX, i);
      }
    }

    if (granularity === 'char') {
      const spans = this.#fragment?.querySelectorAll(
        '[data-word]:not([data-whitespace])',
      ) as NodeListOf<HTMLElement>;

      for (let i = 0, l = spans.length; i < l; i++) {
        const span = spans[i] as HTMLElement;
        const text = span.textContent;

        if (text !== '') {
          span.setAttribute('data-word', text);
        } else {
          span.remove();
        }
      }
    }
  }

  #cleanup() {
    this.#wordElements = null;
    this.#charElements = null;
    this.#original = null;
    this.#fragment = null;
    this.#segmenter = null;
  }

  #getSegmenter(granularity: 'word' | 'char', parent: Node | null) {
    if (granularity === 'word' && this.#settings.wordSegmenter) {
      const root = (
        parent?.nodeType === Node.ELEMENT_NODE ? parent : this.#rootElement
      ) as HTMLElement;
      const closest: HTMLElement | null = root.closest('[lang]');

      return new Intl.Segmenter(
        closest?.lang || document.documentElement.lang || 'en',
        {
          granularity: 'word',
        },
      );
    } else {
      return this.#segmenter;
    }
  }
}
