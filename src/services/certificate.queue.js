const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES = 1000;
const MAX_RETRIES = 3;

const jobs = new Map();

function createJob(examId, students) {
  const job = {
    examId,
    status: "processing",

    total: students.length,
    sent_count: 0,
    failed_count: 0,

    pending: students.length,

    failed_students: [],

    started_at: new Date().toISOString(),
    finished_at: null,
  };

  jobs.set(String(examId), job);

  return job;
}

function getJob(examId) {
  return jobs.get(String(examId));
}

function updateJob(examId, data) {
  const job = jobs.get(String(examId));

  if (!job) return;

  Object.assign(job, data);
}

async function processCertificateQueue({
  exam,
  students,
  pdfPaths,
  bot,
  getDegree,
}) {
  const examId = exam.id;

  const job = getJob(examId);

  if (!job) {
    throw new Error("Certificate job topilmadi");
  }

  for (let i = 0; i < students.length; i += CONCURRENCY) {
    const batch = students.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (student) => {
        const pdfPath = pdfPaths[student.user_id];

        if (!pdfPath) {
          job.failed_count++;

          job.failed_students.push({
            user_id: student.user_id,
            name: student.name,
            error: "PDF topilmadi",
          });

          job.pending--;

          return;
        }

        let success = false;
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            await bot.sendDocument(student.user_id, pdfPath, {
              caption:
                `${exam.name} natijangiz tayyor!\n` +
                `Umumiy ball: ${Number(student.total_ball).toFixed(2)}\n` +
                `Daraja: ${getDegree(student.total_ball)}`,
            });

            success = true;
            break;
          } catch (error) {
            lastError = error;

            console.error(
              `Telegram error | ${student.user_id} | attempt ${attempt}`,
              error.message,
            );

            // Retry orasida kutamiz
            if (attempt < MAX_RETRIES) {
              await sleep(attempt * 2000);
            }
          }
        }

        if (success) {
          job.sent_count++;
        } else {
          job.failed_count++;

          job.failed_students.push({
            user_id: student.user_id,
            name: student.name,
            error: lastError?.message || "Unknown error",
          });
        }

        job.pending--;
      }),
    );

    console.log(
      `Certificate progress: ${job.sent_count + job.failed_count}/${job.total}`,
    );

    // Keyingi batchdan oldin biroz kutamiz
    if (i + CONCURRENCY < students.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  job.status = job.failed_count === 0 ? "completed" : "completed_with_errors";

  job.finished_at = new Date().toISOString();

  console.log(
    `Certificate job finished | exam=${examId} | sent=${job.sent_count} | failed=${job.failed_count}`,
  );

  return job;
}

export { createJob, getJob, updateJob, processCertificateQueue };
