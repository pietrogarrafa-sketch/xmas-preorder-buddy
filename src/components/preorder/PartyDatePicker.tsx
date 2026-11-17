import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateError, formatDate, PARTY_START, PARTY_END } from "@/lib/menu-party";

export function PartyDatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="outline" aria-label="Party date" className="w-full justify-start"><CalendarDays />{formatDate(value)}</Button></PopoverTrigger>
    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
      <Calendar mode="single" className="pointer-events-auto" selected={value ? new Date(`${value}T12:00:00`) : undefined}
        defaultMonth={new Date(`${value || PARTY_START}T12:00:00`)} startMonth={new Date(`${PARTY_START}T12:00:00`)} endMonth={new Date(`${PARTY_END}T12:00:00`)}
        disabled={date => Boolean(dateError(format(date, "yyyy-MM-dd")))}
        onSelect={date => { if (!date) return; onChange(format(date, "yyyy-MM-dd")); setOpen(false); }} />
    </PopoverContent>
  </Popover>;
}