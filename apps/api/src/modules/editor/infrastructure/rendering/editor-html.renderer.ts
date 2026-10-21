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
    return this.renderChildren(document.content, this.createContext(document));
  }

  private async renderNode(
    node: EditorNode,
    context: RenderContext,
  ): Promise<string> {
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
    if (node.type === 'footnoteReference') {
      const noteId = this.attr(node, 'noteId');
      return `<sup class="dss-footnote-reference"><a href="#footnote-${noteId}" id="footnote-reference-${noteId}">[${noteId}]</a></sup>`;
    }
    if (node.type === 'tableOfContents') {
      const items = context.headings
        .map(
          ({ id, level, label }) =>
            `<li data-level="${level}"><a href="#${id}">${this.escape(label)}</a></li>`,
        )
        .join('');
      return `<nav class="dss-table-of-contents" aria-label="Table of contents"><ol>${items}</ol></nav>`;
    }

    const children = await this.renderChildren(node, context);
    switch (node.type) {
      case 'doc':
        return children;
      case 'paragraph':
        return `<p${this.textAlignAttribute(node)}>${children}</p>`;
      case 'heading':
        return `<h${this.numberAttr(node, 'level')} id="${context.headingIds.get(node) ?? 'section'}"${this.textAlignAttribute(node)}>${children}</h${this.numberAttr(node, 'level')}>`;
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
      case 'table':
        return `<table class="dss-table"><tbody>${children}</tbody></table>`;
      case 'tableRow':
        return `<tr>${children}</tr>`;
      case 'tableHeader':
        return `<th>${children}</th>`;
      case 'tableCell':
        return `<td>${children}</td>`;
      case 'taskList':
        return `<ul class="dss-task-list">${children}</ul>`;
      case 'taskItem': {
        const checked = node.attrs?.checked === true;
        return `<li class="dss-task-item" data-checked="${checked}"><input type="checkbox" disabled${checked ? ' checked' : ''}>${children}</li>`;
      }
      case 'footnoteDefinition': {
        const noteId = this.attr(node, 'noteId');
        return `<aside class="dss-footnote-definition" id="footnote-${noteId}"><a href="#footnote-reference-${noteId}">[${noteId}]</a>${children}</aside>`;
      }
      default:
        return '';
    }
  }

  private async renderChildren(
    node: EditorNode,
    context: RenderContext,
  ): Promise<string> {
    return (
      await Promise.all(
        (node.content ?? []).map((child) => this.renderNode(child, context)),
      )
    ).join('');
  }

  private createContext(document: EditorDocument): RenderContext {
    const headings: RenderHeading[] = [];
    const headingIds = new Map<EditorNode, string>();
    const usedIds = new Map<string, number>();
    const visit = (node: EditorNode): void => {
      if (node.type === 'heading') {
        const label = this.textContent(node).trim() || 'Untitled section';
        const baseId = this.slug(label) || 'section';
        const occurrence = (usedIds.get(baseId) ?? 0) + 1;
        usedIds.set(baseId, occurrence);
        const id = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
        headingIds.set(node, id);
        headings.push({ id, label, level: this.numberAttr(node, 'level') });
      }
      for (const child of node.content ?? []) visit(child);
    };
    visit(document.content);
    return { headings, headingIds };
  }

  private slug(value: string): string {
    return value
      .normalize('NFKD')
      .toLocaleLowerCase('uk-UA')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
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

  private textAlignAttribute(node: EditorNode): string {
    const value = node.attrs?.textAlign;
    return value === 'center' ? ' style="text-align: center"' : '';
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

type RenderHeading = { id: string; label: string; level: number };
type RenderContext = {
  headings: RenderHeading[];
  headingIds: Map<EditorNode, string>;
};

/** Shiki makes code glow. Validation keeps scripts grounded. */
