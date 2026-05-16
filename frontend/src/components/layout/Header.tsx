interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="
      flex items-center justify-between
      px-8 py-5 border-b border-theme bg-theme-primary
      shrink-0
    ">
      <div>
        <h1 className="text-lg font-semibold text-theme-primary leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-theme-muted mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}