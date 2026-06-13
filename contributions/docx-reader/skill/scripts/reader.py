import os, sys, argparse
import xml.etree.ElementTree as ET
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
from docx.oxml.ns import qn


def load_comments(doc):
    """Return {id: {'author', 'date', 'text'}} from the comments part."""
    comments = {}
    for part in doc.part.package.iter_parts():
        if part.content_type.endswith('comments+xml'):
            root = ET.fromstring(part.blob)
            for c in root.findall(qn('w:comment')):
                comments[c.get(qn('w:id'))] = {
                    'author': c.get(qn('w:author')) or '',
                    'date': c.get(qn('w:date')) or '',
                    'text': ''.join(t.text or '' for t in c.iter(qn('w:t'))),
                }
    return comments


def load_notes(doc):
    """Return ({footnote_id: text}, {endnote_id: text}); skip separator notes."""
    foot, end = {}, {}
    skip = {'separator', 'continuationSeparator'}
    for part in doc.part.package.iter_parts():
        ct = part.content_type
        if ct.endswith('footnotes+xml'):
            tag, target = 'w:footnote', foot
        elif ct.endswith('endnotes+xml'):
            tag, target = 'w:endnote', end
        else:
            continue
        root = ET.fromstring(part.blob)
        for n in root.findall(qn(tag)):
            if n.get(qn('w:type')) in skip:
                continue
            target[n.get(qn('w:id'))] = ''.join(t.text or '' for t in n.iter(qn('w:t')))
    return foot, end


def load_headers_footers(doc):
    """Return (headers, footers) as deduped lists of non-empty text blocks."""
    headers, footers = [], []
    for part in doc.part.package.iter_parts():
        ct = part.content_type
        if ct.endswith('header+xml'):
            bucket = headers
        elif ct.endswith('footer+xml'):
            bucket = footers
        else:
            continue
        root = ET.fromstring(part.blob)
        text = ' '.join(t.text or '' for t in root.iter(qn('w:t'))).strip()
        if text and text not in bucket:
            bucket.append(text)
    return headers, footers


def iter_images(p, doc):
    out = []
    for inline in p._p.findall('.//' + qn('wp:inline')) + p._p.findall('.//' + qn('wp:anchor')):
        docPr = inline.find(qn('wp:docPr'))
        alt = (docPr.get('descr') or docPr.get('name') or '') if docPr is not None else ''
        blip = inline.find('.//' + qn('a:blip'))
        if blip is None:
            continue
        rid = blip.get(qn('r:embed'))
        part = doc.part.related_parts.get(rid) if rid else None
        if part is None:
            continue
        out.append((rid, os.path.splitext(part.partname)[1] or '.bin', alt))
    return out


def build_index(doc):
    comments = load_comments(doc)
    footnotes, endnotes = load_notes(doc)
    lines, images = [], []
    for child in doc.element.body.iterchildren():
        if child.tag == qn('w:p'):
            p = Paragraph(child, doc)
            txt = p.text
            style = (p.style.name or '') if p.style else ''
            if txt.strip():
                pre = f'[{style}] ' if style.lower().startswith('heading') else ''
                lines.append(pre + txt)
            for rid, ext, alt in iter_images(p, doc):
                idx = len(images) + 1
                images.append((idx, rid, ext, alt))
                desc = f' | alt: {alt}' if alt else ''
                lines.append(f'[IMAGE #{idx}{desc} | extract to view]')
            for ref in child.findall('.//' + qn('w:commentReference')):
                c = comments.get(ref.get(qn('w:id')))
                if c:
                    lines.append(f'[COMMENT by {c["author"] or "unknown"}: {c["text"]}]')
            for ref in child.findall('.//' + qn('w:footnoteReference')):
                t = footnotes.get(ref.get(qn('w:id')))
                if t:
                    lines.append(f'[FOOTNOTE: {t}]')
            for ref in child.findall('.//' + qn('w:endnoteReference')):
                t = endnotes.get(ref.get(qn('w:id')))
                if t:
                    lines.append(f'[ENDNOTE: {t}]')
        elif child.tag == qn('w:tbl'):
            tbl = Table(child, doc)
            rows = [' | '.join(c.text for c in r.cells) for r in tbl.rows]
            lines.append('[TABLE]\n' + '\n'.join('  ' + r for r in rows))
    return '\n'.join(lines), images


def main():
    ap = argparse.ArgumentParser(description='Read a .docx: extract text, tables, comments, and notes; pull images on demand.')
    ap.add_argument('docx')
    ap.add_argument('--image', type=int, default=None, help='Extract only this image number, then stop.')
    ap.add_argument('--outdir', default='.', help='Where to write extracted image(s).')
    a = ap.parse_args()
    doc = Document(a.docx)
    text, images = build_index(doc)
    if a.image is None:
        headers, footers = load_headers_footers(doc)
        furniture = [f'[HEADER: {h}]' for h in headers] + [f'[FOOTER: {f}]' for f in footers]
        if furniture:
            print('\n'.join(furniture))
        print(text)
        print(f'\n[{len(images)} embedded image(s). To view image N: reader.py "{a.docx}" --image N]')
    else:
        match = [im for im in images if im[0] == a.image]
        if not match:
            sys.exit(f'No image #{a.image} (document has {len(images)}).')
        idx, rid, ext, alt = match[0]
        os.makedirs(a.outdir, exist_ok=True)
        path = os.path.join(a.outdir, f'image{idx}{ext}')
        with open(path, 'wb') as f:
            f.write(doc.part.related_parts[rid].blob)
        print(f'Extracted image #{idx} -> {path}  (alt: {alt})')


if __name__ == '__main__':
    main()
