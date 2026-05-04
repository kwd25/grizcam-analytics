import { classNames, titleCase } from "../lib/utils";

export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={classNames(
      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
      status === "healthy" && "border-white/15 bg-white/10 text-zinc-100",
      status === "warning" && "border-stone-400/30 bg-stone-400/10 text-stone-200",
      status === "alert" && "border-red-300/25 bg-red-300/10 text-red-200"
    )}
  >
    {titleCase(status)}
  </span>
);
