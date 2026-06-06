import type { HTMLAttributes, ReactNode } from 'react';

type ManuscriptSurfaceProps = HTMLAttributes<HTMLElement> & {
  header?: ReactNode;
};

export function ManuscriptSurface({ children, header, ...props }: ManuscriptSurfaceProps) {
  return (
    <article
      className="flex min-h-0 flex-1 flex-col bg-[#faf9f6] max-[760px]:min-h-[360px]"
      {...props}
    >
      {header ? (
        <header className="flex min-h-12 items-center justify-between gap-2.5 border-b border-[#e4ded3] px-5">
          {header}
        </header>
      ) : null}
      <div className="flex-1 overflow-auto px-10 py-6">{children}</div>
    </article>
  );
}
