import z from 'zod';
import { Difficulty } from '../generated/prisma';

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

const exampleSchema = z.object({
    input : z.string().nonempty({message: 'input is required'}),
    output: z.string().nonempty({message: 'output is required'}),
    explaination: z.string().optional()
})

// const approachSchema = z.object({
//     algorithm: z.string(),
//     implementation: z.any().optional(),
//     intuition: z.string().optional(),
//     timeComplexity: z.string(),
// })

// const editorialSchema = z.object({
//     heading: z.string().nonempty().min(3).max(50),
//     approaches: z.array(approachSchema).min(1).nonempty({message:"Atleast one approach is required"}),
// })

const codeSnippetsSchema = z.object({
    language: z.string().nonempty({message:"language is required"}),
    code: z.string().nonempty({message: "code is required"}),
})
export const referenceSolutionSchema = z.array(z.object({
    language: z.string().nonempty({message:"language is required"}),
    code: z.string().nonempty({message: "code is required"}),
})).nonempty()

export const testcaseSchema = z.array(z.object({
    input: z.string().nonempty({message: "input is required"}),
    expectedOutput: z.string().nonempty({message: "expected output is required"}),
})).min(1, "Atleast one test case is required")

export const problemSchema = z.object({
    title: z.string().nonempty({message: "title is required"}), 
    difficulty: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine((val): val is Difficulty => Object.values(Difficulty).includes(val as Difficulty), {
      message: "Difficulty must be EASY, MEDIUM, or HARD",
    }),
    tags: z.array(z.string()).min(1, {message: "at least one tag"}),
    companies: z.string().optional(), 
    hints: z.array(z.string()).optional(),
    description : z.string().nonempty({message: "description is required"}),
    examples: z.array(exampleSchema).min(1, { message: "at least one example"} ),
    constraints: z.array(z.string()).optional(),
    followUp: z.string().optional(),
    editorial: jsonSchema.optional(),
    codeSnippets: z.array(codeSnippetsSchema).nonempty(),
    testcases: testcaseSchema,
    referenceSolutions: referenceSolutionSchema,
})

export const updateProblemSchema = problemSchema.partial()

type problem = z.infer<typeof problemSchema>


const validateProblem = (data: problem) =>{
     return problemSchema.safeParse(data)
}
const validateUpdateProblem = (data: Partial<problem>) =>{
    return updateProblemSchema.safeParse(data)
}
export {validateProblem, validateUpdateProblem}
