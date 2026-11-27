export default function AppLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-line/80" />
      <div className="h-4 w-72 rounded bg-line/60" />
      <div className="card h-40 rounded-2xl bg-panel" />
      <div className="card h-40 rounded-2xl bg-panel" />
    </div>
  );
}
