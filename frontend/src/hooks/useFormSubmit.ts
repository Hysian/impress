import { useState, useCallback } from "react";
import { submitForm } from "@/api/formSubmissions";
import type { SubmitFormData } from "@/api/formSubmissions";

interface UseFormSubmitOptions {
  formType: string;
  sourceUrl?: string;
  locale?: string;
}

interface SubmitData {
  name: string;
  email: string;
  message?: string;
  phone?: string;
  company?: string;
  metadata?: Record<string, unknown>;
}

export function useFormSubmit({ formType, sourceUrl, locale }: UseFormSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (data: SubmitData) => {
      setIsSubmitting(true);
      setError(null);
      setIsSuccess(false);
      try {
        const payload: SubmitFormData = {
          formType,
          name: data.name,
          email: data.email,
          message: data.message,
          phone: data.phone,
          company: data.company,
          sourceUrl: sourceUrl || window.location.href,
          locale,
          metadata: data.metadata,
        };
        await submitForm(payload);
        setIsSuccess(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ||
          err?.message ||
          "Submission failed, please try again later";
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formType, sourceUrl, locale]
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  return { submit, isSubmitting, isSuccess, error, reset };
}
