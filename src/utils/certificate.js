import PDFDocument from "pdfkit";
import fs from "fs";

const NAVY  = "#1A3A5C";
const GOLD  = "#C9A84C";
const DGOLD = "#8B6914";
const WHITE = "#FFFFFF";
const CREAM = "#FDFBF4";
const DARK  = "#1A1A2E";
const LGRAY = "#F0EDE4";

const MONTHS_UZ = [
  "yanvar","fevral","mart","aprel","may","iyun",
  "iyul","avgust","sentabr","oktabr","noyabr","dekabr",
];

function formatDate() {
  const d = new Date();
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]} ${d.getFullYear()}-yil`;
}

function getDegree(totalBall) {
  if (totalBall >= 70) return { label: "A+", color: "#00875A" };
  if (totalBall >= 65) return { label: "A",  color: "#00875A" };
  if (totalBall >= 60) return { label: "B",  color: "#0052CC" };
  if (totalBall >= 55) return { label: "B+", color: "#0052CC" };
  if (totalBall >= 50) return { label: "C+", color: "#FF8B00" };
  if (totalBall >= 46) return { label: "C",  color: "#FF8B00" };
  return                      { label: "NC", color: "#DE350B" };
}

function drawCornerOrnament(doc, x, y, size, flipX, flipY) {
  doc.save();
  doc.translate(x, y).scale(flipX ? -1 : 1, flipY ? -1 : 1);
  doc
    .moveTo(0, 0).lineTo(size, 0).lineTo(size, 4)
    .lineTo(4, 4).lineTo(4, size).lineTo(0, size)
    .closePath().fill(GOLD);
  doc.restore();
}

function centered(doc, text, y, opts = {}) {
  doc.text(text, 0, y, { width: doc.page.width, align: "center", ...opts });
}

function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000000;
  }
  return String(hash).padStart(6, "0");
}

function createResultId(student, examName) {
  if (student.resultID) return student.resultID;
  if (student.resultId) return student.resultId;

  const userPart = student.user_id || student.id || "USER";
  const hashPart = simpleHash(`${examName}-${student.name}-${userPart}`);
  return `RID-${userPart}-${hashPart}`;
}

function drawResultBadge(doc, x, y, width, resultId) {
  const height = 42;

  doc.roundedRect(x, y, width, height, 7).fill("#FFFFFF");
  doc.roundedRect(x, y, width, height, 7).lineWidth(0.8).strokeColor(GOLD).stroke();
  doc.rect(x, y, 5, height).fill(GOLD);

  doc.fillColor(DGOLD).font("Helvetica-Bold").fontSize(7.5);
  doc.text("RESULT ID", x + 16, y + 9, { width: width - 28 });

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12);
  doc.text(resultId, x + 16, y + 22, { width: width - 28 });
}

export function generateCertificate({ student, examName, totalQuestions, outputPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const W = doc.page.width;   // 841.89
    const H = doc.page.height;  // 595.28
    const B = 22;               // border offset

    const correctCount = Array.isArray(student.test)
      ? student.test.reduce((a, b) => a + b, 0) : 0;
    const total  = totalQuestions || (Array.isArray(student.test) ? student.test.length : 0);
    const pct    = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const score  = student.total_ball ?? 0;
    const degree = getDegree(score);
    const resultId = createResultId(student, examName);

    // ── FON ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill(CREAM);
    for (let i = 0; i < H; i += 6) {
      doc.rect(0, i, W, 3).fill(i % 12 === 0 ? "#F5F2E8" : CREAM);
    }

    // ── CHEGARA ──────────────────────────────────────────────────────────
    doc.rect(14, 14, W - 28, H - 28).lineWidth(5).strokeColor(GOLD).stroke();
    doc.rect(B, B, W - B * 2, H - B * 2).lineWidth(1.2).strokeColor(GOLD).stroke();

    const cs = 22;
    drawCornerOrnament(doc, 14, 14, cs, false, false);
    drawCornerOrnament(doc, W - 14, 14, cs, true, false);
    drawCornerOrnament(doc, 14, H - 14, cs, false, true);
    drawCornerOrnament(doc, W - 14, H - 14, cs, true, true);

    // ── HEADER ────────────────────────────────────────────────────────────
    const HEADER_H = 95;
    doc.rect(B, B, W - B * 2, HEADER_H).fill(NAVY);

    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(30);
    centered(doc, "CERTIFICATE  OF  ACHIEVEMENT", 37);

    doc.moveTo(80, 78).lineTo(W - 80, 78).lineWidth(0.8).strokeColor(GOLD).stroke();

    doc.fillColor(WHITE).font("Helvetica").fontSize(11);
    centered(doc, `RASCH IRT BAHOLASH TIZIMI  |  ${examName.toUpperCase()}`, 83);

    // ── LAYOUT — barcha Y koordinatalar bir zanjirda ──────────────────────
    let y = B + HEADER_H + 28;

    // "Ushbu sertifikat shundan guvohlik beradiki,"
    doc.fillColor(NAVY).font("Helvetica").fontSize(12);
    centered(doc, "Ushbu sertifikat shundan guvohlik beradiki,", y);
    y += 36;

    // Talaba ismi
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(34);
    centered(doc, student.name || "Talaba", y);
    const nameLineY = y + 43;
    const nameW = Math.min(doc.widthOfString(student.name || "Talaba", { fontSize: 34 }), W - 160);
    doc.moveTo((W - nameW) / 2, nameLineY).lineTo((W + nameW) / 2, nameLineY)
       .lineWidth(1.2).strokeColor(DGOLD).stroke();
    y = nameLineY + 18;

    // "quyidagi imtihonni..."
    doc.fillColor(NAVY).font("Helvetica").fontSize(12);
    centered(doc, "quyidagi imtihonni muvaffaqiyatli topshirib, yuqori natija ko'rsatdi:", y);
    y += 26;

    // Imtihon nomi
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(17);
    centered(doc, `« ${examName} »`, y);
    y += 42;

    // Divider 1
    doc.moveTo(60, y).lineTo(W - 60, y).lineWidth(0.8).strokeColor(GOLD).stroke();
    y += 26;

    // ── STAT BOXLAR ───────────────────────────────────────────────────────
    const BOX_W = 148;
    const BOX_H = 90;
    const BOX_G = 18;
    const BOX_N = 4;
    const totalBW = BOX_N * BOX_W + (BOX_N - 1) * BOX_G;
    const boxX0   = (W - totalBW) / 2;
    const statsY  = y;

    const stats = [
      { label: "UMUMIY BALL",       value: score.toFixed(1),             sub: "100 ballik tizim" },
      { label: "TO'G'RI JAVOBLAR",  value: `${correctCount} / ${total}`, sub: "savol soni" },
      { label: "FOIZ",              value: `${pct}%`,                    sub: "to'g'rilik darajasi" },
      { label: "DARAJA",            value: degree.label,                 sub: "baho", valueColor: degree.color },
    ];

    stats.forEach(({ label, value, sub, valueColor }, i) => {
      const bx = boxX0 + i * (BOX_W + BOX_G);
      doc.rect(bx, statsY, BOX_W, BOX_H).fill(LGRAY);
      doc.rect(bx, statsY, BOX_W, 5).fill(GOLD);

      doc.fillColor(valueColor || NAVY).font("Helvetica-Bold").fontSize(26);
      doc.text(value, bx, statsY + 16, { width: BOX_W, align: "center" });

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(7.5);
      doc.text(label, bx, statsY + 56, { width: BOX_W, align: "center" });

      doc.fillColor("#888").font("Helvetica").fontSize(7);
      doc.text(sub, bx, statsY + 68, { width: BOX_W, align: "center" });
    });

    y = statsY + BOX_H + 26;

    // Divider 2
    doc.moveTo(60, y).lineTo(W - 60, y).lineWidth(0.8).strokeColor(GOLD).stroke();
    y += 22;

    // ── SANA VA IMZO ──────────────────────────────────────────────────────

    // Chap — sana
    doc.fillColor(DARK).font("Helvetica").fontSize(10.5);
    doc.text(`Sana:  ${formatDate()}`, 70, y);

    // O'rta — "Mazkur sertifikat ID" (qo'shimcha ma'lumot)
    drawResultBadge(doc, (W - 230) / 2, y - 10, 230, resultId);

    // O'ng — imzo chizig'i
    const sigLineY = y + 28;
    doc.moveTo(W - 260, sigLineY).lineTo(W - 60, sigLineY)
       .lineWidth(0.8).strokeColor(DARK).stroke();
    doc.fillColor(DARK).font("Helvetica").fontSize(9);
    doc.text("Direktor imzosi", W - 260, sigLineY + 5, { width: 200, align: "center" });

    y += 58;

    // ── PASTKI BANNER ─────────────────────────────────────────────────────
    const BANNER_H = 30;
    const bannerY  = H - B - BANNER_H;
    doc.rect(B, bannerY, W - B * 2, BANNER_H).fill(NAVY);
    doc.fillColor(GOLD).font("Helvetica").fontSize(7.5);
    centered(
      doc,
      "Ushbu sertifikat Rasch Item Response Theory (IRT) adaptive baholash metodi asosida avtomatik yaratilgan va rasmiy hujjat hisoblanadi.",
      bannerY + 10
    );

    doc.end();
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}
