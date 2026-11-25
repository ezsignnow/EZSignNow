import { strToU8, zipSync } from "fflate";

const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = (items: [string, string, string][]) =>
  `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`).join("")}</Relationships>`;

/** 1x1 red PNG. */
export const PNG_1X1 = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

const sp = (id: number, ph: string, body: string, xfrm = "") =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="s${id}"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${xfrm}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp>`;
const para = (text: string, extra = "") => `<a:p>${extra}<a:r><a:rPr lang="en-US"/><a:t>${text}</a:t></a:r></a:p>`;
const xf = (x: number, y: number, cx: number, cy: number) => `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;
const toZip = (files: Record<string, string | Uint8Array>) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === "string" ? strToU8(v) : v])));

/** A small but realistic two-slide deck: inherited placeholders, bullets, a filled box, a table and a picture. */
export function makePptx(): Uint8Array {
  return toZip({
    "[Content_Types].xml": `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
    "_rels/.rels": REL([["rId1", "officeDocument", "ppt/presentation.xml"]]),
    "ppt/presentation.xml": `${HEAD}<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": REL([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ["rId2", "slide", "slides/slide1.xml"], ["rId3", "slide", "slides/slide2.xml"], ["rId4", "theme", "theme/theme1.xml"]]),
    "ppt/theme/theme1.xml": `${HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="t"><a:themeElements><a:clrScheme name="c"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F3864"/></a:dk2><a:lt2><a:srgbClr val="EEEEEE"/></a:lt2><a:accent1><a:srgbClr val="2E75B6"/></a:accent1><a:accent2><a:srgbClr val="C55A11"/></a:accent2></a:clrScheme></a:themeElements></a:theme>`,
    "ppt/slideMasters/slideMaster1.xml": `${HEAD}<p:sldMaster ${NS}><p:cSld><p:spTree>${sp(2, '<p:ph type="title"/>', para("t"), xf(457200, 274320, 8229600, 1143000))}${sp(3, '<p:ph type="body" idx="1"/>', para("b"), xf(457200, 1600200, 8229600, 4525963))}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2"/><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2400"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`,
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": REL([["rId1", "theme", "../theme/theme1.xml"]]),
    "ppt/slideLayouts/slideLayout1.xml": `${HEAD}<p:sldLayout ${NS}><p:cSld><p:spTree>${sp(2, '<p:ph type="title"/>', para("t"), xf(457200, 274320, 8229600, 1143000))}${sp(3, '<p:ph idx="1"/>', para("b"), xf(457200, 1600200, 8229600, 4525963))}</p:spTree></p:cSld></p:sldLayout>`,
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": REL([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]),
    "ppt/slides/slide1.xml":
      `${HEAD}<p:sld ${NS}><p:cSld><p:spTree>` +
      sp(2, '<p:ph type="title"/>', para("Quarterly Results")) +
      sp(3, '<p:ph idx="1"/>', para("First point") + para("Second point") + para("Third point")) +
      `<p:sp><p:nvSpPr><p:cNvPr id="4" name="box"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xf(5486400, 5029200, 3200400, 914400)}<a:prstGeom prst="rect"/><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${para("Highlighted box", '<a:pPr algn="ctr"/>')}</p:txBody></p:sp>` +
      `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="5" name="tbl"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="457200" y="4800600"/><a:ext cx="4572000" cy="914400"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblGrid><a:gridCol w="2286000"/><a:gridCol w="2286000"/></a:tblGrid>` +
      `<a:tr h="457200"><a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Cell A</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Cell B</a:t></a:r></a:p></a:txBody></a:tc></a:tr>` +
      `<a:tr h="457200"><a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Cell C</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Cell D</a:t></a:r></a:p></a:txBody></a:tc></a:tr>` +
      `</a:tbl></a:graphicData></a:graphic></p:graphicFrame>` +
      `<p:pic><p:nvPicPr><p:cNvPr id="6" name="pic"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/></p:blipFill><p:spPr>${xf(6858000, 1600200, 1371600, 1371600)}</p:spPr></p:pic>` +
      `</p:spTree></p:cSld></p:sld>`,
    "ppt/slides/_rels/slide1.xml.rels": REL([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "image", "../media/image1.png"]]),
    "ppt/media/image1.png": PNG_1X1,
    "ppt/slides/slide2.xml": `${HEAD}<p:sld ${NS}><p:cSld><p:spTree>${sp(2, '<p:ph type="title"/>', para("Second Slide"))}${sp(3, '<p:ph idx="1"/>', para("Only one bullet here"))}</p:spTree></p:cSld></p:sld>`,
    "ppt/slides/_rels/slide2.xml.rels": REL([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"]]),
  });
}

/** A workbook with shared strings, a bold header, a date, a percentage and a currency cell. */
export function makeXlsx(opts: { rows?: number; extraCols?: number } = {}): Uint8Array {
  const rows = opts.rows ?? 3;
  const extraCols = opts.extraCols ?? 0;
  const dateSerial = Date.UTC(2023, 2, 15) / 86400000 + 25569;
  const shared = ["Item", "Price", "Date", "Share", "Widget", "Gadget"];
  const cell = (r: string, t: string | null, v: string | number, s = 0) => `<c r="${r}"${t ? ` t="${t}"` : ""}${s ? ` s="${s}"` : ""}><v>${v}</v></c>`;
  const letter = (i: number) => String.fromCharCode(65 + i);
  const body: string[] = [];
  body.push(
    `<row r="1">${[0, 1, 2, 3].map((i) => cell(`${letter(i)}1`, "s", i, 1)).join("")}${Array.from({ length: extraCols }, (_, k) => `<c r="${letter(4 + k)}1" t="inlineStr" s="1"><is><t>Extra${k}</t></is></c>`).join("")}</row>`,
  );
  for (let r = 2; r <= rows + 1; r++) {
    body.push(`<row r="${r}">${cell(`A${r}`, "s", 4 + (r % 2))}${cell(`B${r}`, null, 1234.5 * r, 2)}${cell(`C${r}`, null, dateSerial, 3)}${cell(`D${r}`, null, 0.25, 4)}</row>`);
  }
  return toZip({
    "[Content_Types].xml": `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
    "_rels/.rels": REL([["rId1", "officeDocument", "xl/workbook.xml"]]),
    "xl/workbook.xml": `${HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sales" sheetId="1" r:id="rId1"/><sheet name="Empty" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": REL([["rId1", "worksheet", "worksheets/sheet1.xml"], ["rId2", "worksheet", "worksheets/sheet2.xml"]]),
    "xl/sharedStrings.xml": `${HEAD}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${shared.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`,
    "xl/styles.xml": `${HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/></font><font><b/><sz val="11"/></font></fonts><cellXfs count="5"><xf numFmtId="0" fontId="0"/><xf numFmtId="0" fontId="1"/><xf numFmtId="165" fontId="0"/><xf numFmtId="164" fontId="0"/><xf numFmtId="9" fontId="0"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `${HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="18" customWidth="1"/></cols><sheetData>${body.join("")}</sheetData></worksheet>`,
    "xl/worksheets/sheet2.xml": `${HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`,
  });
}
