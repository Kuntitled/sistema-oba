"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, Check, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { partMatchesQuery } from "@/lib/parts-search";
import type { PartRow } from "@/types/domain";

interface PartSearchSelectProps {
  label: string;
  placeholder: string;
  parts: PartRow[];
  value: string;
  onChange: (partId: string) => void;
  hideLineBadge?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  notice?: string | null;
}

interface DropdownCoords {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

const DROPDOWN_ESTIMATED_HEIGHT = 280;

export function PartSearchSelect({
  label,
  placeholder,
  parts,
  value,
  onChange,
  hideLineBadge = false,
  disabled = false,
  disabledMessage,
  notice = null,
}: PartSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [coords, setCoords] = React.useState<DropdownCoords | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedPart = React.useMemo(
    () => parts.find((p) => p.id === value) ?? null,
    [parts, value]
  );

  const filteredParts = React.useMemo(() => {
    if (!query.trim()) return parts.slice(0, 80);
    return parts.filter((p) => partMatchesQuery(p, query)).slice(0, 80);
  }, [parts, query]);

  const computeCoords = React.useCallback((): DropdownCoords | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward =
      spaceBelow < DROPDOWN_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

    if (openUpward) {
      return {
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + 4,
      };
    }

    return {
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 4,
    };
  }, []);

  const isOpen = open && !disabled;

  const handleToggleOpen = () => {
    if (disabled) return;
    if (isOpen) {
      setOpen(false);
      return;
    }
    const nextCoords = computeCoords();
    if (nextCoords) {
      setCoords(nextCoords);
    }
    setOpen(true);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => {
      const next = computeCoords();
      if (next) setCoords(next);
    };

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target) ?? false;
      const inDropdown = dropdownRef.current?.contains(target) ?? false;
      if (!inContainer && !inDropdown) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, computeCoords]);

  const dropdownNode =
    isOpen && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom:
                coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            }}
            className="z-[100] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 space-y-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nome TT ou Hasbro..."
                autoFocus
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredParts.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-muted-foreground">
                  Nenhuma peça encontrada para &ldquo;{query}&rdquo;.
                </div>
              ) : (
                filteredParts.map((part) => {
                  const isSelected = part.id === value;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        onChange(part.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/15 text-primary font-bold"
                          : "hover:bg-muted/70 text-foreground"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold">
                            {part.name}
                          </span>
                          {!hideLineBadge && part.line && (
                            <span className="text-[10px] text-muted-foreground">
                              ({part.line})
                            </span>
                          )}
                        </div>
                        {part.aliases && part.aliases.length > 0 && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            Hasbro: {part.aliases.join(", ")}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="text-xs font-semibold text-foreground">{label}</div>

      <div className="flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggleOpen}
          className={`flex-1 h-9 px-3 rounded-md border border-input text-left text-xs flex items-center justify-between gap-2 transition-colors ${
            disabled
              ? "bg-muted/40 text-muted-foreground opacity-65 cursor-not-allowed"
              : "bg-background/70 hover:bg-background cursor-pointer"
          }`}
        >
          {disabled ? (
            <span className="text-muted-foreground truncate">
              {disabledMessage || placeholder}
            </span>
          ) : selectedPart ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-foreground truncate">
                {selectedPart.name}
              </span>
              {!hideLineBadge && selectedPart.line && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 border-primary/40 text-primary shrink-0"
                >
                  {selectedPart.line}
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {selectedPart && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Limpar peça"
            aria-label={`Limpar ${label}`}
            className="h-9 w-9 rounded-md border border-input bg-background/60 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {notice && (
        <p className="text-[11px] text-amber-500 flex items-start gap-1 leading-tight">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </p>
      )}

      {dropdownNode}
    </div>
  );
}
