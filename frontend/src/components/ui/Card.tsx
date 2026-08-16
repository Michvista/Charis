import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
};

export function Card({ className, title, subtitle, action, children, ...props }: CardProps) {
  return (
    <section className={clsx('card', className)} {...props}>
      {(title || subtitle || action) && (
        <header className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
