// A small, theme-aware info box for contextual hints ("what is this / what to
// do here"). Neutral-informative blue styling that stays readable in light and
// dark. Pass an emoji via `icon`; content goes in children.
export default function Callout({
  children,
  icon = "💡",
  className = "",
}: {
  children: React.ReactNode;
  icon?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100 ${className}`}
      role="note"
    >
      <span aria-hidden className="shrink-0 leading-5">
        {icon}
      </span>
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}
