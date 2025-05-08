import z from 'zod';

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

const approachSchema = z.object({
    algorithm: z.string(),
    implementation: z.any().optional(),
    intuition: z.string().optional(),
    timeComplexity: z.string(),
})

const editorialSchema = z.object({
    heading: z.string().nonempty().min(3).max(50),
    approaches: z.array(approachSchema).min(1).nonempty({message:"Atleast one approach is required"}),
})
const codeSnippetsShema = z.object({
    language: z.string().nonempty({message:"language is required"}),
    code: z.string().nonempty({message: "code is required"}),
})
const testcaseSchema = z.object({
    input: z.string().nonempty({message: "input is required"}),
    expectedOutput: z.string().nonempty({message: "expected output is required"}),
})

export const problemSchema = z.object({
    title: z.string().nonempty({message: "title is required"}), 
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"], {message: "difficulty must be one of EASY, MEDIUM, HARD"}),
    tags: z.array(z.string()).min(1, {message: "at least one tag"}),
    companies: z.string().optional(), 
    hints: z.array(z.string()).optional(),
    description : z.string().nonempty({message: "description is required"}),
    examples: z.array(exampleSchema).min(1, { message: "at least one example"} ),
    constraints: z.array(z.string()).optional(),
    followUp: z.string().optional(),
    editorial: z.array(editorialSchema).min(1).optional(),
    codeSnippets: z.array(codeSnippetsShema).min(1, {message: "atleast one code snippet is required"}).optional(),
    testcases: z.array(testcaseSchema).min(1, { message: "At least one testcase is required" }),
    referenceSolutions: jsonSchema
})

type problem = z.infer<typeof problemSchema>

const validateProblem = (data: problem) =>{
     return problemSchema.safeParse(data)
}
export {validateProblem}