import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// ======================================================
// COLORS
// ======================================================

const NAVY = "#082D52";
const NAVY_2 = "#123F68";

const GOLD = "#D4A32A";
const GOLD_LIGHT = "#E8C76C";
const DARK_GOLD = "#9F7415";

const WHITE = "#FFFFFF";
const CREAM = "#FFFDF7";
const DARK = "#15263B";
const MUTED = "#667085";
const GREEN = "#078A55";

// ======================================================
// DATE
// ======================================================

const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

function formatDate(date = new Date()) {
  const d = new Date(date);

  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}.${d.getFullYear()}`;
}

// ======================================================
// DEGREE
// ======================================================

function getDegree(totalBall) {
  if (totalBall >= 70) {
    return {
      label: "A+",
      color: GREEN,
    };
  }

  if (totalBall >= 65) {
    return {
      label: "A",
      color: GREEN,
    };
  }

  if (totalBall >= 60) {
    return {
      label: "B",
      color: "#1565C0",
    };
  }

  if (totalBall >= 55) {
    return {
      label: "B+",
      color: "#1565C0",
    };
  }

  if (totalBall >= 50) {
    return {
      label: "C+",
      color: "#E48B00",
    };
  }

  if (totalBall >= 46) {
    return {
      label: "C",
      color: "#E48B00",
    };
  }

  return {
    label: "NC",
    color: "#D92D20",
  };
}

// ======================================================
// HELPERS
// ======================================================

function centerText(doc, text, y, options = {}) {
  doc.text(text, 0, y, {
    width: doc.page.width,
    align: "center",
    ...options,
  });
}

function drawCenteredLine(doc, y, width = 300) {
  const W = doc.page.width;

  doc
    .moveTo((W - width) / 2, y)
    .lineTo((W + width) / 2, y)
    .lineWidth(0.8)
    .strokeColor(GOLD)
    .stroke();

  // center diamond
  doc.save();

  doc
    .translate(W / 2, y)
    .rotate(45)
    .rect(-4, -4, 8, 8)
    .fill(GOLD);

  doc.restore();
}

// ======================================================
// BACKGROUND PATTERN
// ======================================================

function drawBackgroundPattern(doc) {
  const W = doc.page.width;
  const H = doc.page.height;

  doc.rect(0, 0, W, H).fill(CREAM);

  doc.save();

  doc.opacity(0.08);

  for (let y = 20; y < H; y += 13) {
    doc
      .moveTo(30, y)
      .bezierCurveTo(W * 0.3, y - 12, W * 0.7, y + 12, W - 30, y)
      .lineWidth(0.35)
      .strokeColor(GOLD)
      .stroke();
  }

  doc.restore();
}

// ======================================================
// ORNAMENT
// ======================================================

function drawCornerPattern(doc, x, y, flipX = false, flipY = false) {
  const SIZE = 73;

  doc.save();

  doc.translate(x, y);
  doc.scale(flipX ? -1 : 1, flipY ? -1 : 1);

  // Main corner curves
  doc
    .moveTo(0, SIZE)
    .lineTo(0, 0)
    .lineTo(SIZE, 0)
    .lineWidth(2)
    .strokeColor(GOLD)
    .stroke();

  // geometric decorative lines
  for (let i = 10; i <= 60; i += 10) {
    doc
      .moveTo(i, 0)
      .lineTo(0, i)
      .lineWidth(0.8)
      .strokeColor(GOLD_LIGHT)
      .stroke();

    doc
      .moveTo(i + 10, 0)
      .lineTo(0, i + 20)
      .lineWidth(0.5)
      .strokeColor(GOLD)
      .stroke();
  }

  doc.restore();
}

// ======================================================
// BORDER
// ======================================================

function drawCertificateBorder(doc) {
  const W = doc.page.width;
  const H = doc.page.height;

  // outer
  doc
    .rect(12, 12, W - 24, H - 24)
    .lineWidth(2)
    .strokeColor(GOLD)
    .stroke();

  // dotted-like inner border
  doc
    .rect(17, 17, W - 34, H - 34)
    .lineWidth(0.8)
    .strokeColor(GOLD_LIGHT)
    .stroke();

  // main navy border
  doc
    .rect(25, 25, W - 50, H - 50)
    .lineWidth(2.4)
    .strokeColor(NAVY)
    .stroke();

  drawCornerPattern(doc, 25, 25);
  drawCornerPattern(doc, W - 25, 25, true, false);

  drawCornerPattern(doc, 25, H - 25, false, true);
  drawCornerPattern(doc, W - 25, H - 25, true, true);
}

// ======================================================
// MOCK TEST BADGE
// ======================================================

function drawMockTestBadge(doc, examName, y) {
  const W = doc.page.width;

  const boxX = 75;
  const boxW = W - 150;
  const boxH = 38;

  doc.roundedRect(boxX, y, boxW, boxH, 7).fill(NAVY);

  doc
    .roundedRect(boxX, y, boxW, boxH, 7)
    .lineWidth(1.2)
    .strokeColor(GOLD)
    .stroke();

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10);

  doc.text("SERTIFIKAT MOCK TESTI:", boxX + 16, y + 13, {
    width: 145,
  });

  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(10);

  doc.text(String(examName || "Mock test").toUpperCase(), boxX + 160, y + 13, {
    width: boxW - 175,
    align: "center",
    ellipsis: true,
  });
}

// ======================================================
// PARTICIPANT INFO
// ======================================================

function drawPersonRow(doc, label, value, y) {
  const labelX = 105;
  const colonX = 245;
  const valueX = 270;

  doc.fillColor(NAVY).font("Helvetica").fontSize(11);

  doc.text(label, labelX, y);

  doc.fillColor(NAVY).font("Helvetica-Bold").text(":", colonX, y);

  doc
    .fillColor(DARK)
    .font("Helvetica-Bold")
    .text(String(value || "-"), valueX, y, {
      width: 230,
      ellipsis: true,
    });
}

// ======================================================
// SCORE BOX
// ======================================================

function drawScoreBox(doc, x, y, width, height, title, value, valueColor) {
  doc
    .roundedRect(x, y, width, height, 3)
    .lineWidth(1)
    .strokeColor(GOLD)
    .stroke();

  // decorative top corners
  doc
    .moveTo(x, y + 14)
    .lineTo(x + 14, y)
    .lineTo(x + 28, y)
    .lineWidth(1)
    .strokeColor(GOLD)
    .stroke();

  doc
    .moveTo(x + width - 28, y)
    .lineTo(x + width - 14, y)
    .lineTo(x + width, y + 14)
    .lineWidth(1)
    .strokeColor(GOLD)
    .stroke();

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(13);

  doc.text(title, x, y + 21, {
    width,
    align: "center",
  });

  doc
    .moveTo(x + 35, y + 49)
    .lineTo(x + width - 35, y + 49)
    .lineWidth(0.6)
    .strokeColor(GOLD)
    .stroke();

  doc.fillColor(valueColor).font("Helvetica-Bold").fontSize(39);

  doc.text(value, x, y + 60, {
    width,
    align: "center",
  });
}

// ======================================================
// MEDAL
// ======================================================

function drawMedal(doc, centerX, centerY) {
  doc.save();

  // outer circle
  doc.circle(centerX, centerY, 27).fill(GOLD);

  doc.circle(centerX, centerY, 21).fill(CREAM);

  doc
    .circle(centerX, centerY, 17)
    .lineWidth(1.5)
    .strokeColor(DARK_GOLD)
    .stroke();

  // star-ish symbol
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(22);

  doc.text("", centerX - 12, centerY - 13, {
    width: 24,
    align: "center",
  });

  // ribbons
  doc
    .moveTo(centerX - 15, centerY + 22)
    .lineTo(centerX - 7, centerY + 55)
    .lineTo(centerX + 2, centerY + 38)
    .closePath()
    .fill(GOLD);

  doc
    .moveTo(centerX + 15, centerY + 22)
    .lineTo(centerX + 7, centerY + 55)
    .lineTo(centerX - 2, centerY + 38)
    .closePath()
    .fill(DARK_GOLD);

  doc.restore();
}

// ======================================================
// FOOTER
// ======================================================

function drawFooter(doc) {
  const W = doc.page.width;
  const H = doc.page.height;

  const x = 95;
  const y = H - 73;
  const width = W - 190;
  const height = 34;

  doc.roundedRect(x, y, width, height, 8).fill(NAVY);

  doc
    .roundedRect(x, y, width, height, 8)
    .lineWidth(1)
    .strokeColor(GOLD)
    .stroke();

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11);

  doc.text("", x + 12, y + 10);

  doc.fillColor(WHITE).font("Helvetica").fontSize(7.4);

  doc.text(
    "Mazkur sertifikat Rash baholash modeliga asosida avtomatik yaratilgan.",
    x + 32,
    y + 10,
    {
      width: width - 64,
      align: "center",
    },
  );

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11);

  doc.text("", x + width - 24, y + 10);
}

// ======================================================
// MAIN
// ======================================================

export function generateCertificate({ student, examName, outputPath }) {
  const issuedAt = new Date();
  console.log(student);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",

      // VERTICAL
      layout: "portrait",

      margin: 0,

      info: {
        Title: `${examName} - Certificate`,
        Author: "Online Mock Test",
        Subject: "Rasch IRT Certificate",
      },
    });

    // doc.registerFont("Noto", "../assets/NotoSans-Regular.ttf");
    // doc.registerFont("Noto-Bold", "../assets/NotoSans-Bold.ttf");

    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;

    // ==================================================
    // DATA
    // ==================================================

    const score = Number(student?.total_ball) || 0;

    const degree = getDegree(score);

    const telegramId =
      student?.telegram_id ||
      student?.telegramId ||
      student?.user_id ||
      student?.id ||
      "-";

    // Siz so'ragan mapping:
    const familya = student?.first_name || student?.firstName || "-";

    const ism = student?.last_name || student?.lastName || student?.name || "-";

    const nickname = student?.nickname || student?.username || "-";

    // ==================================================
    // BACKGROUND
    // ==================================================

    drawBackgroundPattern(doc);
    drawCertificateBorder(doc);

    // ==================================================
    // LOGO / EMBLEM
    // ==================================================

    let y = 48;

    if (fs.existsSync("../assets/GetPDF.png")) {
      doc.image("../assets/GetPDF.png", W / 2 - 42, y, {
        width: 84,
        height: 84,
        fit: [84, 84],
        align: "center",
        valign: "center",
      });

      y += 99;
    } else {
      // logo bo'lmasa joyni bo'sh qoldiradi
      y += 60;
    }

    // ==================================================
    // TOP TEXT
    // ==================================================

    doc.fillColor(NAVY).font("Helvetica").fontSize(12);

    centerText(doc, "O'tkazilgan online mock testimizda", y);

    y += 22;

    doc.font("Helvetica-Bold").fontSize(13);

    centerText(doc, "ONLINE Mock test natiyjasiga asoslanib", y);

    y += 33;

    drawCenteredLine(doc, y, 340);

    // ==================================================
    // MAIN TITLE
    // ==================================================

    y += 30;

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(23);

    centerText(doc, "MOCK NATIJASIGA KO'RA", y);

    y += 33;

    centerText(doc, "SIZNING BILIM DARAJANGIZ", y);

    y += 43;

    drawCenteredLine(doc, y, 220);

    // ==================================================
    // MOCK NAME
    // ==================================================

    y += 27;

    drawMockTestBadge(doc, examName, y);

    y += 68;

    // ==================================================
    // USER INFO
    // ==================================================

    drawPersonRow(doc, "Telegram ID", telegramId, y);

    y += 31;

    drawPersonRow(doc, "Familiya", familya, y);

    y += 31;

    drawPersonRow(doc, "Ism", ism, y);

    y += 31;

    drawPersonRow(doc, "Nick name", nickname, y);

    y += 55;

    // ==================================================
    // SCORE + DEGREE
    // ==================================================

    const BOX_WIDTH = 160;
    const BOX_HEIGHT = 125;

    const leftX = 85;
    const rightX = W - 85 - BOX_WIDTH;

    drawScoreBox(
      doc,
      leftX,
      y,
      BOX_WIDTH,
      BOX_HEIGHT,
      "UMUMIY BALL",
      score.toFixed(2),
      NAVY,
    );

    drawScoreBox(
      doc,
      rightX,
      y,
      BOX_WIDTH,
      BOX_HEIGHT,
      "DARAJA",
      degree.label,
      degree.color,
    );

    drawMedal(doc, W / 2, y + 67);

    y += BOX_HEIGHT + 40;

    // ==================================================
    // DIVIDER
    // ==================================================

    drawCenteredLine(doc, y, 390);

    y += 33;

    // ==================================================
    // DATE
    // ==================================================

    const issueDate = issuedAt ? formatDate(issuedAt) : formatDate();

    doc.fillColor(NAVY).font("Helvetica").fontSize(10);

    doc.text("Berilgan sanasi:", 105, y);

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(12);

    doc.text(issueDate, 105, y + 17);

    // ==================================================
    // SIGNATURE
    // ==================================================

    const signatureX = W - 245;

    doc
      .moveTo(signatureX, y + 27)
      .lineTo(signatureX + 130, y + 27)
      .lineWidth(0.8)
      .strokeColor(GOLD)
      .stroke();

    doc.fillColor(NAVY).font("Helvetica").fontSize(9);

    // ==================================================
    // FOOTER
    // ==================================================

    drawFooter(doc);

    // ==================================================

    doc.end();

    stream.on("finish", () => {
      resolve(outputPath);
    });

    stream.on("error", reject);
  });
}
