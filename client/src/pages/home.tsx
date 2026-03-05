export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="text-heading">
          Welcome
        </h1>
        <p className="text-muted-foreground text-lg" data-testid="text-description">
          Your application is up and running.
        </p>
      </div>
    </div>
  );
}
