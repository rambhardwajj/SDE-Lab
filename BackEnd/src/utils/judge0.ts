import axios from "axios";
import { ResponseStatus } from "./constants";
import { CustomError } from "./CustomError";

const languages = {
  "PYTHON": 71,
  "JAVA": 62,
  "JAVASCRIPT": 63,
};

export const languageCodes = {
  71: "PYTHON",
  62: "JAVA",
  63: "JAVASCRIPT",
}


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
  stdin?: string;
  expected_output?: string;
  base64_encoded?: boolean;
  wait?: boolean;
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
  try {
    const { data } = await axios.post(
      `${process.env.JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
      {
        submissions,
      }
    );
    // console.log(data);
    return data as tokenType[];
  } catch (error) {
    throw new CustomError(500, "submit batch failed");
  }
};

export const pollBatchResults = async (tokens: string[]) => {
  console.log("Inside PollBatch Results");
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

      // console.log("data", data);
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
    throw new CustomError(
      500,
      `Error while polling Judge0 submissions : ${error}`
    );
  }
};
