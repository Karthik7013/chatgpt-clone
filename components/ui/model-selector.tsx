"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MODELS = [
  { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite", description: "Fast & efficient" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", description: "Balanced speed & quality" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", description: "Lightweight & fast" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Quick responses" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Budget-friendly" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Multimodal capable" },
];

export function ModelSelector({
  model,
  onModelChange,
}: {
  model: string;
  onModelChange: (model: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = MODELS.find((m) => m.id === model) ?? MODELS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Select model"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-3" />
          <span className="max-w-36 truncate">{selected.name}</span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup heading="Free Gemini models">
              {MODELS.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.id} ${m.description}`}
                  onSelect={() => {
                    onModelChange(m.id);
                    setOpen(false);
                  }}
                  className="flex-col items-start gap-0.5"
                >
                  <span className="flex w-full items-center gap-2">
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        m.id === model ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-medium">{m.name}</span>
                  </span>
                  <span className="pl-5.5 text-xs text-muted-foreground">
                    {m.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
