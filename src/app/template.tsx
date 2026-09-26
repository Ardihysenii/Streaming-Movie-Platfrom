import type { ReactNode } from "react";

export default function Template({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="page-transition-shell">{children}</div>;
}
