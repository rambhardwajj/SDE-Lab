import axios from "axios";
import { ResponseStatus } from "./constants";
import { CustomError } from "./CustomError";

const languages = {
  "PYTHON": 71,
  "JAVA": 62,
  "JAVASCRIPT": 63,
  "C++ (GCC 9.2.0)": 54,
};
export const getJudge0LanguageById = (language: string) => {
  if (!(language in languages)) {
    throw new CustomError(
      ResponseStatus.BadRequest,
      `Language '${language}' is not currently supported`
    );
  }

  return languages[language.toUpperCase() as keyof typeof languages];
};

type SubmissionsType = {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output: string;
};
type tokenType = { token: string };

type batchResponse = {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const submitBatch = async (submissions: SubmissionsType[]) => {
  const { data } = await axios.post(
    `${process.env.JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
    {
      submissions,
    }
  );
  // console.log(data)

  return data as tokenType[];
};

export const pollBatchResults = async (tokens: string[]) => {
  try {
    // console.log(tokens)
    while (true) {
      const { data } = await axios.get(
        `${process.env.JUDGE0_API_URL}/submissions/batch`,
        {
          params: {
            tokens: tokens.join(","),
            base64_encoded: false,
          },
        }
      );

      // console.log("data", data)
      if (!data.submissions || !Array.isArray(data.submissions)) {
        throw new CustomError(500, "Invalid response from Judge0 API");
      }
      
      const results: batchResponse[] = data.submissions;

      const areAllDone = results.every(
        (result) => result.status.id !== 1 && result.status.id !== 2
      );

      if (areAllDone) return results;
      await sleep(1000);
    }
  } catch (error: any) {
    throw new CustomError(500, `Error while polling Judge0 submissions`);
  }
};
