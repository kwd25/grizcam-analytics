import type { ReactNode } from "react";
import type { DashboardFilters, FilterOptionsResponse } from "@grizcam/shared";
import { Calendar, Camera, Clock, Flame, Layers, RotateCcw, Sun, Tag, Thermometer } from "lucide-react";
import { titleCase } from "../lib/utils";

const ICON_PROPS = { width: 14, height: 14, strokeWidth: 1.5, "aria-hidden": true } as const;

type FilterBarProps = {
  filters: DashboardFilters;
  options?: FilterOptionsResponse;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onReset: () => void;
};

type MultiSelectProps = {
  label: string;
  icon: ReactNode;
  values: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (values: string[]) => void;
};

const MultiSelect = ({ label, icon, values, options, onChange }: MultiSelectProps) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className="max-h-28 space-y-2 overflow-auto pr-1">
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label key={option.value} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm text-zinc-200 hover:bg-white/5">
            <span>{titleCase(option.label)}</span>
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? values.filter((value) => value !== option.value) : [...values, option.value])
              }
              className="h-4 w-4 rounded border-white/20 bg-transparent text-zinc-200"
            />
          </label>
        );
      })}
    </div>
  </div>
);

type RangeInputProps = {
  label: string;
  icon: ReactNode;
  minValue?: number;
  maxValue?: number;
  onChange: (next: { min?: number; max?: number }) => void;
};

const RangeInput = ({ label, icon, minValue, maxValue, onChange }: RangeInputProps) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <input
        type="number"
        value={minValue ?? ""}
        onChange={(event) =>
          onChange({ min: event.target.value === "" ? undefined : Number(event.target.value), max: maxValue })
        }
        placeholder="Min"
        className="rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-300"
      />
      <input
        type="number"
        value={maxValue ?? ""}
        onChange={(event) =>
          onChange({ min: minValue, max: event.target.value === "" ? undefined : Number(event.target.value) })
        }
        placeholder="Max"
        className="rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-300"
      />
    </div>
  </div>
);

export const FilterBar = ({ filters, options, onChange, onReset }: FilterBarProps) => (
  <aside className="panel rounded-lg p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-auto">
    <div className="mb-4">
      <h1 className="text-2xl font-semibold text-white">Filters</h1>
    </div>

    <div className="space-y-3">
      <MultiSelect
        label="Cameras"
        icon={<Camera {...ICON_PROPS} />}
        values={filters.camera_name}
        options={options?.cameras ?? []}
        onChange={(camera_name) => onChange({ camera_name })}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <Calendar {...ICON_PROPS} />
            <span>Start Date</span>
          </div>
          <input
            type="date"
            value={filters.start_date}
            onChange={(event) => onChange({ start_date: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-300"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <Calendar {...ICON_PROPS} />
            <span>End Date</span>
          </div>
          <input
            type="date"
            value={filters.end_date}
            onChange={(event) => onChange({ end_date: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-300"
          />
        </label>
      </div>

      <MultiSelect
        label="Time Of Day"
        icon={<Clock {...ICON_PROPS} />}
        values={filters.time_of_day_bucket}
        options={options?.timeOfDayBuckets ?? []}
        onChange={(time_of_day_bucket) => onChange({ time_of_day_bucket })}
      />
      <MultiSelect
        label="Subject Category"
        icon={<Tag {...ICON_PROPS} />}
        values={filters.subject_category}
        options={options?.subjectCategories ?? []}
        onChange={(subject_category) => onChange({ subject_category })}
      />
      <MultiSelect
        label="Subject Class"
        icon={<Layers {...ICON_PROPS} />}
        values={filters.subject_class}
        options={options?.subjectClasses ?? []}
        onChange={(subject_class) => onChange({ subject_class })}
      />

      <RangeInput
        label="Lux"
        icon={<Sun {...ICON_PROPS} />}
        minValue={filters.min_lux}
        maxValue={filters.max_lux}
        onChange={({ min, max }) => onChange({ min_lux: min, max_lux: max })}
      />
      <RangeInput
        label="Temperature"
        icon={<Thermometer {...ICON_PROPS} />}
        minValue={filters.min_temperature}
        maxValue={filters.max_temperature}
        onChange={({ min, max }) => onChange({ min_temperature: min, max_temperature: max })}
      />
      <RangeInput
        label="Heat Level"
        icon={<Flame {...ICON_PROPS} />}
        minValue={filters.min_heat_level}
        maxValue={filters.max_heat_level}
        onChange={({ min, max }) => onChange({ min_heat_level: min, max_heat_level: max })}
      />
    </div>

    <div className="mt-4 flex gap-2">
      <button
        onClick={onReset}
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
      >
        <RotateCcw width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
        <span>Reset Filters</span>
      </button>
    </div>
  </aside>
);
