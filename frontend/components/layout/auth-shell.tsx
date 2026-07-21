export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-20">
      <div className="w-full">{children}</div>
    </div>
  );
}
