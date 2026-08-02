/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/infrastructure/rendering/editor-html.renderer.ts
 *
 * 🎯 Purpose:
 * Renders validated editor nodes into safe HTML and Shiki-highlighted code.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import type { EditorDocument, EditorMark, EditorNode } from '@dss/editor';

import {
  EDITOR_CODE_HIGHLIGHTER,
  type EditorCodeHighlighter,
} from '../../application/contracts/editor-code-highlighter.interface';

@Injectable()
export class EditorHtmlRenderer {
  constructor(
    @Inject(EDITOR_CODE_HIGHLIGHTER)
    private readonly codeHighlighter: EditorCodeHighlighter,
  ) {}

  async render(document: EditorDocument): Promise<string> {
    return this.renderChildren(document.content);
  }

  private async renderNode(node: EditorNode): Promise<string> {
    if (node.type === 'text') {
      return this.renderMarks(this.escape(node.text ?? ''), node.marks ?? []);
    }
    if (node.type === 'hardBreak') return '<br>';
    if (node.type === 'horizontalRule') return '<hr>';
    if (node.type === 'mention') {
      return `<span class="dss-mention" data-user-id="${this.attr(node, 'userId')}">@${this.escape(this.attr(node, 'username'))}</span>`;
    }
    if (node.type === 'mediaReference') {
      const mediaId = this.attr(node, 'mediaId');
      const alt = this.escape(this.attr(node, 'alt'));
      const caption = this.escape(this.attr(node, 'caption'));
      return `<figure class="dss-media" data-media-id="${mediaId}"><div role="img" aria-label="${alt}"></div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
    }
    if (node.type === 'attachment') {
      return `<a class="dss-attachment" data-media-id="${this.attr(node, 'mediaId')}">${this.escape(this.attr(node, 'label'))}</a>`;
    }
    if (node.type === 'codeBlock') {
      return this.codeHighlighter.highlight(
        this.textContent(node),
        this.attr(node, 'language'),
      );
    }

    const children = await this.renderChildren(node);
    switch (node.type) {
      case 'doc':
        return children;
      case 'paragraph':
        return `<p>${children}</p>`;
      case 'heading':
        return `<h${this.numberAttr(node, 'level')}>${children}</h${this.numberAttr(node, 'level')}>`;
      case 'bulletList':
        return `<ul>${children}</ul>`;
      case 'orderedList':
        return `<ol>${children}</ol>`;
      case 'listItem':
        return `<li>${children}</li>`;
      case 'blockquote':
        return `<blockquote>${children}</blockquote>`;
      case 'contentGate':
        return `<section class="dss-content-gate" data-gate-id="${this.attr(node, 'gateId')}">${children}</section>`;
      default:
        return '';
    }
  }

  private async renderChildren(node: EditorNode): Promise<string> {
    return (
      await Promise.all(
        (node.content ?? []).map((child) => this.renderNode(child)),
      )
    ).join('');
  }

  private renderMarks(value: string, marks: EditorMark[]): string {
    return marks.reduce((content, mark) => {
      switch (mark.type) {
        case 'bold':
          return `<strong>${content}</strong>`;
        case 'italic':
          return `<em>${content}</em>`;
        case 'strike':
          return `<s>${content}</s>`;
        case 'code':
          return `<code>${content}</code>`;
        case 'link': {
          const href = mark.attrs?.href;
          return `<a href="${this.escape(typeof href === 'string' ? href : '')}" rel="nofollow ugc noopener noreferrer">${content}</a>`;
        }
      }
    }, value);
  }

  private textContent(node: EditorNode): string {
    if (node.type === 'text') return node.text ?? '';
    return (node.content ?? [])
      .map((child) => this.textContent(child))
      .join('');
  }

  private attr(node: EditorNode, key: string): string {
    const value = node.attrs?.[key];
    return typeof value === 'string' ? value : '';
  }

  private numberAttr(node: EditorNode, key: string): number {
    const value = node.attrs?.[key];
    return typeof value === 'number' ? value : 2;
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}

/** Shiki makes code glow. Validation keeps scripts grounded. */
