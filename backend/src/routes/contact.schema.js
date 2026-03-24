const { z } = require('zod');

const phoneRegex = /^[+]?\d[\d\s-]{7,18}$/;

const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Imię i nazwisko jest za krótkie.')
      .max(120, 'Imię i nazwisko jest za długie.'),
    email: z.string().trim().email('Podaj prawidłowy adres e-mail.'),
    phone: z.string().trim().regex(phoneRegex, 'Podaj poprawny numer telefonu.'),
    city: z
      .string()
      .trim()
      .min(2, 'Podaj nazwę miejscowości.')
      .max(80, 'Nazwa miejscowości jest za długa.'),
    message: z
      .string()
      .trim()
      .min(12, 'Wiadomość jest za krótka.')
      .max(2_000, 'Wiadomość jest za długa.'),
    company: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.company && data.company.trim().length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pole firma musi pozostać puste.',
      });
    }
  })
  .transform(({ company, ...rest }) => rest);

module.exports = contactSchema;
