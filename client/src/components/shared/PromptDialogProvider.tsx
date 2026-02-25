import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type FieldType = "text" | "textarea" | "url";

interface PromptField {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: FieldType;
}

interface PromptConfig {
  title: string;
  description?: string;
  submitLabel?: string;
  fields: PromptField[];
}

type PromptResult = Record<string, string> | null;

interface PromptDialogContextValue {
  prompt: (config: PromptConfig) => Promise<PromptResult>;
}

const PromptDialogContext = createContext<PromptDialogContextValue | null>(null);

export function usePromptDialog(): PromptDialogContextValue {
  const ctx = useContext(PromptDialogContext);
  if (!ctx) {
    throw new Error("usePromptDialog must be used within <PromptDialogProvider>");
  }
  return ctx;
}

export function PromptDialogProvider({ children }: { children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PromptConfig | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const resolverRef = useRef<((result: PromptResult) => void) | null>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const prompt = useCallback((cfg: PromptConfig): Promise<PromptResult> => {
    const initial: Record<string, string> = {};
    for (const field of cfg.fields) {
      initial[field.name] = field.defaultValue ?? "";
    }
    setConfig(cfg);
    setValues(initial);
    setOpen(true);

    return new Promise<PromptResult>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleSubmit = useCallback((): void => {
    setOpen(false);
    resolverRef.current?.(values);
    resolverRef.current = null;
  }, [values]);

  const handleCancel = useCallback((): void => {
    setOpen(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);

  const handleFieldChange = useCallback((name: string, value: string): void => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  useEffect(() => {
    if (open && firstInputRef.current) {
      firstInputRef.current.focus();
      if ("select" in firstInputRef.current) {
        firstInputRef.current.select();
      }
    }
  }, [open]);

  return (
    <PromptDialogContext.Provider value={{ prompt }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleCancel();
        }}
      >
        <DialogContent className="max-w-md">
          {config && (
            <>
              <DialogHeader>
                <DialogTitle>{config.title}</DialogTitle>
                {config.description && (
                  <DialogDescription>{config.description}</DialogDescription>
                )}
              </DialogHeader>

              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {config.fields.map((field, idx) => {
                  const fieldType = field.type ?? "text";

                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <Label htmlFor={`prompt-field-${field.name}`}>
                        {field.label}
                      </Label>
                      {fieldType === "textarea" ? (
                        <Textarea
                          id={`prompt-field-${field.name}`}
                          ref={idx === 0 ? (el) => { firstInputRef.current = el; } : undefined}
                          value={values[field.name] ?? ""}
                          placeholder={field.placeholder}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={`prompt-field-${field.name}`}
                          ref={idx === 0 ? (el) => { firstInputRef.current = el; } : undefined}
                          type={fieldType === "url" ? "url" : "text"}
                          value={values[field.name] ?? ""}
                          placeholder={field.placeholder}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {config.submitLabel ?? "OK"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PromptDialogContext.Provider>
  );
}
