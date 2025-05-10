import { z } from "zod";

const RegisterSchema = z.object({
  userName: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(20, { message: "Username must be at most 20 characters long" }),

  email: z.string().email({ message: "Invalid email address" }),

  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(16, { message: "Password must be at most 16 characters long" })
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,}$/, {
      message:
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),

  fullName: z
    .string()
    .min(6, { message: "Full name must be at least 6 characters long" })
    .max(20, { message: "Full name must be at most 20 characters long" })
    .optional(),

  role: z.enum(['USER', 'ADMIN']).optional(),

});

const loginSchema = RegisterSchema.omit({
  userName: true,
  fullName: true,
});

const emailVerification = RegisterSchema.pick({ email: true });
const passwordVerification = RegisterSchema.pick({password: true})

// types
type RegisterData = z.infer<typeof RegisterSchema>;
type LoginData = z.infer<typeof loginSchema>;
type EmailVerificationData = z.infer<typeof emailVerification>;
type PasswordVerificationData = z.infer<typeof passwordVerification>;


const validateRegisterData = (data: RegisterData) => {
  return RegisterSchema.safeParse(data);
};

const validateLoginData = (data: LoginData) => {
  return loginSchema.safeParse(data);
};

const validateEmailData = (data : EmailVerificationData) =>{
  return emailVerification.safeParse(data);
}
const validatePasswordData = (data : PasswordVerificationData) =>{
  return passwordVerification.safeParse(data);
}

export { validatePasswordData,validateRegisterData, validateLoginData , validateEmailData};