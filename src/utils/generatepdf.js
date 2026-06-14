import fs from "fs";
import { generateCertificate } from "./certificate.js";

export async function generatePDF(examName, students, totalQuestions) {
  const outputDir = "./certificates";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  await Promise.all(
    students.map((student) => {
      const safeName = (student.name || "student").replace(/\s+/g, "_");
      const outputPath = `${outputDir}/${safeName}.pdf`;
      return generateCertificate({ student, examName, totalQuestions, outputPath });
    })
  );

  return outputDir;
}
