import fs from "fs";
import PDFDocument from "pdfkit";

export function generatePDF(examName, students) {
  const outputDir = "./certificates";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  for (const student of students) {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
    });

    const filePath = `${outputDir}/${student.name.replace(/\s+/g, "_")}.pdf`;
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // 📄 Sertifikat shablon rasmini fon qilib chizish
    // doc.image("certificate-template.png", 0, 0, {
    //   width: 595.28,
    //   height: 841.89, // A4
    // });

    // ⚙️ Matn sozlamalari
    doc.fontSize(14).fillColor("#000000");

    // 👤 Talaba ma’lumotlari (joylashuvlar rasmga qarab joylashtirilgan)
    doc.font("Helvetica-Bold").fontSize(16);
    doc.text(
      // student.familya?.toUpperCase()""
      "Jangabaev" || "",
      210,
      315
    );
    doc.text("Muxtar" || "", 210, 340);
    doc.text("Faxratdinovich" || "", 210, 365);

    // 📚 Fan nomi
    doc.fontSize(14).text("Matematika", 470, 410, { align: "left" });

    // 📊 Ball va foiz
    doc.text(`${90.02 || "0.00"}`, 470, 435);
    doc.text("100%", 470, 460);
    doc.text("A+", 470, 485);

    // 🧮 Bo‘limlar natijasi
    // if (student.algebra && student.geometry) {
    doc.text("54", 470, 545);
    doc.text("12", 470, 570);
    // }

    // 📅 Sana
    doc.text("04.06.2025", 180, 755);
    doc.text("03.06.2028", 390, 755);

    // 👤 Direktor
    doc.text("M.KARIMOV", 420, 795);

    doc.end();
  }

  return "./certificates"; // PDFlar joylashgan papka
}
