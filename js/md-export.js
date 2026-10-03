/**
 * js/md-export.js — JS PROMPT
 * Markdown clean-up and export helpers used by the Job Results dialog.
 *
 *   MdExport.normalize(md)        → Markdown with broken emphasis fixed
 *   MdExport.toPlainText(md)      → readable plain text
 *   MdExport.toDocx(md, { title}) → Promise<Blob> (.docx, professional styling)
 *
 * The .docx writer produces real Word structure: Heading 1–4 styles, bulleted
 * and numbered lists (incl. nesting), GFM tables with a header row, block
 * quotes, code blocks, horizontal rules, bold / italic / strike / inline code,
 * hyperlinks, a title, page numbers in the footer and document properties.
 * Emoji are removed so exported documents stay clean and professional.
 */
'use strict';

(function () {
  const FENCE_RX = /^\s*(```|~~~)/;

  /* ── Normalisation ──────────────────────────────────────────────── */

  /**
   * Fix emphasis markers that CommonMark will not render because of spaces
   * inside them: "** very likely**" → "**very likely**". Code is left untouched.
   */
  function normalize(md) {
    if (!md) return '';
    let inFence = false;
    return md.replace(/\r\n?/g, '\n').split('\n').map(line => {
      if (FENCE_RX.test(line)) { inFence = !inFence; return line; }
      if (inFence) return line;
      // protect inline code spans
      const spans = [];
      let l = line.replace(/`[^`\n]*`/g, m => { spans.push(m); return '\u0000' + (spans.length - 1) + '\u0000'; });
      l = l.replace(/(\*\*|__|~~)([ \t]+)?([^*_~\n]*?[^\s*_~])([ \t]+)?\1/g,
        (m, mk, a, inner, b) => (a ? ' ' : '') + mk + inner + mk + (b ? ' ' : ''));
      l = l.replace(/(\S) {2,}(\*\*|__|~~)/g, '$1 $2').replace(/(\*\*|__|~~) {2,}(\S)/g, '$1 $2');
      return l.replace(/\u0000(\d+)\u0000/g, (m, i) => spans[+i]);
    }).join('\n');
  }

  // Emoji (plus the one space that separated them from the text) are removed;
  // all other whitespace — indentation, code alignment — is left untouched.
  const EMOJI = '(?:(?![©®™])[\\p{Extended_Pictographic}\\u{FE0F}\\u{200D}\\u{20E3}])+';
  function stripEmoji(s) {
    return s
      .replace(new RegExp('(^|[ \\t]+)' + EMOJI + '[ \\t]?', 'gmu'), '$1')
      .replace(new RegExp(EMOJI, 'gu'), '');
  }

  function toPlainText(md) {
    return normalize(md)
      .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
      .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, '')
      .replace(/<\/?(sup|sub|br|b|i|strong|em)>/gi, '');
  }

  /* ── Markdown → blocks ──────────────────────────────────────────── */

  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    const cells = []; let cur = '';
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
      if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
      cur += s[i];
    }
    cells.push(cur.trim());
    return cells;
  }

  const isTableSep = l => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l) ||
                          /^\s*\|\s*:?-{3,}:?\s*\|\s*$/.test(l);

  function parseBlocks(md) {
    const lines = md.split('\n');
    const blocks = [];
    let para = [];
    const flush = () => { if (para.length) { blocks.push({ t: 'p', text: para.join(' ') }); para = []; } };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fence = line.match(/^\s*(```|~~~)/);
      if (fence) {
        flush();
        const code = [];
        for (i++; i < lines.length && !lines[i].trim().startsWith(fence[1]); i++) code.push(lines[i]);
        blocks.push({ t: 'code', lines: code });
        continue;
      }
      if (!line.trim()) { flush(); continue; }
      const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (h) { flush(); blocks.push({ t: 'h', level: Math.min(h[1].length, 4), text: h[2] }); continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); blocks.push({ t: 'hr' }); continue; }
      if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flush();
        const rows = [splitRow(line)];
        for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(splitRow(lines[i]));
        i--;
        blocks.push({ t: 'table', rows });
        continue;
      }
      const q = line.match(/^\s*>\s?(.*)$/);
      if (q) {
        flush();
        const prev = blocks[blocks.length - 1];
        if (prev && prev.t === 'quote' && !prev.closed) prev.text += ' ' + q[1];
        else blocks.push({ t: 'quote', text: q[1] });
        continue;
      }
      const li = line.match(/^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/);
      if (li) {
        flush();
        const level = Math.min(Math.floor(li[1].replace(/\t/g, '    ').length / 2), 3);
        blocks.push({ t: 'li', ordered: /\d/.test(li[2]), level, text: li[3] });
        continue;
      }
      // continuation of a list item (indented text right after it)
      const prev = blocks[blocks.length - 1];
      if (!para.length && prev && prev.t === 'li' && /^\s{2,}\S/.test(line)) { prev.text += ' ' + line.trim(); continue; }
      para.push(line.trim());
    }
    flush();
    blocks.forEach(b => { if (b.t === 'quote') b.closed = true; });
    return blocks;
  }

  /* ── Inline Markdown → WordprocessingML runs ────────────────────── */

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function run(text, f) {
    if (!text) return '';
    // At most one w:rStyle per run (schema): a code span inside a link keeps the
    // Hyperlink style and gets the code font as direct formatting instead.
    const rpr = [
      f.link ? '<w:rStyle w:val="Hyperlink"/>' : f.code ? '<w:rStyle w:val="CodeChar"/>' : '',
      f.link && f.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>' : '',
      f.b ? '<w:b/><w:bCs/>' : '',
      f.i ? '<w:i/><w:iCs/>' : '',
      f.s ? '<w:strike/>' : '',
      f.sup ? '<w:vertAlign w:val="superscript"/>' : f.sub ? '<w:vertAlign w:val="subscript"/>' : '',
    ].join('');
    return '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') +
      '<w:t xml:space="preserve">' + esc(text) + '</w:t></w:r>';
  }

  /** Inline parser: **bold**, *italic*, _italic_, ~~strike~~, `code`, [text](url), <sup>/<sub>. */
  function inline(text, ctx, base = {}) {
    let out = '';
    let buf = '';
    const emit = () => { if (buf) { out += run(buf, base); buf = ''; } };
    let i = 0;
    while (i < text.length) {
      const rest = text.slice(i);
      let m;
      if (rest[0] === '\\' && /[\\`*_{}\[\]()#+\-.!|~<>]/.test(rest[1] || '')) { buf += rest[1]; i += 2; continue; }
      if ((m = rest.match(/^`([^`]+)`/))) { emit(); out += run(m[1], { ...base, code: true }); i += m[0].length; continue; }
      if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/))) {
        emit();
        const rid = ctx.addLink(m[2]);
        out += rid
          ? '<w:hyperlink r:id="' + rid + '" w:history="1">' + inline(m[1], ctx, { ...base, link: true }) + '</w:hyperlink>'
          : inline(m[1], ctx, base);
        i += m[0].length; continue;
      }
      if ((m = rest.match(/^<(sup|sub)>(.*?)<\/\1>/i))) {
        emit(); out += inline(m[2], ctx, { ...base, [m[1].toLowerCase()]: true }); i += m[0].length; continue;
      }
      if ((m = rest.match(/^<br\s*\/?>/i))) { emit(); out += '<w:r><w:br/></w:r>'; i += m[0].length; continue; }
      if ((m = rest.match(/^(\*\*\*|___)(?=\S)([\s\S]+?)(?<=\S)\1/))) { emit(); out += inline(m[2], ctx, { ...base, b: true, i: true }); i += m[0].length; continue; }
      if ((m = rest.match(/^(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1/))) { emit(); out += inline(m[2], ctx, { ...base, b: true }); i += m[0].length; continue; }
      if ((m = rest.match(/^~~(?=\S)([\s\S]+?)(?<=\S)~~/))) { emit(); out += inline(m[1], ctx, { ...base, s: true }); i += m[0].length; continue; }
      const prevCh = i ? text[i - 1] : ' ';
      if ((m = rest.match(/^\*(?=\S)([^*]+?)(?<=\S)\*(?!\*)/)) ||
          (!/\w/.test(prevCh) && (m = rest.match(/^_(?=\S)([^_]+?)(?<=\S)_(?!\w)/)))) {
        emit(); out += inline(m[1], ctx, { ...base, i: true }); i += m[0].length; continue;
      }
      buf += text[i]; i++;
    }
    emit();
    return out;
  }

  /* ── Blocks → document.xml ──────────────────────────────────────── */

  function para(content, { style, numId, ilvl = 0, extra = '' } = {}) {
    const ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : '') +
      (numId ? '<w:numPr><w:ilvl w:val="' + ilvl + '"/><w:numId w:val="' + numId + '"/></w:numPr>' : '') + extra;
    return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + content + '</w:p>';
  }

  function table(rows, ctx) {
    const cols = Math.max(...rows.map(r => r.length));
    const width = 9638;                                   // A4 text width with 2 cm margins (twips)
    const colW = Math.floor(width / cols);
    const cell = (txt, header, stripe) =>
      '<w:tc><w:tcPr><w:tcW w:w="' + colW + '" w:type="dxa"/>' +
      (header ? '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>'
              : stripe ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F5FA"/>' : '') +
      '<w:vAlign w:val="center"/></w:tcPr>' +
      para(inline(txt || '', ctx, header ? { b: true } : {}), { style: header ? 'TableHeader' : 'TableText' }) + '</w:tc>';
    // header row repeats on every page; body rows are banded for readability
    const tr = (r, i) =>
      '<w:tr>' + (i === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : '') +
      Array.from({ length: cols }, (_, c) => cell(r[c], i === 0, i > 0 && i % 2 === 0)).join('') + '</w:tr>';
    return '<w:tbl><w:tblPr><w:tblStyle w:val="ReportTable"/><w:tblW w:w="5000" w:type="pct"/>' +
      '<w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>' +
      '<w:tblGrid>' + Array.from({ length: cols }, () => '<w:gridCol w:w="' + colW + '"/>').join('') + '</w:tblGrid>' +
      rows.map(tr).join('') + '</w:tbl>' + para('', { style: 'TableGap' });
  }

  function buildBody(blocks, ctx) {
    let xml = '';
    let listRun = null;                                   // { ordered, numId } for the current list
    for (const b of blocks) {
      if (b.t !== 'li') listRun = null;
      switch (b.t) {
        case 'h':     xml += para(inline(b.text, ctx), { style: 'Heading' + b.level }); break;
        case 'p':     xml += para(inline(b.text, ctx)); break;
        case 'quote': xml += para(inline(b.text, ctx), { style: 'Quote' }); break;
        case 'hr':    xml += para('', { style: 'Rule' }); break;
        case 'code':
          xml += (b.lines.length ? b.lines : ['']).map(l => para(run(l || ' ', {}), { style: 'Code' })).join('');
          break;
        case 'table': xml += table(b.rows, ctx); break;
        case 'li':
          if (!listRun || (b.level === 0 && listRun.ordered !== b.ordered)) {
            listRun = { ordered: b.ordered, numId: ctx.newList(b.ordered) };
          }
          xml += para(inline(b.text, ctx), { style: 'ListParagraph', numId: listRun.numId, ilvl: b.level });
          break;
      }
    }
    return xml;
  }

  /* ── Package parts ──────────────────────────────────────────────── */

  const NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
               'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const FONT = 'Calibri';
  const ACCENT = '1F3864';

  function stylesXml() {
    const rpr = (sz, extra = '') => '<w:rPr><w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:cs="' + FONT + '"/>' + extra + '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr>';
    const heading = (n, sz, before, after) =>
      '<w:style w:type="paragraph" w:styleId="Heading' + n + '"><w:name w:val="heading ' + n + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="' + before + '" w:after="' + after + '"/><w:outlineLvl w:val="' + (n - 1) + '"/>' +
      (n === 1 ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="' + ACCENT + '"/></w:pBdr>' : '') + '</w:pPr>' +
      rpr(sz, '<w:b/><w:bCs/><w:color w:val="' + ACCENT + '"/>') + '</w:style>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles ' + NS_W + '>' +
      '<w:docDefaults><w:rPrDefault>' + rpr(22, '<w:lang w:val="uk-UA" w:eastAsia="en-US"/>') + '</w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>' + rpr(22, '<w:color w:val="1A1A1A"/>') + '</w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:after="240"/></w:pPr>' + rpr(44, '<w:b/><w:color w:val="' + ACCENT + '"/>') + '</w:style>' +
      heading(1, 32, 360, 160) + heading(2, 28, 280, 120) + heading(3, 24, 240, 100) + heading(4, 22, 200, 80) +
      '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="8EAADB"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F2F5FA"/><w:ind w:left="284" w:right="284"/><w:spacing w:before="120" w:after="120"/></w:pPr>' +
      rpr(22, '<w:i/><w:color w:val="404040"/>') + '</w:style>' +
      '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F4F6F8"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="142" w:right="142"/></w:pPr>' +
      '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:color w:val="1F2937"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Rule"><w:name w:val="Horizontal Rule"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr><w:spacing w:after="200"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>' + rpr(20) + '</w:style>' +
      '<w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="TableText"/>' + rpr(20, '<w:b/><w:color w:val="FFFFFF"/>') + '</w:style>' +
      '<w:style w:type="paragraph" w:styleId="TableGap"><w:name w:val="Table Gap"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60" w:line="120" w:lineRule="exact"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>' + rpr(18, '<w:color w:val="7F7F7F"/>') + '</w:style>' +
      '<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/><w:shd w:val="clear" w:color="auto" w:fill="F1F3F5"/><w:color w:val="C7254E"/></w:rPr></w:style>' +
      '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="2E74B5"/><w:u w:val="single"/></w:rPr></w:style>' +
      '<w:style w:type="table" w:styleId="ReportTable"><w:name w:val="Report Table"/><w:tblPr><w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="BFC8D6"/>').join('') +
      '</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
      '</w:styles>';
  }

  function numberingXml(lists) {
    const lvl = (ordered, l) => '<w:lvl w:ilvl="' + l + '"><w:start w:val="1"/>' +
      (ordered
        ? '<w:numFmt w:val="' + ['decimal', 'lowerLetter', 'lowerRoman', 'decimal'][l] + '"/><w:lvlText w:val="%' + (l + 1) + '."/>'
        : '<w:numFmt w:val="bullet"/><w:lvlText w:val="' + ['•', '–', '▪', '•'][l] + '"/>') +
      '<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + (360 * (l + 1) + 360) + '" w:hanging="360"/></w:pPr>' +
      (ordered ? '' : '<w:rPr><w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '"/><w:color w:val="' + ACCENT + '"/></w:rPr>') + '</w:lvl>';
    const abs = (id, ordered) => '<w:abstractNum w:abstractNumId="' + id + '"><w:multiLevelType w:val="hybridMultilevel"/>' +
      [0, 1, 2, 3].map(l => lvl(ordered, l)).join('') + '</w:abstractNum>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering ' + NS_W + '>' +
      abs(1, false) + abs(2, true) +
      lists.map((ordered, i) => '<w:num w:numId="' + (i + 1) + '"><w:abstractNumId w:val="' + (ordered ? 2 : 1) + '"/>' +
        (ordered ? '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>' : '') + '</w:num>').join('') +
      '</w:numbering>';
  }

  const footerXml = () => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr ' + NS_W + '>' +
    '<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
    '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' +
    '<w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';

  async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/jszip.min.js';                  // vendored: no CDN / CSP dependency, works offline
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(s);
    });
    return window.JSZip;
  }

  /**
   * toDocx(md, { title }) → Promise<Blob>
   * If the Markdown starts without a level-1 heading, `title` becomes the title.
   */
  async function toDocx(md, opts = {}) {
    const JSZip = await loadJSZip();
    const clean = stripEmoji(normalize(md || ''));
    const blocks = parseBlocks(clean);

    const links = [];
    const lists = [];
    const ctx = {
      addLink(url) {
        if (!/^(https?:|mailto:)/i.test(url)) return null;
        links.push(url);
        return 'rIdL' + links.length;
      },
      newList(ordered) { lists.push(ordered); return lists.length; },
    };

    const firstH1 = blocks.find(b => b.t === 'h');
    let title = (opts.title || '').trim();
    if (firstH1 && firstH1.level === 1 && blocks[0] === firstH1) {
      title = firstH1.text.replace(/[*_`]/g, '');
      blocks.shift();
    }
    const titleXml = title ? para(inline(title, ctx), { style: 'Title' }) : '';
    const body = buildBody(blocks, ctx);

    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ' + NS_W + '><w:body>' +
      titleXml + body +
      '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';

    const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
      '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
      links.map((u, i) => '<Relationship Id="rIdL' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + esc(u) + '" TargetMode="External"/>').join('') +
      '</Relationships>';

    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + esc(title.replace(/[*_`]/g, '')) + '</dc:title><dc:creator>JS PROMPT</dc:creator>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '</cp:coreProperties>';

    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
    zip.file('word/document.xml', documentXml);
    zip.file('word/styles.xml', stylesXml());
    zip.file('word/numbering.xml', numberingXml(lists));
    zip.file('word/footer1.xml', footerXml());
    zip.file('word/_rels/document.xml.rels', docRels);
    zip.file('docProps/core.xml', coreXml);
    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  }

  window.MdExport = { normalize, toPlainText, toDocx, _parseBlocks: parseBlocks, _inline: inline };
})();
