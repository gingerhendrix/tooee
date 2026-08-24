import { createFileRoute, redirect } from "@tanstack/react-router";

const redirectToDocs = (): never => {
  redirect({ params: { _splat: "" }, throw: true, to: "/docs/$" });
  throw new Error("TanStack Router did not throw its redirect control flow");
};

export const Route = createFileRoute("/")({
  beforeLoad: redirectToDocs,
});
