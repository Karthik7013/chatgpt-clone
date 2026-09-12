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
import { useProviders } from "@/lib/hooks/use-providers";

export function ModelSelector({
  model,
  onModelChange,
}: {
  model: string;
  onModelChange: (model: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { providers, loading } = useProviders();

  const allModels = providers.flatMap((p) =>
    p.models.map((m) => ({ ...m, providerId: p.id, providerName: p.name }))
  );

  const selected = allModels.find((m) => `${m.providerId}:${m.id}` === model) ?? allModels[0];

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
          <span className="max-w-36 truncate">{selected?.name ?? "Select model"}</span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {loading ? (
              <CommandGroup heading="Loading models…">
                <CommandItem disabled>Loading…</CommandItem>
              </CommandGroup>
            ) : providers.length === 0 ? (
              <CommandGroup heading="No providers configured">
                <CommandItem disabled>Add API keys to .env.local</CommandItem>
              </CommandGroup>
            ) : (
              providers.map((p) => (
                <CommandGroup key={p.id} heading={p.name}>
                  {p.models.map((m) => {
                    const fullId = `${p.id}:${m.id}`;
                    return (
                      <CommandItem
                        key={fullId}
                        value={`${m.name} ${m.id} ${m.description} ${p.name}`}
                        onSelect={() => {
                          onModelChange(fullId);
                          setOpen(false);
                        }}
                        className="flex-col items-start gap-0.5"
                      >
                        <span className="flex w-full items-center gap-2">
                          <Check
                            className={cn(
                              "size-3.5 shrink-0",
                              fullId === model ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="font-medium">{m.name}</span>
                        </span>
                        <span className="pl-5.5 text-xs text-muted-foreground">
                          {m.description}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
