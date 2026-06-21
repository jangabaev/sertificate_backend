import fs from "fs";
import { generateCertificate } from "./certificate.js";

export async function generatePDF(examName, students, totalQuestions) {
  const outputDir = "./certificates";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const pathMap = {};
  await Promise.all(
    students.map((student) => {
      const safeName = (student.name || "student").replace(/\s+/g, "_");
      const safeId = String(student.user_id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
      const outputPath = `${outputDir}/${safeName}_${safeId}.pdf`;
      pathMap[student.user_id] = outputPath;
      return generateCertificate({ student, examName, totalQuestions, outputPath });
    })
  );

  return pathMap;
}
