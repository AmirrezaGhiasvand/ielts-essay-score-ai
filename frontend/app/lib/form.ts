import z from "zod";

// -------- Form schema --------
export const formSchema = z.object({
  task_type: z.enum(["1", "2"]),
  question: z.string().min(10, "Question is too short"),
  essay: z.string().min(50, "Essay is too short"),
});

export type EssayFormData = z.infer<typeof formSchema>;
