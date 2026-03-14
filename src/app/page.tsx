import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-4">
        AI Interview Platform
      </h1>
      <p className="text-lg text-muted-foreground text-center">
        Welcome to the next generation of hiring.
      </p>
    </div>
  );
}
