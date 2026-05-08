/**
 * Moji Splitter
 * Flexible text splitting utility for CSS animations.
 * Supports complex line breaking rules (ja: Kinsoku shori).
 *
 * @version 1.4.0
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
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
  #wordElements: HTMLElement[] = [];
  #charElements: HTMLElement[] = [];
  #original: string | null;
  #fragment: DocumentFragment | null = new DocumentFragment();
  #segmenter: Intl.Segmenter | null = new Intl.Segmenter();
  #isDestroyed = false;

  constructor(root: HTMLElement, options: MojiSplitterOptions = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
    }

    this.#rootElement = root;
    this.#settings = { ...this.#defaults, ...options };
    this.#original = this.#rootElement.innerHTML;
    this.#initialize();
  }

  destroy() {
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
    this.#original = null;
  }

  #initialize() {
    const children = this.#rootElement.childNodes;

    if (!this.#fragment) {
      throw new Error('Unreachable');
    }

    for (let i = 0, l = children.length; i < l; i++) {
      this.#fragment.appendChild((children[i] as Node).cloneNode(true));
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
        ).length
      ) {
        style.setProperty('white-space', 'nowrap');
      }
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

  #nobr(node: Node = this.#fragment as Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;

      if (!text || !NOBR_REGEX.test(text)) {
        return;
      }

      NOBR_REGEX.lastIndex = 0;
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();

      for (const match of text.matchAll(NOBR_REGEX)) {
        const index = match.index as number;

        if (index > lastIndex) {
          fragment.append(text.slice(lastIndex, index));
        }

        const span = document.createElement('span');
        span.setAttribute('data-_nobr', '');
        const matched = match[0];
        span.textContent = matched;
        fragment.append(span);
        lastIndex = index + matched.length;
      }

      if (lastIndex < text.length) {
        fragment.append(text.slice(lastIndex));
      }

      (node as ChildNode).replaceWith(fragment);
      return;
    }

    for (let child = node.firstChild; child; ) {
      const next = child.nextSibling;
      this.#nobr(child);
      child = next;
    }
  }

  #split(granularity: 'word' | 'char', node: Node = this.#fragment as Node) {
    const items =
      granularity === 'word' ? this.#wordElements : this.#charElements;

    for (let child = node.firstChild; child; ) {
      const next = child.nextSibling;

      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();

        for (const segment of (
          this.#getSegmenter(granularity, child.parentNode) as Intl.Segmenter
        ).segment(
          (child.textContent as string)
            .replace(/[\r\n\t]/g, '')
            .replace(/\s{2,}/g, ' '),
        )) {
          const span = document.createElement('span');
          const text = segment.segment;
          span.textContent = text;

          if (text.charCodeAt(0) === 32) {
            span.setAttribute('data-whitespace', '');
          }

          span.setAttribute(`data-${granularity}`, text);
          items.push(span);
          fragment.append(span);
        }

        child.replaceWith(fragment);
      } else if (
        granularity === 'word' &&
        child instanceof HTMLElement &&
        child.hasAttribute('data-_nobr')
      ) {
        child.removeAttribute('data-_nobr');
        const text = child.textContent ?? '';
        child.setAttribute('data-word', text);
        items.push(child);
      } else if (child.hasChildNodes()) {
        this.#split(granularity, child);
      }

      child = next;
    }
  }

  #lbr(granularity: 'word' | 'char') {
    const items =
      granularity === 'word' ? this.#wordElements : this.#charElements;
    let previous = null;

    for (let i = 0; i < items.length; ) {
      const item = items[i] as HTMLElement;
      let text = item.textContent ?? '';

      if (
        previous?.textContent?.trim() &&
        LBR_PROHIBIT_START_REGEX.test(text)
      ) {
        text = (previous.textContent ?? '') + text;
        previous.textContent = text;
        previous.setAttribute(`data-${granularity}`, text);
        item.remove();
        items.splice(i, 1);
        continue;
      }

      previous = item;
      i++;
    }

    function concat(index: number, regex: RegExp) {
      const item = items[index] as HTMLElement;
      const offset = index + 1;
      let text = item.textContent ?? '';

      while (offset < items.length) {
        const next = items[offset] as HTMLElement;
        const nextText = next.textContent ?? '';

        if (!regex.test(nextText)) {
          break;
        }

        text += nextText;
        next.remove();
        items.splice(offset, 1);
      }

      item.textContent = text;
      item.setAttribute(`data-${granularity}`, text);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      const text = item.textContent ?? '';

      if (LBR_PROHIBIT_END_REGEX.test(text)) {
        concat(i, LBR_PROHIBIT_END_REGEX);
        const next = items[i + 1];

        if (next?.textContent?.trim()) {
          const text = (items[i]?.textContent ?? '') + next.textContent;
          next.textContent = text;
          next.setAttribute(`data-${granularity}`, text);
          items[i]?.remove();
          items.splice(i, 1);
          i--;
        }

        continue;
      }

      if (LBR_INSEPARATABLE_REGEX.test(text)) {
        concat(i, LBR_INSEPARATABLE_REGEX);
      }
    }

    if (granularity === 'char') {
      const spans = (
        this.#fragment as DocumentFragment
      ).querySelectorAll<HTMLElement>('[data-word]:not([data-whitespace])');

      for (let i = 0; i < spans.length; i++) {
        const span = spans[i] as HTMLElement;
        const text = span.textContent;

        if (text) {
          span.setAttribute('data-word', text);
        } else {
          span.remove();
        }
      }
    }
  }

  #cleanup() {
    this.#wordElements.length = 0;
    this.#charElements.length = 0;
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
