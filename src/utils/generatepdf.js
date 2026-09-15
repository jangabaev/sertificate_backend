import fs from "fs";
import { generateCertificate } from "./certificate.js";

const PDF_CONCURRENCY = 3;

export async function generatePDF(examName, students, totalQuestions) {
  const outputDir = "./certificates";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pathMap = {};

  for (let i = 0; i < students.length; i += PDF_CONCURRENCY) {
    const batch = students.slice(i, i + PDF_CONCURRENCY);

    await Promise.all(
      batch.map(async (student) => {
        const safeName = (student.name || "student").replace(/\s+/g, "_");

        const safeId = String(student.user_id || "unknown").replace(
          /[^a-zA-Z0-9_-]/g,
          "",
        );

        const outputPath = `${outputDir}/${safeName}_${safeId}.pdf`;

        pathMap[student.user_id] = outputPath;

        await generateCertificate({
          student,
          examName,
          outputPath,
        });
      }),
    );

    console.log(
      `PDF progress: ${Math.min(
        i + PDF_CONCURRENCY,
        students.length,
      )}/${students.length}`,
    );
  }

  return pathMap;
}
